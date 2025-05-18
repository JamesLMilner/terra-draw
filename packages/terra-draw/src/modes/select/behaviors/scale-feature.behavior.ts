import {
	CartesianPoint,
	TerraDrawMouseEvent,
	UpdateTypes,
	Validation,
} from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { Feature, LineString, Polygon, Position } from "geojson";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { centroid } from "../../../geometry/centroid";
import { haversineDistanceKilometers } from "../../../geometry/measure/haversine-distance";
import {
	transformScale,
	transformScaleWebMercator,
} from "../../../geometry/transform/scale";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { FeatureId } from "../../../store/store";
import { webMercatorCentroid } from "../../../geometry/web-mercator-centroid";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../../../geometry/project/web-mercator";
import { cartesianDistance } from "../../../geometry/measure/pixel-distance";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";

export class ScaleFeatureBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
		private readonly coordinatePoints: CoordinatePointBehavior,
	) {
		super(config);
	}

	private lastDistance: number | undefined;
	private selectedGeometryCentroid: Position | undefined;
	private selectedGeometryWebMercatorCentroid: CartesianPoint | undefined;

	reset() {
		this.lastDistance = undefined;
		this.selectedGeometryCentroid = undefined;
		this.selectedGeometryWebMercatorCentroid = undefined;
	}

	scale(
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

		const feature = { type: "Feature", geometry, properties: {} } as Feature<
			Polygon | LineString
		>;

		let distance;

		if (this.config.projection === "web-mercator") {
			if (!this.selectedGeometryWebMercatorCentroid) {
				this.selectedGeometryWebMercatorCentroid = webMercatorCentroid(feature);
			}

			const selectedWebMercator = lngLatToWebMercatorXY(event.lng, event.lat);
			distance = cartesianDistance(
				this.selectedGeometryWebMercatorCentroid,
				selectedWebMercator,
			);
		} else if (this.config.projection === "globe") {
			// Cache the centroid of the selected geometry
			// to avoid recalculating it on every cursor move
			if (!this.selectedGeometryCentroid) {
				this.selectedGeometryCentroid = centroid({
					type: "Feature",
					geometry,
					properties: {},
				});
			}

			distance = haversineDistanceKilometers(
				this.selectedGeometryCentroid,
				mouseCoord,
			);
		} else {
			throw new Error("Invalid projection");
		}

		// We need an original bearing to compare against
		if (!this.lastDistance) {
			this.lastDistance = distance;
			return;
		}

		const scale = 1 - (this.lastDistance - distance) / distance;

		if (this.config.projection === "web-mercator") {
			if (!this.selectedGeometryWebMercatorCentroid) {
				this.selectedGeometryWebMercatorCentroid = webMercatorCentroid(feature);
			}

			const { lng, lat } = webMercatorXYToLngLat(
				this.selectedGeometryWebMercatorCentroid.x,
				this.selectedGeometryWebMercatorCentroid.y,
			);
			transformScaleWebMercator(feature, scale, [lng, lat]);
		} else if (this.config.projection === "globe") {
			// Cache the centroid of the selected geometry
			// to avoid recalculating it on every cursor move
			if (!this.selectedGeometryCentroid) {
				this.selectedGeometryCentroid = centroid({
					type: "Feature",
					geometry,
					properties: {},
				});
			}

			transformScale(feature, scale, this.selectedGeometryCentroid);
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

		const updatedCoordinatePoints =
			this.coordinatePoints.getUpdated(selectedId, updatedCoords) || [];

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
			...updatedCoordinatePoints,
		]);

		this.lastDistance = distance;
	}
}
