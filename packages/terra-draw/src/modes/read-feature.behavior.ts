import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { FeatureId } from "../extend";
import { GeoJSONStoreGeometries } from "../store/store";
import { Position, Point } from "geojson";
import { coordinatesIdentical } from "../geometry/coordinates-identical";

export class ReadFeatureBehavior extends TerraDrawModeBehavior {
	constructor(config: BehaviorConfig) {
		super(config);
	}

	public coordinateAtIndexIsIdentical({
		featureId,
		newCoordinate,
		index,
	}: {
		featureId: FeatureId;
		newCoordinate: Position;
		index: number;
	}) {
		const geometry = this.store.getGeometryCopy(featureId);

		let coordinate;

		if (geometry.type === "Polygon") {
			coordinate = geometry.coordinates[0][index];
		} else if (geometry.type === "LineString") {
			coordinate = geometry.coordinates[index];
		} else {
			if (index !== 0) {
				throw new Error("Point geometries only have one coordinate at index 0");
			}
			coordinate = geometry.coordinates;
		}

		return coordinatesIdentical(newCoordinate, coordinate);
	}

	public getGeometry<G extends GeoJSONStoreGeometries>(featureId: FeatureId) {
		return this.store.getGeometryCopy<G>(featureId);
	}

	public getCoordinates<G extends Exclude<GeoJSONStoreGeometries, Point>>(
		featureId: FeatureId,
	) {
		const { type, coordinates } = this.store.getGeometryCopy<G>(featureId);
		return type === "Polygon" ? coordinates[0] : coordinates;
	}

	public getCoordinate<G extends Exclude<GeoJSONStoreGeometries, Point>>(
		featureId: FeatureId,
		index: number,
	) {
		const coords = this.getCoordinates<G>(featureId);
		const normalizedIndex = index < 0 ? coords.length + index : index;

		if (normalizedIndex < 0 || normalizedIndex >= coords.length) {
			throw new RangeError(
				`Index ${index} (normalized to ${normalizedIndex}) is out of bounds`,
			);
		}

		return coords[normalizedIndex];
	}
}
