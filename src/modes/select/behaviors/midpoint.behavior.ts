import { LineString, Point, Polygon, Position } from "geojson";
import {
  BehaviorConfig,
  TerraDrawModeBehavior,
} from "../../common/base.behavior";
import {
  getMidPointCoordinates,
  getMidPoints,
} from "../../../geometry/get-midpoints";
import { SelectionPointBehavior } from "./selection-point.behavior";

export class MidPointBehavior extends TerraDrawModeBehavior {
  constructor(
    config: BehaviorConfig,
    private readonly selectionPointBehavior: SelectionPointBehavior
  ) {
    super(config);
  }

  private _midPoints: string[] = [];

  get ids() {
    return this._midPoints.concat();
  }

  set ids(_: string[]) {}

  public insert(midPointId: string, coordinatePrecision: number) {
    const midPoint = this.store.getGeometryCopy(midPointId);
    const { midPointFeatureId, midPointSegment } = this.store.getPropertiesCopy(
      midPointId
    );
    const geometry = this.store.getGeometryCopy<Polygon | LineString>(
      midPointFeatureId as string
    );

    // Update the coordinates to include inserted midpoint
    const updatedCoordinates =
      geometry.type === "Polygon"
        ? geometry.coordinates[0]
        : geometry.coordinates;

    updatedCoordinates.splice(
      (midPointSegment as number) + 1,
      0,
      midPoint.coordinates as Position
    );

    // Update geometry coordinates depending
    // on if a polygon or linestring
    geometry.coordinates =
      geometry.type === "Polygon" ? [updatedCoordinates] : updatedCoordinates;

    // Update the selected features geometry to insert
    // the new midpoint
    this.store.updateGeometry([{ id: midPointFeatureId as string, geometry }]);

    // TODO: is there a way of just updating the selection points rather
    // than fully deleting / recreating?
    // Recreate the selection points

    this.store.delete([...this._midPoints, ...this.selectionPointBehavior.ids]);

    // We don't need to check if flags are correct
    // because selection points are prerequiste for midpoints
    this.create(
      updatedCoordinates,
      midPointFeatureId as string,
      coordinatePrecision
    );
    this.selectionPointBehavior.create(
      updatedCoordinates,
      geometry.type,
      midPointFeatureId as string
    );
  }

  public create(
    selectedCoords: Position[],
    featureId: string,
    coordinatePrecision: number
  ) {
    this._midPoints = this.store.create(
      getMidPoints(
        selectedCoords,
        (i) => ({
          mode: this.mode,
          midPoint: true,
          midPointSegment: i,
          midPointFeatureId: featureId,
        }),
        coordinatePrecision
      )
    );
  }

  public delete() {
    if (this._midPoints.length) {
      this.store.delete(this._midPoints);
      this._midPoints = [];
    }
  }

  public getUpdated(updatedCoords: Position[]) {
    return this._midPoints.length
      ? getMidPointCoordinates(updatedCoords, this.coordinatePrecision).map(
          (updatedMidPointCoord, i) => ({
            id: this._midPoints[i] as string,
            geometry: {
              type: "Point",
              coordinates: updatedMidPointCoord,
            } as Point,
          })
        )
      : [];
  }
}
