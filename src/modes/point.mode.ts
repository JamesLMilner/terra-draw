import {
  TerraDrawMouseEvent,
  TerraDrawMode,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
} from "../common";
import { GeoJSONStore } from "../store/store";
import { getDefaultStyling } from "../util/styling";

export class TerraDrawPointMode implements TerraDrawMode {
  mode = "point";

  private store: GeoJSONStore;

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
  }

  onClick(event: TerraDrawMouseEvent) {
    if (!this.store) {
      throw new Error("Mode must be registered first");
    }

    this.store.create([
      {
        geometry: {
          type: "Point",
          coordinates: [event.lng, event.lat],
        },
        properties: { mode: this.mode },
      },
    ]);
  }
  onMouseMove() {}
  onKeyPress() {}
  cleanUp() {}
  onDragStart() {}
  onDrag() {}
  onDragEnd() {}
}
