import { BehaviorConfig, TerraDrawModeBehavior } from "./common/base.behavior";
import {
  Project,
  TerraDrawAdapterStyling,
  TerraDrawModeRegisterConfig,
  TerraDrawModeState,
} from "../common";
import { GeoJSONStore } from "../store/store";
import { getDefaultStyling } from "../util/styling";

export abstract class TerraDrawBaseDrawMode {
  _state: TerraDrawModeState;
  get state() {
    return this._state;
  }
  set state(_) {
    throw new Error("Please use the modes lifecycle methods");
  }
  styling: TerraDrawAdapterStyling;

  protected behaviors: TerraDrawModeBehavior[] = [];
  protected pointerDistance: number;
  protected store: GeoJSONStore;
  protected unproject: TerraDrawModeRegisterConfig["unproject"];
  protected project: TerraDrawModeRegisterConfig["project"];
  protected setCursor: TerraDrawModeRegisterConfig["setCursor"];
  protected coordinatePrecision: number;
  protected registerBehaviors(behaviorConfig: BehaviorConfig): void {}

  constructor(options?: {
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
    coordinatePrecision?: number;
  }) {
    this._state = "unregistered";
    this.styling =
      options && options.styling
        ? { ...getDefaultStyling(), ...options.styling }
        : getDefaultStyling();

    this.pointerDistance = (options && options.pointerDistance) || 40;

    this.coordinatePrecision = (options && options.coordinatePrecision) || 9;
  }

  protected setStarted() {
    if (this._state === "stopped" || this._state === "registered") {
      this._state = "started";
    } else {
      throw new Error("Mode must be unregistered or stopped to start");
    }
  }

  protected setStopped() {
    if (this._state === "started") {
      this._state = "stopped";
    } else {
      throw new Error("Mode must be started to be stopped");
    }
  }

  register(config: TerraDrawModeRegisterConfig) {
    if (this._state === "unregistered") {
      this._state = "registered";
      this.store = config.store;
      this.store.registerOnChange(config.onChange);
      this.project = config.project;
      this.unproject = config.unproject;
      this.onSelect = config.onSelect;
      this.onDeselect = config.onDeselect;
      this.setCursor = config.setCursor;

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
}
