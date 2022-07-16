import {
  TerraDrawMouseEvent,
  TerraDrawMode,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
  TerraDrawKeyboardEvent,
} from "../common";
import { GeoJSONStore } from "../store/store";
import { LineString } from "geojson";
import { selfIntersects } from "../geometry/self-intersects";
import { getPixelDistance } from "../geometry/get-pixel-distance";
import { getDefaultStyling } from "../util/styling";

export class TerraDrawLineStringMode implements TerraDrawMode {
  public mode = "linestring";

  private store: GeoJSONStore;
  private project: TerraDrawModeRegisterConfig["project"];
  private pointerDistance: number;

  private currentCoordinate = 0;
  private currentId: string;
  private allowSelfIntersections;

  constructor(options?: {
    allowSelfIntersections?: boolean;
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
  }) {
    this.styling =
      options && options.styling
        ? { ...getDefaultStyling(), ...options.styling }
        : getDefaultStyling();

    this.pointerDistance = (options && options.pointerDistance) || 40;

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
    const currentLineGeometry = this.store.getGeometryCopy<LineString>(
      this.currentId
    );

    // Remove the 'live' point that changes on mouse move
    currentLineGeometry.coordinates.pop();

    // Update the 'live' point
    this.store.updateGeometry(this.currentId, {
      type: "LineString",
      coordinates: [...currentLineGeometry.coordinates, [event.lng, event.lat]],
    });
  }

  onClick(event: TerraDrawMouseEvent) {
    if (this.currentCoordinate === 0) {
      this.currentId = this.store.create(
        {
          type: "LineString",
          coordinates: [
            [event.lng, event.lat],
            [event.lng, event.lat], // This is the 'live' point that changes on mouse move
          ],
        },
        { mode: this.mode }
      );
      this.currentCoordinate++;
    } else if (this.currentCoordinate === 1) {
      const currentLineGeometry = this.store.getGeometryCopy<LineString>(
        this.currentId
      );

      this.store.updateGeometry(this.currentId, {
        type: "LineString",
        coordinates: [
          currentLineGeometry.coordinates[0],
          [event.lng, event.lat],
          [event.lng, event.lat],
        ],
      });

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
        this.store.updateGeometry(this.currentId, {
          type: "LineString",
          coordinates: [...currentLineGeometry.coordinates],
        });

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

        this.store.updateGeometry(this.currentId, newLineString);
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
