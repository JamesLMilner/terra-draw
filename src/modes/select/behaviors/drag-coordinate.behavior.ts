import { Project, TerraDrawMouseEvent, Unproject } from "../../../common";
import { GeoJSONStore, GeoJSONStoreFeatures } from "../../../store/store";

import {
  BehaviorConfig,
  TerraDrawModeBehavior,
} from "../../common/base.behavior";

import { Position } from "geojson";
import { PixelDistanceBehavior } from "../../common/pixel-distance.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

export class DragCoordinateBehavior extends TerraDrawModeBehavior {
  constructor(
    config: BehaviorConfig,
    private readonly pixelDistance: PixelDistanceBehavior,
    private readonly selectionPoints: SelectionPointBehavior,
    private readonly midPoints: MidPointBehavior
  ) {
    super(config);
  }

  public drag(event: TerraDrawMouseEvent, selectedId: string): boolean {
    const geometry = this.store.getGeometryCopy(selectedId);

    let geomCoordinates: Position[];

    if (geometry.type === "Point") {
      // We don't want to handle dragging
      // points here
      return false;
    } else if (geometry.type === "LineString") {
      geomCoordinates = geometry.coordinates;
    } else if (geometry.type === "Polygon") {
      geomCoordinates = geometry.coordinates[0];
    }

    const closestCoordinate = {
      dist: Infinity,
      index: -1,
      isFirstOrLastPolygonCoord: false,
    };

    // Look through the selected features coordinates
    // and try to find a coordinate that is draggable
    for (let i = 0; i < geomCoordinates.length; i++) {
      const coord = geomCoordinates[i];
      const distance = this.pixelDistance.measure(event, coord);

      if (
        distance < this.pointerDistance &&
        distance < closestCoordinate.dist
      ) {
        // We don't create a point for the final
        // polygon coord, so we must set it to the first
        // coordinate instead
        const isFirstOrLastPolygonCoord =
          geometry.type === "Polygon" &&
          (i === geomCoordinates.length - 1 || i === 0);

        closestCoordinate.dist = distance;
        closestCoordinate.index = isFirstOrLastPolygonCoord ? 0 : i;
        closestCoordinate.isFirstOrLastPolygonCoord = isFirstOrLastPolygonCoord;
      }
    }

    // No coordinate was within the pointer distance
    if (closestCoordinate.index === -1) {
      return false;
    }

    // Store the updated coord
    const updatedCoordinate = [event.lng, event.lat];

    // We want to update the actual Polygon/LineString itself -
    // for Polygons we want the first and last coordinates to match
    if (closestCoordinate.isFirstOrLastPolygonCoord) {
      const lastCoordIndex = geomCoordinates.length - 1;
      geomCoordinates[0] = updatedCoordinate;
      geomCoordinates[lastCoordIndex] = updatedCoordinate;
    } else {
      geomCoordinates[closestCoordinate.index] = updatedCoordinate;
    }

    const updatedSelectionPoints = this.selectionPoints.getOneUpdated(
      closestCoordinate.index,
      updatedCoordinate
    );

    const updatedMidPoints = this.midPoints.getUpdated(geomCoordinates);

    // Apply all the updates
    this.store.updateGeometry([
      // Update feature
      {
        id: selectedId,
        geometry: geometry,
      },
      // Update selection and mid points
      updatedSelectionPoints,
      ...updatedMidPoints,
    ]);

    return true;
  }
}
