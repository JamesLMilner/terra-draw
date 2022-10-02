import { LineString, Point, Polygon, Position } from "geojson";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { getCoordinatesAsPoints } from "../../../geometry/get-coordinates-as-points";

export class SelectionPointBehavior extends TerraDrawModeBehavior {
    constructor(config: BehaviorConfig) {
        super(config);
    }

    private _selectionPoints: string[] = [];

    get ids() {
        return this._selectionPoints.concat();
    }

    set ids(_: string[]) {}

    public create(
        selectedCoords: Position[],
        type: Polygon["type"] | LineString["type"],
        featureId: string
    ) {
        this._selectionPoints = this.store.create(
            getCoordinatesAsPoints(selectedCoords, type, (i) => ({
                mode: this.mode,
                selectionPoint: true,
                selectionPointFeatureId: featureId,
                index: i,
            }))
        );
    }

    public delete() {
        if (this.ids.length) {
            this.store.delete(this.ids);
            this._selectionPoints = [];
        }
    }

    public getUpdated(updatedCoordinates: Position[]) {
        if (this._selectionPoints.length === 0) {
            return undefined;
        }

        return this._selectionPoints.map((id, i) => {
            return {
                id,
                geometry: {
                    type: "Point",
                    coordinates: updatedCoordinates[i],
                } as Point,
            };
        });
    }

    public getOneUpdated(index: number, updatedCoordinate: Position) {
        if (this._selectionPoints[index] === undefined) {
            return undefined;
        }

        return {
            id: this._selectionPoints[index] as string,
            geometry: {
                type: "Point",
                coordinates: updatedCoordinate,
            } as Point,
        };
    }
}
