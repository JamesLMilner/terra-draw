import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import {
	HexColor,
	OnFinishContext,
	Projection,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	TerraDrawModeRegisterConfig,
	TerraDrawModeState,
	TerraDrawMouseEvent,
	UpdateTypes,
	Validation,
} from "../common";
import {
	FeatureId,
	GeoJSONStore,
	GeoJSONStoreFeatures,
	StoreChangeHandler,
} from "../store/store";
import { isValidStoreFeature } from "../store/store-feature-validation";

export type CustomStyling = Record<
	string,
	| string
	| number
	| ((feature: GeoJSONStoreFeatures) => HexColor)
	| ((feature: GeoJSONStoreFeatures) => number)
>;

export enum ModeTypes {
	Drawing = "drawing",
	Select = "select",
	Static = "static",
	Render = "render",
}

type BaseValidationResult = { valid: boolean; reason?: string };

export type BaseModeOptions<T extends CustomStyling> = {
	styles?: Partial<T>;
	pointerDistance?: number;
	validation?: Validation;
	projection?: Projection;
};

export const ModeMismatchValidationFailure = {
	valid: false,
	reason: "Feature mode property does not match the mode being added to",
};

export abstract class TerraDrawBaseDrawMode<T extends CustomStyling> {
	protected _state: TerraDrawModeState;
	get state() {
		return this._state;
	}
	set state(_) {
		throw new Error("Please use the modes lifecycle methods");
	}

	protected _styles: Partial<T>;

	get styles(): Partial<T> {
		return this._styles;
	}
	set styles(styling: Partial<T>) {
		if (typeof styling !== "object") {
			throw new Error("Styling must be an object");
		}
		this.onStyleChange([], "styling");
		this._styles = styling;
	}

	protected behaviors: TerraDrawModeBehavior[] = [];
	protected validate: Validation | undefined;
	protected pointerDistance: number;
	protected coordinatePrecision!: number;
	protected onStyleChange!: StoreChangeHandler;
	protected store!: GeoJSONStore;
	protected setDoubleClickToZoom!: TerraDrawModeRegisterConfig["setDoubleClickToZoom"];
	protected unproject!: TerraDrawModeRegisterConfig["unproject"];
	protected project!: TerraDrawModeRegisterConfig["project"];
	protected setCursor!: TerraDrawModeRegisterConfig["setCursor"];
	protected registerBehaviors(behaviorConfig: BehaviorConfig): void {}
	protected projection!: Projection;

	constructor(options?: BaseModeOptions<T>) {
		this._state = "unregistered";
		this._styles =
			options && options.styles ? { ...options.styles } : ({} as Partial<T>);
		this.pointerDistance = (options && options.pointerDistance) || 40;

		this.validate = options && options.validation;

		this.projection = (options && options.projection) || "web-mercator";
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

	validateFeature(feature: unknown): BaseValidationResult {
		return this.performFeatureValidation(feature);
	}

	private performFeatureValidation(feature: unknown): BaseValidationResult {
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
		modeValidationFn: (feature: GeoJSONStoreFeatures) => boolean,
		defaultError: string,
	): BaseValidationResult {
		const validation = this.performFeatureValidation(feature);
		if (validation.valid) {
			const validatedFeature = feature as GeoJSONStoreFeatures;
			const matches = validatedFeature.properties.mode === this.mode;
			if (!matches) {
				return ModeMismatchValidationFailure;
			}
			const modeValidation = modeValidationFn(validatedFeature);
			return {
				valid: modeValidation,
				reason: modeValidation ? undefined : defaultError,
			};
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
	T extends CustomStyling,
> extends TerraDrawBaseDrawMode<T> {
	public type = ModeTypes.Select;

	public abstract selectFeature(featureId: FeatureId): void;
	public abstract deselectFeature(featureId: FeatureId): void;
}
