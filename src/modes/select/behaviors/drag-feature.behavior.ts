import { Project, TerraDrawMouseEvent, Unproject } from "../../../common";
import { GeoJSONStore } from "../../../store/store";
import {
  BehaviorConfig,
  TerraDrawModeBehavior,
} from "../../common/base.behavior";
import { FeaturesAtMouseEventBehavior } from "./features-at-mouse-event.behavior";
import { Position } from "geojson";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";

export class DragFeatureBehavior extends TerraDrawModeBehavior {
  constructor(
    config: BehaviorConfig,
    private readonly featuresAtMouseEvent: FeaturesAtMouseEventBehavior,
    private readonly selectionPoints: SelectionPointBehavior,
    private readonly midPoints: MidPointBehavior
  ) {
    super(config);
  }

  private dragPosition: Position | undefined;

  get position() {
    return this.dragPosition ? this.dragPosition.concat() : undefined;
  }

  set position(newPosition: undefined | Position) {
    if (newPosition === undefined) {
      this.dragPosition = undefined;
      return;
    }

    if (
      !Array.isArray(newPosition) ||
      newPosition.length !== 2 ||
      typeof newPosition[0] !== "number" ||
      typeof newPosition[1] !== "number"
    ) {
      throw new Error("Position must be [number, number] array");
    }

    this.dragPosition = newPosition.concat();
  }

  drag(event: TerraDrawMouseEvent, selectedId: string) {
    const hasSelection = true;
    const { clickedFeature } = this.featuresAtMouseEvent.find(
      event,

      hasSelection
    );

    // If the cursor is not over the selected
    // feature then we don't want to drag
    if (!clickedFeature || clickedFeature.id !== selectedId) {
      return;
    }

    const geometry = this.store.getGeometryCopy(selectedId);
    const mouseCoord = [event.lng, event.lat];

    // Update the geometry of the dragged feature
    if (geometry.type === "Polygon" || geometry.type === "LineString") {
      let updatedCoords: Position[];
      let upToCoord: number;
      if (geometry.type === "Polygon") {
        updatedCoords = geometry.coordinates[0];
        upToCoord = updatedCoords.length - 1;
      } else if (geometry.type === "LineString") {
        updatedCoords = geometry.coordinates;
        upToCoord = updatedCoords.length;
      }

      for (let i = 0; i < upToCoord; i++) {
        const coordinate = updatedCoords[i];
        const delta = [
          this.dragPosition[0] - mouseCoord[0],
          this.dragPosition[1] - mouseCoord[1],
        ];
        updatedCoords[i] = [coordinate[0] - delta[0], coordinate[1] - delta[1]];
      }

      // Set final coordinate identical to first
      // We only want to do this for polygons!
      if (geometry.type === "Polygon") {
        updatedCoords[updatedCoords.length - 1] = [
          updatedCoords[0][0],
          updatedCoords[0][1],
        ];
      }

      const updatedMidPoints = this.midPoints.getUpdated(updatedCoords);

      const updatedSelectionPoints = this.selectionPoints.getUpdated(
        updatedCoords
      );

      // Issue the update to the selected feature
      this.store.updateGeometry([
        { id: selectedId, geometry },
        ...updatedSelectionPoints,
        ...updatedMidPoints,
      ]);

      // Update mid point positions
    } else if (geometry.type === "Point") {
      // For mouse points we can simply move it
      // to the dragged position
      this.store.updateGeometry([
        {
          id: selectedId,
          geometry: {
            type: "Point",
            coordinates: mouseCoord,
          },
        },
      ]);
    }
  }
}
