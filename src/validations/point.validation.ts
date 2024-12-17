import { Validation } from "../common";
import { GeoJSONStoreFeatures } from "../terra-draw";
import { coordinateIsValid } from "./../geometry/boolean/is-valid-coordinate";

export function ValidatePointFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): ReturnType<Validation> {
	if (feature.geometry.type !== "Point") {
		return {
			valid: false,
			reason: "Feature is not a Point",
		};
	}

	if (!coordinateIsValid(feature.geometry.coordinates, coordinatePrecision)) {
		return {
			valid: false,
			reason: "Feature has invalid coordinates",
		};
	}

	return { valid: true };
}
