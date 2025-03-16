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
	"Feature has coordinates with excessive precision";

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

	for (let i = 0; i < feature.geometry.coordinates.length; i++) {
		if (!coordinateIsValid(feature.geometry.coordinates[i])) {
			return {
				valid: false,
				reason: ValidationReasonFeatureInvalidCoordinates,
			};
		}

		if (
			!coordinatePrecisionIsValid(
				feature.geometry.coordinates[i],
				coordinatePrecision,
			)
		) {
			return {
				valid: false,
				reason: ValidationReasonFeatureInvalidCoordinatePrecision,
			};
		}
	}

	return { valid: true };
}
