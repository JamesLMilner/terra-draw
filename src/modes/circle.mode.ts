import {
  TerraDrawMouseEvent,
  TerraDrawMode,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
  TerraDrawKeyboardEvent,
} from "../common";
import { circle } from "../geometry/create-circle";
import { haversineDistanceKilometers } from "../geometry/haversine-distance";
import { GeoJSONStore } from "../store/store";
import { getDefaultStyling } from "../util/styling";

export class TerraDrawCircleMode implements TerraDrawMode {
  mode = "circle";

  private store: GeoJSONStore;
  private project: TerraDrawModeRegisterConfig["project"];
  private center: [number, number];
  private clickCount: number = 0;
  private currentCircleId: string;

  constructor(options?: { styling?: Partial<TerraDrawAdapterStyling> }) {
    this.styling =
      options && options.styling
        ? { ...getDefaultStyling(), ...options.styling }
        : getDefaultStyling();
  }

  styling: TerraDrawAdapterStyling;

  register(config: TerraDrawModeRegisterConfig) {
    this.store = config.store;
    this.store.registerOnChange(config.onChange);
    this.project = config.project;
  }

  onClick(event: TerraDrawMouseEvent) {
    if (this.clickCount === 0) {
      this.center = [event.lng, event.lat];
      const startingCircle = circle({
        center: this.center,
        radiusKilometers: 0.00001,
      });

      this.currentCircleId = this.store.create(startingCircle.geometry, {
        mode: this.mode,
      });

      this.clickCount++;
    } else {
      // Finish drawing
      this.center = undefined;
      this.currentCircleId = undefined;
      this.clickCount = 0;
    }
  }
  onMouseMove(event: TerraDrawMouseEvent) {
    if (this.clickCount === 1) {
      const distanceKm = haversineDistanceKilometers(this.center, [
        event.lng,
        event.lat,
      ]);

      const updatedCircle = circle({
        center: this.center,
        radiusKilometers: distanceKm,
      });

      this.store.updateGeometry(this.currentCircleId, updatedCircle.geometry);
    }
  }
  onKeyPress(event: TerraDrawKeyboardEvent) {
    if (event.key === "Escape") {
      this.cleanUp();
    }
  }
  cleanUp() {
    try {
      this.store.delete(this.currentCircleId);
    } catch (error) {}
    this.center = undefined;
    this.currentCircleId = undefined;
    this.clickCount = 0;
  }
}
