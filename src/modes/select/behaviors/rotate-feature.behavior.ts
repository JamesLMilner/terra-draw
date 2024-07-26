import { TerraDrawMouseEvent, UpdateTypes, Validation } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { Feature, LineString, Polygon, Position } from "geojson";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import {
	transformRotate,
	transformRotateWebMercator,
} from "../../../geometry/transform/rotate";
import { centroid } from "../../../geometry/centroid";
import { rhumbBearing } from "../../../geometry/measure/rhumb-bearing";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { FeatureId } from "../../../store/store";
import { webMercatorCentroid } from "../../../geometry/web-mercator-centroid";
import { lngLatToWebMercatorXY } from "../../../geometry/project/web-mercator";
import { webMercatorBearing } from "../../../geometry/measure/bearing";

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

	rotate(
		event: TerraDrawMouseEvent,
		selectedId: FeatureId,
		validateFeature?: Validation,
	) {
		const geometry = this.store.getGeometryCopy<LineString | Polygon>(
			selectedId,
		);

		// Update the geometry of the dragged feature
		if (geometry.type !== "Polygon" && geometry.type !== "LineString") {
			return;
		}

		const mouseCoord = [event.lng, event.lat];

		let bearing: number;
		const feature = { type: "Feature", geometry, properties: {} } as
			| Feature<Polygon>
			| Feature<LineString>;

		if (this.config.projection === "web-mercator") {
			const centerWebMercator = webMercatorCentroid(feature);
			const cursorWebMercator = lngLatToWebMercatorXY(event.lng, event.lat);

			bearing = webMercatorBearing(centerWebMercator, cursorWebMercator);

			if (!this.lastBearing) {
				this.lastBearing = bearing;
				return;
			}

			const angle = this.lastBearing - bearing;
			// console.log(bearing);

			transformRotateWebMercator(feature, -angle);
		} else if (this.config.projection === "globe") {
			bearing = rhumbBearing(
				centroid({ type: "Feature", geometry, properties: {} }),
				mouseCoord,
			);

			// We need an original bearing to compare against
			if (!this.lastBearing) {
				this.lastBearing = bearing + 180;
				return;
			}

			const angle = this.lastBearing - (bearing + 180);

			transformRotate(feature, -angle);
		} else {
			throw new Error("Unsupported projection");
		}

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

		if (validateFeature) {
			if (
				!validateFeature(
					{
						id: selectedId,
						type: "Feature",
						geometry,
						properties: {},
					},
					{
						project: this.config.project,
						unproject: this.config.unproject,
						coordinatePrecision: this.config.coordinatePrecision,
						updateType: UpdateTypes.Provisional,
					},
				)
			) {
				return false;
			}
		}

		// Issue the update to the selected feature
		this.store.updateGeometry([
			{ id: selectedId, geometry },
			...updatedSelectionPoints,
			...updatedMidPoints,
		]);

		if (this.projection === "web-mercator") {
			this.lastBearing = bearing;
		} else if (this.projection === "globe") {
			this.lastBearing = bearing + 180;
		}
	}
}
