import { GeoJSONStoreFeatures } from "../../terra-draw";
import { coordinateIsValid } from "./is-valid-coordinate";

export function isValidPoint(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): boolean {
	return (
		feature.geometry.type === "Point" &&
		coordinateIsValid(feature.geometry.coordinates, coordinatePrecision)
	);
}
