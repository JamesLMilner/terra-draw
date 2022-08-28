import { Feature, Polygon, Position } from "geojson";
import {
  TerraDrawAdapterStyling,
  TerraDrawModeRegisterConfig,
  TerraDrawModeState,
  TerraDrawMouseEvent,
} from "../common";
import { getPixelDistance } from "../geometry/get-pixel-distance";
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

  protected pointerDistance: number;
  protected store: GeoJSONStore;
  protected unproject: TerraDrawModeRegisterConfig["unproject"];
  protected project: TerraDrawModeRegisterConfig["project"];
  protected setCursor: TerraDrawModeRegisterConfig["setCursor"];
  protected coordinatePrecision: number;

  constructor(options?: {
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
    coordinatePrecision?: number;
  }) {
    this._state = "unregistered";
    this.pointerDistance = (options && options.pointerDistance) || 40;
    this.styling =
      options && options.styling
        ? { ...getDefaultStyling(), ...options.styling }
        : getDefaultStyling();
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

  protected createClickBoundingBox(event: TerraDrawMouseEvent) {
    const { containerX: x, containerY: y } = event;
    const halfDist = this.pointerDistance / 2;

    const bbox = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            this.unproject(x - halfDist, y - halfDist), // TopLeft
            this.unproject(x + halfDist, y - halfDist), // TopRight
            this.unproject(x + halfDist, y + halfDist), // BottomRight
            this.unproject(x - halfDist, y + halfDist), // BottomLeft
            this.unproject(x - halfDist, y - halfDist), // TopLeft
          ].map((c) => [c.lng, c.lat]),
        ],
      },
    } as Feature<Polygon>;

    return bbox;
  }

  protected distanceBetweenTwoCoords(
    coord: Position,
    event: TerraDrawMouseEvent
  ) {
    const { x, y } = this.project(coord[0], coord[1]);

    const distance = getPixelDistance(
      { x, y },
      { x: event.containerX, y: event.containerY }
    );

    return distance;
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
    } else {
      throw new Error("Can not register unless mode is unregistered");
    }
  }

  onDeselect(deselectedId: string) {}
  onSelect(selectedId: string) {}
}
