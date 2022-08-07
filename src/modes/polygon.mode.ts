import {
  TerraDrawMouseEvent,
  TerraDrawAdapterStyling,
  TerraDrawKeyboardEvent,
} from "../common";
import { Polygon } from "geojson";
import { getPixelDistance } from "../geometry/get-pixel-distance";
import { selfIntersects } from "../geometry/self-intersects";
import { TerraDrawBaseDrawMode } from "./base.mode";

type TerraDrawPolygonModeKeyEvents = {
  cancel: KeyboardEvent["key"];
};
export class TerraDrawPolygonMode extends TerraDrawBaseDrawMode {
  mode = "polygon";

  private currentCoordinate = 0;
  private currentId: string;
  private allowSelfIntersections: boolean;
  private pointerDistance: number;
  private keyEvents: TerraDrawPolygonModeKeyEvents;

  constructor(options?: {
    allowSelfIntersections?: boolean;
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
    keyEvents?: TerraDrawPolygonModeKeyEvents;
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
    this.setCursor("crosshair");

    if (!this.currentId || this.currentCoordinate === 0) {
      return;
    }

    const currentLineCoordinates = this.store.getGeometryCopy<Polygon>(
      this.currentId
    ).coordinates[0];

    let updatedCoordinates;

    if (this.currentCoordinate === 1) {
      updatedCoordinates = [
        currentLineCoordinates[0],
        [event.lng, event.lat],
        currentLineCoordinates[0],
        currentLineCoordinates[0],
      ];
    } else if (this.currentCoordinate === 2) {
      updatedCoordinates = [
        currentLineCoordinates[0],
        currentLineCoordinates[1],
        [event.lng, event.lat],
        currentLineCoordinates[0],
      ];
    } else {
      updatedCoordinates = [
        ...currentLineCoordinates.slice(0, -2),
        [event.lng, event.lat],
        currentLineCoordinates[0],
      ];
    }

    this.store.updateGeometry([
      {
        id: this.currentId,
        geometry: {
          type: "Polygon",
          coordinates: [updatedCoordinates],
        },
      },
    ]);
  }

  onClick(event: TerraDrawMouseEvent) {
    if (this.currentCoordinate === 0) {
      const [newId] = this.store.create([
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
      this.currentId = newId;
      this.currentCoordinate++;
    } else if (this.currentCoordinate === 1) {
      const currentPolygonGeometry = this.store.getGeometryCopy<Polygon>(
        this.currentId
      );

      // if (
      //   coordinatesIdentical(
      //     currentPolygonGeometry.coordinates[0][0] as Position,
      //     [event.lng, event.lat]
      //   )
      // ) {
      //   return;
      // }

      this.store.updateGeometry([
        {
          id: this.currentId,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                currentPolygonGeometry.coordinates[0][0],
                [event.lng, event.lat],
                [event.lng, event.lat],
                currentPolygonGeometry.coordinates[0][0],
              ],
            ],
          },
        },
      ]);

      this.currentCoordinate++;
    } else if (this.currentCoordinate === 2) {
      const currentPolygonGeometry = this.store.getGeometryCopy<Polygon>(
        this.currentId
      );

      this.store.updateGeometry([
        {
          id: this.currentId,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                currentPolygonGeometry.coordinates[0][0],
                currentPolygonGeometry.coordinates[0][1],
                [event.lng, event.lat],
                [event.lng, event.lat],
                currentPolygonGeometry.coordinates[0][0],
              ],
            ],
          },
        },
      ]);

      this.currentCoordinate++;
    } else {
      const currentPolygonGeometry = this.store.getGeometryCopy<Polygon>(
        this.currentId
      );

      const [firstLng, firstLat] = currentPolygonGeometry.coordinates[0][0];
      const { x, y } = this.project(firstLng, firstLat);
      const distance = getPixelDistance(
        { x, y },
        { x: event.containerX, y: event.containerY }
      );

      const isClosingClick = distance < this.pointerDistance;

      if (isClosingClick) {
        this.store.updateGeometry([
          {
            id: this.currentId,
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  ...currentPolygonGeometry.coordinates[0].slice(0, -2),
                  currentPolygonGeometry.coordinates[0][0],
                ],
              ],
            },
          },
        ]);

        this.currentCoordinate = 0;
        this.currentId = undefined;
      } else {
        const updatedPolygon = {
          type: "Polygon",
          coordinates: [
            [
              ...currentPolygonGeometry.coordinates[0].slice(0, -1),
              [event.lng, event.lat], // New point that onMouseMove can manipulate
              currentPolygonGeometry.coordinates[0][0],
            ],
          ],
        } as Polygon;

        if (this.currentCoordinate > 2 && !this.allowSelfIntersections) {
          const hasSelfIntersections = selfIntersects({
            type: "Feature",
            geometry: updatedPolygon,
            properties: {},
          });

          if (hasSelfIntersections) {
            // Don't update the geometry!
            return;
          }
        }

        // If not close to the final point, keep adding points
        this.store.updateGeometry([
          { id: this.currentId, geometry: updatedPolygon },
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

  onDragStart() {
    // We want to allow the default drag
    // cursor to exist
    this.setCursor("unset");
  }
  onDrag() {}
  onDragEnd() {
    // Set it back to crosshair
    this.setCursor("crosshair");
  }

  cleanUp() {
    try {
      this.store.delete([this.currentId]);
    } catch (error) {}
    this.currentId = undefined;
    this.currentCoordinate = 0;
  }
}
