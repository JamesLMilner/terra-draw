import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import {
	TerraDrawOnChangeContext,
	HexColor,
	OnFinishContext,
	Projection,
	TerraDrawAdapterStyling,
	TerraDrawGeoJSONStore,
	TerraDrawKeyboardEvent,
	TerraDrawModeRegisterConfig,
	TerraDrawModeState,
	TerraDrawMouseEvent,
	UpdateTypes,
	Validation,
	HexColorStyling,
	NumericStyling,
	UrlStyling,
} from "../common";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreChangeHandler,
} from "../store/store";
import { isValidStoreFeature } from "../store/store-feature-validation";
import { ValidationReasonModeMismatch } from "../validations/common-validations";

export type CustomStyling = Record<
	string,
	string | number | HexColorStyling | NumericStyling | UrlStyling
>;

export enum ModeTypes {
	Drawing = "drawing",
	Select = "select",
	Static = "static",
	Render = "render",
}

export const DefaultPointerEvents = {
	rightClick: true,
	contextMenu: false,
	leftClick: true,
	onDragStart: true,
	onDrag: true,
	onDragEnd: true,
} as const;

type AllowPointerEvent = boolean | ((event: TerraDrawMouseEvent) => boolean);

export type ModeUpdateOptions<Mode> = Omit<Mode, "modeName">;

export interface PointerEvents {
	leftClick: AllowPointerEvent;
	rightClick: AllowPointerEvent;
	contextMenu: AllowPointerEvent;
	onDragStart: AllowPointerEvent;
	onDrag: AllowPointerEvent;
	onDragEnd: AllowPointerEvent;
}

export type BaseModeOptions<Styling extends CustomStyling> = {
	modeName?: string;
	styles?: Partial<Styling>;
	pointerDistance?: number;
	validation?: Validation;
	projection?: Projection;
	pointerEvents?: PointerEvents;
};

export abstract class TerraDrawBaseDrawMode<Styling extends CustomStyling> {
	// State
	protected _state: TerraDrawModeState = "unregistered";
	get state() {
		return this._state;
	}
	set state(_) {
		throw new Error("Please use the modes lifecycle methods");
	}

	// Styles
	protected _styles: Partial<Styling> = {};
	get styles(): Partial<Styling> {
		return this._styles;
	}
	set styles(styling: Partial<Styling>) {
		if (typeof styling !== "object") {
			throw new Error("Styling must be an object");
		}

		// Note: This may not be initialised yet as styles can be set/changed pre-registration
		if (this.onStyleChange) {
			this.onStyleChange([], "styling");
		}
		this._styles = styling;
	}

	protected pointerEvents: PointerEvents = DefaultPointerEvents;
	protected behaviors: TerraDrawModeBehavior[] = [];
	protected validate: Validation | undefined;
	protected pointerDistance: number = 40;
	protected coordinatePrecision!: number;
	protected onStyleChange!: StoreChangeHandler<
		TerraDrawOnChangeContext | undefined
	>;
	protected store!: TerraDrawGeoJSONStore;
	protected projection: Projection = "web-mercator";

	protected setDoubleClickToZoom!: TerraDrawModeRegisterConfig["setDoubleClickToZoom"];
	protected unproject!: TerraDrawModeRegisterConfig["unproject"];
	protected project!: TerraDrawModeRegisterConfig["project"];
	protected setCursor!: TerraDrawModeRegisterConfig["setCursor"];
	protected registerBehaviors(behaviorConfig: BehaviorConfig): void {}

	private isInitialUpdate = false;

	constructor(
		options?: BaseModeOptions<Styling>,
		willCallUpdateOptionsInParentClass = false,
	) {
		// Note: We want to updateOptions on the base class by default, but we don't want it to be
		// called twice if the extending class is going to call it as well
		if (!willCallUpdateOptionsInParentClass) {
			this.updateOptions({ ...options });
		} else {
			// Indicates we are about to have updateOptions called in the parent class
			this.isInitialUpdate = true;
		}
	}

	updateOptions(options?: BaseModeOptions<Styling>) {
		if (options?.styles) {
			// Note: we are updating this.styles and not this._styles - this is because
			// once registered we want to trigger the onStyleChange
			this.styles = { ...this._styles, ...options.styles };
		}

		if (options?.pointerDistance) {
			this.pointerDistance = options.pointerDistance;
		}
		if (options?.validation) {
			this.validate = options && options.validation;
		}
		if (options?.projection) {
			this.projection = options.projection;
		}

		if (options?.pointerEvents !== undefined) {
			this.pointerEvents = options.pointerEvents;
		}

		if (options?.modeName && this.isInitialUpdate === true) {
			this.mode = options.modeName;
		}

		this.isInitialUpdate = false;
	}

	protected allowPointerEvent(
		pointerEvent: AllowPointerEvent,
		event: TerraDrawMouseEvent,
	) {
		if (typeof pointerEvent === "boolean") {
			return pointerEvent;
		}
		if (typeof pointerEvent === "function") {
			return pointerEvent(event);
		}
		return true;
	}

	type = ModeTypes.Drawing;
	mode = "base";

	protected setDrawing() {
		if (this._state === "started") {
			this._state = "drawing";
		} else {
			throw new Error("Mode must be unregistered or stopped to start");
		}
	}

