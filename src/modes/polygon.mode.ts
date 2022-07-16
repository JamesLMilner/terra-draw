import {
  TerraDrawMouseEvent,
  TerraDrawMode,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
  TerraDrawKeyboardEvent,
} from "../common";
import { GeoJSONStore } from "../store/store";
import { Polygon } from "geojson";
import { getPixelDistance } from "../geometry/get-pixel-distance";
import { selfIntersects } from "../geometry/self-intersects";
import { getDefaultStyling } from "../util/styling";

export class TerraDrawPolygonMode implements TerraDrawMode {
  mode = "polygon";

  private store: GeoJSONStore;
  private project: TerraDrawModeRegisterConfig["project"];

  private currentCoordinate = 0;
  private currentId: string;
  private allowSelfIntersections: boolean;
  private pointerDistance: number;

  constructor(options?: {
    allowSelfIntersections?: boolean;
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
  }) {
    this.pointerDistance = (options && options.pointerDistance) || 40;

    this.styling =
      options && options.styling
        ? { ...getDefaultStyling(), ...options.styling }
        : getDefaultStyling();

    this.allowSelfIntersections =
      options && options.allowSelfIntersections !== undefined
        ? options.allowSelfIntersections
        : true;
  }

  styling: TerraDrawAdapterStyling;

  register(config: TerraDrawModeRegisterConfig) {
    this.store = config.store;
    this.store.registerOnChange(config.onChange);
    this.project = config.project;
  }

  onMouseMove(event: TerraDrawMouseEvent) {
    if (!this.currentId || this.currentCoordinate === 0) {
      return;
    }

    const currentLineGeometry = this.store.getGeometryCopy<Polygon>(
      this.currentId
    );

    currentLineGeometry.coordinates[0].pop();
    this.store.updateGeometry(this.currentId, {
      type: "Polygon",
      coordinates: [
        [...currentLineGeometry.coordinates[0], [event.lng, event.lat]],
      ],
    });
  }

  onClick(event: TerraDrawMouseEvent) {
    if (this.currentCoordinate === 0) {
      this.currentId = this.store.create(
        {
          type: "Polygon",
          coordinates: [
            [
              [event.lng, event.lat],
              [event.lng, event.lat],
            ],
          ],
        },
        { mode: this.mode }
      );
      this.currentCoordinate++;
    } else if (this.currentCoordinate === 1) {
      const currentPolygonGeometry = this.store.getGeometryCopy<Polygon>(
        this.currentId
      );

      this.store.updateGeometry(this.currentId, {
        type: "Polygon",
        coordinates: [
          [
            currentPolygonGeometry.coordinates[0][0],
            [event.lng, event.lat],
            [event.lng, event.lat],
          ],
        ],
      });
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
        // Finish off the drawing
        const newGeometry = {
          type: "Polygon",
          coordinates: [
            [
              ...currentPolygonGeometry.coordinates[0].slice(0, -1),
              currentPolygonGeometry.coordinates[0][0],
            ],
          ],
        } as Polygon;

        this.store.updateGeometry(this.currentId, newGeometry);
        this.currentCoordinate = 0;
        this.currentId = undefined;
      } else {
        const newPolygon = {
          type: "Polygon",
          coordinates: [
            [...currentPolygonGeometry.coordinates[0], [event.lng, event.lat]],
          ],
        } as Polygon;

        if (this.currentCoordinate > 2 && !this.allowSelfIntersections) {
          const hasSelfIntersections = selfIntersects({
            type: "Feature",
            geometry: newPolygon,
            properties: {},
          });

          if (hasSelfIntersections) {
            this.store.updateGeometry(this.currentId, currentPolygonGeometry);
            return;
          }
        }

        // If not close to the final point, keep adding points
        this.store.updateGeometry(this.currentId, newPolygon);
        this.currentCoordinate++;
      }
    }
  }
  onKeyPress(event: TerraDrawKeyboardEvent) {
    if (event.key === "Escape") {
      this.cleanUp();
    }
  }

  cleanUp() {
    try {
      this.store.delete(this.currentId);
    } catch (error) {}
    this.currentId = undefined;
    this.currentCoordinate = 0;
  }
}
