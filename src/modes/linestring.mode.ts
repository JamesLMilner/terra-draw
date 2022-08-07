import {
  TerraDrawMouseEvent,
  TerraDrawAdapterStyling,
  TerraDrawKeyboardEvent,
} from "../common";
import { LineString } from "geojson";
import { selfIntersects } from "../geometry/self-intersects";
import { getPixelDistance } from "../geometry/get-pixel-distance";
import { TerraDrawBaseDrawMode } from "./base.mode";

type TerraDrawLineStringModeKeyEvents = {
  cancel: KeyboardEvent["key"];
};
export class TerraDrawLineStringMode extends TerraDrawBaseDrawMode {
  mode = "linestring";

  private pointerDistance: number;
  private currentCoordinate = 0;
  private currentId: string;
  private allowSelfIntersections;
  private keyEvents: TerraDrawLineStringModeKeyEvents;

  constructor(options?: {
    allowSelfIntersections?: boolean;
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
    keyEvents?: TerraDrawLineStringModeKeyEvents;
  }) {
    super(options);
    this.pointerDistance = (options && options.pointerDistance) || 40;

    this.allowSelfIntersections =
      options && options.allowSelfIntersections !== undefined
        ? options.allowSelfIntersections
        : true;

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
    if (!this.currentId || this.currentCoordinate === 0) {
      return;
    }
    const currentLineGeometry = this.store.getGeometryCopy<LineString>(
      this.currentId
    );

    // Remove the 'live' point that changes on mouse move
    currentLineGeometry.coordinates.pop();

    // Update the 'live' point
    this.store.updateGeometry([
      {
        id: this.currentId,
        geometry: {
          type: "LineString",
          coordinates: [
            ...currentLineGeometry.coordinates,
            [event.lng, event.lat],
          ],
        },
      },
    ]);
  }

  onClick(event: TerraDrawMouseEvent) {
    if (this.currentCoordinate === 0) {
      const [createdId] = this.store.create([
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [event.lng, event.lat],
              [event.lng, event.lat], // This is the 'live' point that changes on mouse move
            ],
          },
          properties: { mode: this.mode },
        },
      ]);
      this.currentId = createdId;
      this.currentCoordinate++;
    } else if (this.currentCoordinate === 1) {
      const currentLineGeometry = this.store.getGeometryCopy<LineString>(
        this.currentId
      );

      this.store.updateGeometry([
        {
          id: this.currentId,
          geometry: {
            type: "LineString",
            coordinates: [
              currentLineGeometry.coordinates[0],
              [event.lng, event.lat],
              [event.lng, event.lat],
            ],
          },
        },
      ]);

      this.currentCoordinate++;
    } else {
      const currentLineGeometry = this.store.getGeometryCopy<LineString>(
        this.currentId
      );

      const [previousLng, previousLat] = currentLineGeometry.coordinates[
        currentLineGeometry.coordinates.length - 2
      ];
      const { x, y } = this.project(previousLng, previousLat);
      const distance = getPixelDistance(
        { x, y },
        { x: event.containerX, y: event.containerY }
      );

      const isClosingClick = distance < this.pointerDistance;

      if (isClosingClick) {
        // Finish off the drawing
        currentLineGeometry.coordinates.pop();
        this.store.updateGeometry([
          {
            id: this.currentId,
            geometry: {
              type: "LineString",
              coordinates: [...currentLineGeometry.coordinates],
            },
          },
        ]);

        this.currentCoordinate = 0;
        this.currentId = undefined;
      } else {
        // If not close to the final point, keep adding points
        const newLineString = {
          type: "LineString",
          coordinates: [
            ...currentLineGeometry.coordinates,
            [event.lng, event.lat],
          ],
        } as LineString;

        if (!this.allowSelfIntersections) {
          const hasSelfIntersections = selfIntersects({
            type: "Feature",
            geometry: newLineString,
            properties: {},
          });

          if (hasSelfIntersections) {
            return;
          }
        }

        this.store.updateGeometry([
          { id: this.currentId, geometry: newLineString },
        ]);
        this.currentCoordinate++;
      }
    }
  }
  onKeyPress(event: TerraDrawKeyboardEvent) {
    if (event.key === this.keyEvents.cancel) {
      this.cleanUp();
    }
  }
  onDragStart() {}
  onDrag() {}
  onDragEnd() {}
  cleanUp() {
    try {
      this.store.delete([this.currentId]);
    } catch (error) {}

    this.currentId = undefined;
    this.currentCoordinate = 0;
  }
}