	protected setStarted() {
		if (
			this._state === "stopped" ||
			this._state === "registered" ||
			this._state === "drawing" ||
			this._state === "selecting"
		) {
			this._state = "started";
			this.setDoubleClickToZoom(false);
		} else {
			throw new Error("Mode must be unregistered or stopped to start");
		}
	}

	protected setStopped() {
		if (this._state === "started") {
			this._state = "stopped";
			this.setDoubleClickToZoom(true);
		} else {
			throw new Error("Mode must be started to be stopped");
		}
	}

	register(config: TerraDrawModeRegisterConfig) {
		if (this._state === "unregistered") {
			this._state = "registered";
			this.store = config.store;
			this.store.registerOnChange(config.onChange);
			this.setDoubleClickToZoom = config.setDoubleClickToZoom;
			this.project = config.project;
			this.unproject = config.unproject;
			this.onSelect = config.onSelect;
			this.onDeselect = config.onDeselect;
			this.setCursor = config.setCursor;
			this.onStyleChange = config.onChange;
			this.onFinish = config.onFinish;
			this.coordinatePrecision = config.coordinatePrecision;

			this.registerBehaviors({
				mode: config.mode,
				store: this.store,
				project: this.project,
				unproject: this.unproject,
				pointerDistance: this.pointerDistance,
				coordinatePrecision: config.coordinatePrecision,
				projection: this.projection,
			});
		} else {
			throw new Error("Can not register unless mode is unregistered");
		}
	}

	validateFeature(feature: unknown): ReturnType<Validation> {
		return this.performFeatureValidation(feature);
	}

	afterFeatureAdded(feature: GeoJSONStoreFeatures) {}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {}

	private performFeatureValidation(feature: unknown): ReturnType<Validation> {
		if (this._state === "unregistered") {
			throw new Error("Mode must be registered");
		}

		const validStoreFeature = isValidStoreFeature(
			feature,
			this.store.idStrategy.isValidId,
		);

		// We also want tp validate based on any specific valdiations passed in
		if (this.validate) {
			const validation = this.validate(feature as GeoJSONStoreFeatures, {
				project: this.project,
				unproject: this.unproject,
				coordinatePrecision: this.coordinatePrecision,
				updateType: UpdateTypes.Provisional,
			});

			return {
				// validatedFeature: feature as GeoJSONStoreFeatures,
				valid: validStoreFeature.valid && validation.valid,
				reason: validation.reason,
			};
		}

		return {
			// validatedFeature: feature as GeoJSONStoreFeatures,
			valid: validStoreFeature.valid,
			reason: validStoreFeature.reason,
		};
	}

	protected validateModeFeature(
		feature: unknown,
		modeValidationFn: (feature: GeoJSONStoreFeatures) => ReturnType<Validation>,
	): ReturnType<Validation> {
		const validation = this.performFeatureValidation(feature);
		if (validation.valid) {
			const validatedFeature = feature as GeoJSONStoreFeatures;
			const matches = validatedFeature.properties.mode === this.mode;
			if (!matches) {
				return {
					valid: false,
					reason: ValidationReasonModeMismatch,
				};
			}
			const modeValidation = modeValidationFn(validatedFeature);
			return modeValidation;
		}

		return {
			valid: false,
			reason: validation.reason,
		};
	}

	abstract start(): void;
	abstract stop(): void;
	abstract cleanUp(): void;
	abstract styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling;

	onFinish(finishedId: FeatureId, context: OnFinishContext) {}
	onDeselect(deselectedId: FeatureId) {}
	onSelect(selectedId: FeatureId) {}
	onKeyDown(event: TerraDrawKeyboardEvent) {}
	onKeyUp(event: TerraDrawKeyboardEvent) {}
	undo() {}
	undoSize() {
		return 0;
	}
	redoSize() {
		return 0;
	}
	redo() {}
	onMouseMove(event: TerraDrawMouseEvent) {}
	onClick(event: TerraDrawMouseEvent) {}
	onDragStart(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {}
	onDrag(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {}
	onDragEnd(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {}

	protected getHexColorStylingValue(
		value: HexColor | ((feature: GeoJSONStoreFeatures) => HexColor) | undefined,
		defaultValue: HexColor,
		feature: GeoJSONStoreFeatures,
	): HexColor {
		return this.getStylingValue(value, defaultValue, feature);
	}

	protected getNumericStylingValue(
		value: number | ((feature: GeoJSONStoreFeatures) => number) | undefined,
		defaultValue: number,
		feature: GeoJSONStoreFeatures,
	): number {
		return this.getStylingValue(value, defaultValue, feature);
	}

	protected getUrlStylingValue(
		value: UrlStyling | undefined,
		defaultValue: string,
		feature: GeoJSONStoreFeatures,
	): string {
		return this.getStylingValue(value, defaultValue, feature);
	}

	private getStylingValue<T extends string | number>(
		value: T | ((feature: GeoJSONStoreFeatures) => T) | undefined,
		defaultValue: T,
		feature: GeoJSONStoreFeatures,
	) {
		if (value === undefined) {
			return defaultValue;
		} else if (typeof value === "function") {
			return value(feature);
		} else {
			return value;
		}
	}
}

export abstract class TerraDrawBaseSelectMode<
	Styling extends CustomStyling,
> extends TerraDrawBaseDrawMode<Styling> {
	public type = ModeTypes.Select;

	public abstract selectFeature(featureId: FeatureId): void;
	public abstract deselectFeature(featureId: FeatureId): void;
}
