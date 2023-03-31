import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { TerraDrawModeRegisterConfig, TerraDrawModeState } from "../common";
import { GeoJSONStore, GeoJSONStoreFeatures } from "../store/store";

type CustomStyling = Record<string, string | number>;

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
	protected onStyleChange: any;
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
			console.log(this);
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
			console.log(config.setDoubleClickToZoom);
			this.setDoubleClickToZoom = config.setDoubleClickToZoom;
			this.project = config.project;
			this.unproject = config.unproject;
			this.onSelect = config.onSelect;
			this.onDeselect = config.onDeselect;
			this.setCursor = config.setCursor;
			this.onStyleChange = config.onChange;

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

	onDeselect(deselectedId: string) {}
	onSelect(selectedId: string) {}
	styleFeature(feature: GeoJSONStoreFeatures) {}
}
