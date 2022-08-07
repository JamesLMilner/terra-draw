import {
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

  protected store: GeoJSONStore;
  protected project: TerraDrawModeRegisterConfig["project"];
  protected setCursor: TerraDrawModeRegisterConfig["setCursor"];

  constructor(options?: { styling?: Partial<TerraDrawAdapterStyling> }) {
    this._state = "unregistered";
    this.styling =
      options && options.styling
        ? { ...getDefaultStyling(), ...options.styling }
        : getDefaultStyling();
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
      this.onSelect = config.onSelect;
      this.onDeselect = config.onDeselect;
      this.setCursor = config.setCursor;
    } else {
      throw new Error("Can not register unless mode is unregistered");
    }
  }

  onDeselect(deselectedId: string) {}
  onSelect(selectedId: string) {}
}
