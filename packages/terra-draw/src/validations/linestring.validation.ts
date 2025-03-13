import { Validation } from "../common";
import { GeoJSONStoreFeatures } from "../terra-draw";
import {
	coordinateIsValid,
	coordinatePrecisionIsValid,
} from "../geometry/boolean/is-valid-coordinate";

export const ValidationReasonFeatureIsNotALineString =
	"Feature is not a LineString";
export const ValidationReasonFeatureHasLessThanTwoCoordinates =
	"Feature has less than 2 coordinates";
export const ValidationReasonFeatureInvalidCoordinates =
	"Feature has invalid coordinates";
export const ValidationReasonFeatureInvalidCoordinatePrecision =
	"Feature has invalid coordinates with excessive coordinate precision";

export function ValidateLineStringFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): ReturnType<Validation> {
	if (feature.geometry.type !== "LineString") {
		return {
			valid: false,
			reason: ValidationReasonFeatureIsNotALineString,
		};
	}

	if (feature.geometry.coordinates.length < 2) {
		return {
			valid: false,
			reason: ValidationReasonFeatureHasLessThanTwoCoordinates,
		};
	}

	if (
		!feature.geometry.coordinates.every((coordinate) =>
			coordinatePrecisionIsValid(coordinate, coordinatePrecision),
		)
	) {
		return {
			valid: false,
			reason: ValidationReasonFeatureInvalidCoordinatePrecision,
		};
	}

	if (
		!feature.geometry.coordinates.every((coordinate) =>
			coordinateIsValid(coordinate, coordinatePrecision),
		)
	) {
		return {
			valid: false,
			reason: ValidationReasonFeatureInvalidCoordinates,
		};
	}

	return { valid: true };
}
