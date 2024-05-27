import { GeoJSONStoreFeatures } from "../terra-draw";
import { coordinateIsValid } from "./../geometry/boolean/is-valid-coordinate";

export function ValidatePointFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): boolean {
	return (
		feature.geometry.type === "Point" &&
		coordinateIsValid(feature.geometry.coordinates, coordinatePrecision)
	);
}
