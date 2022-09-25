import {
  TerraDrawMouseEvent,
  TerraDrawAdapterStyling,
  TerraDrawKeyboardEvent,
} from "../../common";
import { Polygon } from "geojson";

import { TerraDrawBaseDrawMode } from "../base.mode";

type TerraDrawFreehandModeKeyEvents = {
  cancel: KeyboardEvent["key"];
};

export class TerraDrawFreehandMode extends TerraDrawBaseDrawMode {
  mode = "freehand";

  private startingClick = false;
  private currentId: string | undefined;
  private skip: number = 0;
  private everyNthMouseEvent: number;
  private keyEvents: TerraDrawFreehandModeKeyEvents;

  constructor(options?: {
    styling?: Partial<TerraDrawAdapterStyling>;
    everyNthMouseEvent?: number;
    keyEvents?: TerraDrawFreehandModeKeyEvents;
  }) {
    super(options);

    this.everyNthMouseEvent = (options && options.everyNthMouseEvent) || 10;
    this.keyEvents =
      options && options.keyEvents ? options.keyEvents : { cancel: "Escape" };
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

  onMouseMove(event: TerraDrawMouseEvent) {
    if (!this.currentId || this.startingClick === false) {
      return;
    }

    if (this.skip > this.everyNthMouseEvent) {
      this.skip = 0;
      const currentLineGeometry = this.store.getGeometryCopy<Polygon>(
        this.currentId
      );

      currentLineGeometry.coordinates[0].pop();

      this.store.updateGeometry([
        {
          id: this.currentId,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                ...currentLineGeometry.coordinates[0],
                [event.lng, event.lat],
                currentLineGeometry.coordinates[0][0],
              ],
            ],
          },
        },
      ]);
    }

    this.skip++;
  }

  onClick(event: TerraDrawMouseEvent) {
    if (this.startingClick === false) {
      const [createdId] = this.store.create([
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [event.lng, event.lat],
                [event.lng, event.lat],
                [event.lng, event.lat],
                [event.lng, event.lat],
              ],
            ],
          },
          properties: { mode: this.mode },
        },
      ]);

      this.currentId = createdId;
      this.startingClick = true;
      return;
    }

    this.startingClick = false;
    this.currentId = undefined;
  }
  onKeyDown() {}
  onKeyUp(event: TerraDrawKeyboardEvent) {
    if (event.key === this.keyEvents.cancel) {
      this.cleanUp();
    }
  }
  onDragStart() {}
  onDrag() {}
  onDragEnd() {}

  cleanUp() {
    try {
      if (this.currentId) {
        this.store.delete([this.currentId]);
      }
    } catch (error) {}
    this.currentId = undefined;
    this.startingClick = false;
  }
}
