import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import {
	HexColor,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	TerraDrawModeRegisterConfig,
	TerraDrawModeState,
	TerraDrawMouseEvent,
} from "../common";
import {
	GeoJSONStore,
	GeoJSONStoreFeatures,
	StoreChangeHandler,
} from "../store/store";
import { isValidStoreFeature } from "../store/store-feature-validation";

type CustomStyling = Record<
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
	protected pointerDistance: number;
	protected coordinatePrecision: number;
	protected onStyleChange!: StoreChangeHandler;
	protected store!: GeoJSONStore;
	protected setDoubleClickToZoom!: TerraDrawModeRegisterConfig["setDoubleClickToZoom"];
	protected unproject!: TerraDrawModeRegisterConfig["unproject"];
	protected project!: TerraDrawModeRegisterConfig["project"];
	protected setCursor!: TerraDrawModeRegisterConfig["setCursor"];
	protected registerBehaviors(behaviorConfig: BehaviorConfig): void {}

	constructor(options?: {
		styles?: Partial<T>;
		pointerDistance?: number;
		coordinatePrecision?: number;
	}) {
		this._state = "unregistered";
		this._styles =
			options && options.styles ? { ...options.styles } : ({} as Partial<T>);

		this.pointerDistance = (options && options.pointerDistance) || 40;

		this.coordinatePrecision = (options && options.coordinatePrecision) || 9;
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
			this._state === "drawing"
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

			this.registerBehaviors({
				mode: config.mode,
				store: this.store,
				project: this.project,
				unproject: this.unproject,
				pointerDistance: this.pointerDistance,
				coordinatePrecision: this.coordinatePrecision,
			});
		} else {
			throw new Error("Can not register unless mode is unregistered");
		}
	}

	validateFeature(feature: unknown): feature is GeoJSONStoreFeatures {
		return isValidStoreFeature(feature);
	}

	abstract start(): void;
	abstract stop(): void;
	abstract cleanUp(): void;
	abstract styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling;

	onFinish(finishedId: string) {}
	onDeselect(deselectedId: string) {}
	onSelect(selectedId: string) {}
	onKeyDown(event: TerraDrawKeyboardEvent) {}
	onKeyUp(event: TerraDrawKeyboardEvent) {}
	onMouseMove(event: TerraDrawMouseEvent) {}
	onClick(event: TerraDrawMouseEvent) {}
	onDragStart(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void
	) {}
	onDrag(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void
	) {}
	onDragEnd(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void
	) {}

	protected getHexColorStylingValue(
		value: HexColor | ((feature: GeoJSONStoreFeatures) => HexColor) | undefined,
		defaultValue: HexColor,
		feature: GeoJSONStoreFeatures
	): HexColor {
		return this.getStylingValue(value, defaultValue, feature);
	}

	protected getNumericStylingValue(
		value: number | ((feature: GeoJSONStoreFeatures) => number) | undefined,
		defaultValue: number,
		feature: GeoJSONStoreFeatures
	): number {
		return this.getStylingValue(value, defaultValue, feature);
	}

	private getStylingValue<T extends string | number>(
		value: T | ((feature: GeoJSONStoreFeatures) => T) | undefined,
		defaultValue: T,
		feature: GeoJSONStoreFeatures
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
