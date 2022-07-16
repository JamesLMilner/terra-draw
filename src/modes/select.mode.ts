import {
  TerraDrawMouseEvent,
  TerraDrawMode,
  TerraDrawModeRegisterConfig,
  TerraDrawKeyboardEvent,
  TerraDrawAdapterStyling,
} from "../common";
import { GeoJSONStore } from "../store/store";
import { pointInPolygon } from "../geometry/point-in-polygon";
import { getPixelDistance } from "../geometry/get-pixel-distance";
import { getPixelDistanceToLine } from "../geometry/get-pixel-distance-to-line";
import { getDefaultStyling } from "../util/styling";

export class TerraDrawSelectMode implements TerraDrawMode {
  mode = "select";
  private store: GeoJSONStore;
  private project: TerraDrawModeRegisterConfig["project"];
  private selected: string[] = [];
  private pointerDistance: number;

  constructor(options?: {
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
  }) {
    this.pointerDistance = (options && options.pointerDistance) || 40;

    this.styling =
      options && options.styling
        ? { ...getDefaultStyling(), ...options.styling }
        : getDefaultStyling();
  }

  styling: TerraDrawAdapterStyling;

  onClick(event: TerraDrawMouseEvent) {
    const features = this.store.copyAll();

    let clickedFeatureId: string;
    let clickedFeatureDistance = Infinity;

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const geometry = feature.geometry;

      if (geometry.type === "Point") {
        const { x, y } = this.project(
          geometry.coordinates[0],
          geometry.coordinates[1]
        );
        const distance = getPixelDistance(
          { x, y },
          { x: event.containerX, y: event.containerY }
        );
        if (
          distance < this.pointerDistance &&
          distance < clickedFeatureDistance
        ) {
          clickedFeatureDistance = distance;
          clickedFeatureId = feature.id as string;
        }
      } else if (geometry.type === "LineString") {
        for (let i = 0; i < geometry.coordinates.length - 1; i++) {
          const coord = geometry.coordinates[i];
          const nextCoord = geometry.coordinates[i + 1];
          const distanceToLine = getPixelDistanceToLine(
            { x: event.containerX, y: event.containerY },
            this.project(coord[0], coord[1]),
            this.project(nextCoord[0], nextCoord[1])
          );

          if (
            distanceToLine < this.pointerDistance &&
            distanceToLine < clickedFeatureDistance
          ) {
            clickedFeatureDistance = distanceToLine;
            clickedFeatureId = feature.id as string;
          }
        }
      } else if (geometry.type === "Polygon") {
        const clickInsidePolygon = pointInPolygon(
          [event.lng, event.lat],
          geometry.coordinates as [number, number][][]
        );

        if (clickInsidePolygon) {
          clickedFeatureDistance = 0;
          clickedFeatureId = feature.id as string;
        }
      }
    }

    if (clickedFeatureId) {
      // TODO: Handle multi select?
      this.selected = [clickedFeatureId];
      this.onSelect(clickedFeatureId);
    } else {
      this.selected = [];
      this.onDeselect();
    }
  }
  onKeyPress(event: TerraDrawKeyboardEvent) {
    if (event.key === "Delete") {
      if (!this.selected.length) {
        return;
      }
      // Delete all selected features
      // from the store and clear selected
      this.selected.forEach((id) => {
        this.store.delete(id);
      });
      this.selected = [];

      // We are technically deselecting
      // because the selected feature
      // no longer exists
      this.onDeselect();
    }
  }
  onDeselect() {}
  onSelect(selectedId: string) {}
  onMouseMove() {}
  register(config: TerraDrawModeRegisterConfig) {
    this.store = config.store;
    this.store.registerOnChange(config.onChange);
    this.project = config.project;
    this.onSelect = config.onSelect;
    this.onDeselect = config.onDeselect;
  }
  cleanUp() {}
}
