import { GeoJSONStoreFeatures } from "../terra-draw";
import { coordinateIsValid } from "./../geometry/boolean/is-valid-coordinate";

export function ValidateLineStringFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): boolean {
	return (
		feature.geometry.type === "LineString" &&
		feature.geometry.coordinates.length >= 2 &&
		feature.geometry.coordinates.every((coordinate) =>
			coordinateIsValid(coordinate, coordinatePrecision),
		)
	);
}
