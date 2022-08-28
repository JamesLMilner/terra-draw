import {
  TerraDrawMouseEvent,
  TerraDrawAdapterStyling,
  TerraDrawKeyboardEvent,
} from "../common";
import { Feature, Polygon, Position } from "geojson";
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
  private keyEvents: TerraDrawPolygonModeKeyEvents;
  private getSnappablePolygonCoord: (
    event: TerraDrawMouseEvent
  ) => Position | undefined;
  private snapping: boolean;

  constructor(options?: {
    allowSelfIntersections?: boolean;
    snapping?: boolean;
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
    keyEvents?: TerraDrawPolygonModeKeyEvents;
  }) {
    super(options);

    this.snapping =
      options && options.snapping !== undefined ? options.snapping : false;

    this.getSnappablePolygonCoord = (event: TerraDrawMouseEvent) => {
      if (this.snapping) {
        return this.getSnappableCoord(
          event,
          (feature) =>
            feature.properties.mode === this.mode &&
            feature.id !== this.currentId
        );
      }
    };

    this.allowSelfIntersections =
      options && options.allowSelfIntersections !== undefined
        ? options.allowSelfIntersections
        : true;

    this.keyEvents =
      options && options.keyEvents ? options.keyEvents : { cancel: "Escape" };
  }

  protected getSnappableCoord(
    event: TerraDrawMouseEvent,
    filter: (feature: Feature) => boolean
  ) {
    const bbox = this.createClickBoundingBox(event);

    const features = this.store.search(bbox, filter) as Feature<Polygon>[];

    let closest: { coord: undefined | Position; minDist: number } = {
      coord: undefined,
      minDist: Infinity,
    };

    features.forEach((feature) => {
      feature.geometry.coordinates[0].forEach((coord) => {
        const dist = this.distanceBetweenTwoCoords(coord, event);
        if (dist < closest.minDist && dist < this.pointerDistance) {
          closest.coord = coord;
        }
      });
    });

    return closest.coord;
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

    const closestCoord = this.getSnappablePolygonCoord(event);

    const currentLineCoordinates = this.store.getGeometryCopy<Polygon>(
      this.currentId
    ).coordinates[0];

    if (closestCoord) {
      event.lng = closestCoord[0];
      event.lat = closestCoord[1];
    }

    let updatedCoordinates;

    if (this.currentCoordinate === 1) {
      // We must add a very small epsilon value so that Mapbox GL
      // renders the polygon - There might be a cleaner solution?
      const epsilon = 1 / Math.pow(10, this.coordinatePrecision - 1);
      const offset = Math.max(0.000001, epsilon);

      updatedCoordinates = [
        currentLineCoordinates[0],
        [event.lng, event.lat],
        [event.lng, event.lat + offset],
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
    const closestCoord = this.getSnappablePolygonCoord(event);

    if (this.currentCoordinate === 0) {
      if (closestCoord) {
        event.lng = closestCoord[0];
        event.lat = closestCoord[1];
      }

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
      if (closestCoord) {
        event.lng = closestCoord[0];
        event.lat = closestCoord[1];
      }

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
      if (closestCoord) {
        event.lng = closestCoord[0];
        event.lat = closestCoord[1];
      }

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
        if (closestCoord) {
          event.lng = closestCoord[0];
          event.lat = closestCoord[1];
        }

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
