import { isThrowStatement, textSpanIsEmpty } from "typescript";
import {
  TerraDrawMouseEvent,
  TerraDrawMode,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
  TerraDrawModeState,
} from "../common";
import { GeoJSONStore } from "../store/store";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawBaseDrawMode } from "./base.mode";

export class TerraDrawPointMode extends TerraDrawBaseDrawMode {
  mode = "point";

  constructor(options?: { styling?: Partial<TerraDrawAdapterStyling> }) {
    super(options);
  }

  start() {
    this.setStarted();
    this.setCursor("crosshair");
  }
  stop() {
    this.setStopped();
    this.setCursor("unset");
    this.cleanUp();
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
