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
import {
	transformRotate,
	transformRotateWebMercator,
} from "../../../geometry/transform/rotate";
import { centroid } from "../../../geometry/centroid";
import { rhumbBearing } from "../../../geometry/measure/rhumb-bearing";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { FeatureId, GeoJSONStoreFeatures } from "../../../store/store";
import { webMercatorCentroid } from "../../../geometry/web-mercator-centroid";
import { lngLatToWebMercatorXY } from "../../../geometry/project/web-mercator";
import { webMercatorBearing } from "../../../geometry/measure/bearing";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import {
	MutateFeatureBehavior,
	Mutations,
	UpdateGeometry,
} from "../../mutate-feature.behavior";

export class RotateFeatureBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
		private readonly coordinatePoints: CoordinatePointBehavior,
		private readonly readFeature: ReadFeatureBehavior,
		private readonly mutateFeature: MutateFeatureBehavior,
	) {
		super(config);
	}

	private lastBearing: number | undefined;
	private selectedGeometry: Polygon | LineString | undefined;
	private selectedGeometryCentroid: Position | undefined;
	private selectedGeometryWebMercatorCentroid: CartesianPoint | undefined;

	reset() {
		this.lastBearing = undefined;
		this.selectedGeometry = undefined;
		this.selectedGeometryWebMercatorCentroid = undefined;
		this.selectedGeometryCentroid = undefined;
	}

	rotate(
		event: TerraDrawMouseEvent,
		selectedId: FeatureId,
		updateType: UpdateTypes,
	) {
		if (!this.selectedGeometry) {
			this.selectedGeometry = this.readFeature.getGeometry<
				LineString | Polygon
			>(selectedId);
		}

		const geometry = this.selectedGeometry;

		// Update the geometry of the dragged feature
		if (geometry.type !== "Polygon" && geometry.type !== "LineString") {
			return;
		}

		const mouseCoord = [event.lng, event.lat];

		let bearing: number;
		const updatedFeature = { type: "Feature", geometry, properties: {} } as
			| Feature<Polygon>
			| Feature<LineString>;

		if (this.config.projection === "web-mercator") {
			// Cache the centroid of the selected geometry
			// to avoid recalculating it on every cursor move
			if (!this.selectedGeometryWebMercatorCentroid) {
				this.selectedGeometryWebMercatorCentroid =
					webMercatorCentroid(updatedFeature);
			}

			const cursorWebMercator = lngLatToWebMercatorXY(event.lng, event.lat);

			bearing = webMercatorBearing(
				this.selectedGeometryWebMercatorCentroid,
				cursorWebMercator,
			);

			if (bearing === 0) {
				return;
			}

			if (!this.lastBearing) {
				this.lastBearing = bearing;
				return;
			}

			const angle = this.lastBearing - bearing;

			transformRotateWebMercator(updatedFeature, -angle);
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

			bearing = rhumbBearing(this.selectedGeometryCentroid, mouseCoord);

			// We need an original bearing to compare against
			if (!this.lastBearing) {
				this.lastBearing = bearing + 180;
				return;
			}

			const angle = this.lastBearing - (bearing + 180);

			transformRotate(updatedFeature, -angle);
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

		const update = {
			featureId: selectedId,
			coordinateMutations: {
				type: Mutations.Replace,
				coordinates:
					geometry.type === "Polygon" ? [updatedCoords] : updatedCoords,
			},
			context: {
				updateType,
			},
		};

		let updated: GeoJSONStoreFeatures<Polygon | LineString> | null = null;
		if (updatedFeature.geometry.type === "Polygon") {
			updated = this.mutateFeature.updatePolygon(
				update as UpdateGeometry<Polygon>,
			);
		} else if (updatedFeature.geometry.type === "LineString") {
			updated = this.mutateFeature.updateLineString(
				update as UpdateGeometry<LineString>,
			);
		} else {
			return;
		}

		if (!updated) {
			return false;
		}

		const featureCoordinates = updated.geometry.coordinates;

		// Perform the update to the midpoints and selection points
		this.midPoints.updateAllInPlace({ featureCoordinates, updateType });
		this.selectionPoints.updateAllInPlace({ featureCoordinates, updateType });
		this.coordinatePoints.updateAllInPlace({
			featureId: selectedId,
			featureCoordinates,
			updateType,
		});

		if (this.projection === "web-mercator") {
			this.lastBearing = bearing;
		} else if (this.projection === "globe") {
			this.lastBearing = bearing + 180;
		}
	}
}
