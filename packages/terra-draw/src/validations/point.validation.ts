import { Validation } from "../common";
import { GeoJSONStoreFeatures } from "../terra-draw";
import {
	coordinateIsValid,
	coordinatePrecisionIsValid,
} from "../geometry/boolean/is-valid-coordinate";

export const ValidationReasonFeatureNotPoint = "Feature is not a Point";
export const ValidationReasonFeatureInvalidCoordinates =
	"Feature has invalid coordinates";
export const ValidationReasonFeatureInvalidCoordinatePrecision =
	"Feature has invalid coordinates with excessive coordinate precision";

export function ValidatePointFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): ReturnType<Validation> {
	if (feature.geometry.type !== "Point") {
		return {
			valid: false,
			reason: ValidationReasonFeatureNotPoint,
		};
	}

	if (
		!coordinatePrecisionIsValid(
			feature.geometry.coordinates,
			coordinatePrecision,
		)
	) {
		return {
			valid: false,
			reason: ValidationReasonFeatureInvalidCoordinatePrecision,
		};
	}

	if (!coordinateIsValid(feature.geometry.coordinates, coordinatePrecision)) {
		return {
			valid: false,
			reason: ValidationReasonFeatureInvalidCoordinates,
		};
	}

	return { valid: true };
}
