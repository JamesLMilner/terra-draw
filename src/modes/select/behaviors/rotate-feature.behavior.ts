import { TerraDrawMouseEvent } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { LineString, Polygon, Position } from "geojson";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { transformRotate } from "../../../geometry/transform/rotate";
import { centroid } from "../../../geometry/centroid";
import { rhumbBearing } from "../../../geometry/measure/rhumb-bearing";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { FeatureId } from "../../../store/store";

export class RotateFeatureBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
	) {
		super(config);
	}

	private lastBearing: number | undefined;

	reset() {
		this.lastBearing = undefined;
	}

	rotate(event: TerraDrawMouseEvent, selectedId: FeatureId) {
		const geometry = this.store.getGeometryCopy<LineString | Polygon>(
			selectedId,
		);

		// Update the geometry of the dragged feature
		if (geometry.type !== "Polygon" && geometry.type !== "LineString") {
			return;
		}

		const mouseCoord = [event.lng, event.lat];

		const bearing = rhumbBearing(
			centroid({ type: "Feature", geometry, properties: {} }),
			mouseCoord,
		);

		// We need an original bearing to compare against
		if (!this.lastBearing) {
			this.lastBearing = bearing + 180;
			return;
		}

		const angle = this.lastBearing - (bearing + 180);

		transformRotate({ type: "Feature", geometry, properties: {} }, -angle);

		// Coordinates are either polygon or linestring at this point
		const updatedCoords: Position[] =
			geometry.type === "Polygon"
				? geometry.coordinates[0]
				: geometry.coordinates;

		// Ensure that coordinate precision is maintained
		updatedCoords.forEach((coordinate) => {
			coordinate[0] = limitPrecision(coordinate[0], this.coordinatePrecision);
			coordinate[1] = limitPrecision(coordinate[1], this.coordinatePrecision);
		});

		const updatedMidPoints = this.midPoints.getUpdated(updatedCoords) || [];

		const updatedSelectionPoints =
			this.selectionPoints.getUpdated(updatedCoords) || [];

		// Issue the update to the selected feature
		this.store.updateGeometry([
			{ id: selectedId, geometry },
			...updatedSelectionPoints,
			...updatedMidPoints,
		]);

		this.lastBearing = bearing + 180;
	}
}
