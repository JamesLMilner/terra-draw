import { Feature, Polygon, Position } from "geojson";
import { GeoJSONStoreFeatures } from "../terra-draw";
import { selfIntersects } from "../geometry/boolean/self-intersects";
import {
	coordinateIsValid,
	coordinatePrecisionIsValid,
} from "../geometry/boolean/is-valid-coordinate";
import { Validation } from "../common";

export const ValidationReasonFeatureNotPolygon = "Feature is not a Polygon";
export const ValidationReasonFeatureHasHoles = "Feature has holes";
export const ValidationReasonFeatureLessThanFourCoordinates =
	"Feature has less than 4 coordinates";
export const ValidationReasonFeatureHasInvalidCoordinates =
	"Feature has invalid coordinates";
export const ValidationReasonFeatureCoordinatesNotClosed =
	"Feature coordinates are not closed";
export const ValidationReasonFeatureInvalidCoordinatePrecision =
	"Feature has invalid coordinates with excessive coordinate precision";

export function ValidatePolygonFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): ReturnType<Validation> {
	if (feature.geometry.type !== "Polygon") {
		return {
			valid: false,
			reason: ValidationReasonFeatureNotPolygon,
		};
	}

	if (feature.geometry.coordinates.length !== 1) {
		return {
			valid: false,
			reason: ValidationReasonFeatureHasHoles,
		};
	}

	if (feature.geometry.coordinates[0].length < 4) {
		return {
			valid: false,
			reason: ValidationReasonFeatureLessThanFourCoordinates,
		};
	}

	if (
		!feature.geometry.coordinates[0].every((coordinate) =>
			coordinatePrecisionIsValid(coordinate, coordinatePrecision),
		)
	) {
		return {
			valid: false,
			reason: ValidationReasonFeatureInvalidCoordinatePrecision,
		};
	}

	if (
		!feature.geometry.coordinates[0].every((coordinate) =>
			coordinateIsValid(coordinate, coordinatePrecision),
		)
	) {
		return {
			valid: false,
			reason: ValidationReasonFeatureHasInvalidCoordinates,
		};
	}

	if (
		!coordinatesMatch(
			feature.geometry.coordinates[0][0],
			feature.geometry.coordinates[0][
				feature.geometry.coordinates[0].length - 1
			],
		)
	) {
		return {
			valid: false,
			reason: ValidationReasonFeatureCoordinatesNotClosed,
		};
	}

	return { valid: true };
}

export function ValidateNonIntersectingPolygonFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): ReturnType<Validation> {
	const validatePolygonFeature = ValidatePolygonFeature(
		feature,
		coordinatePrecision,
	);

	if (!validatePolygonFeature.valid) {
		return validatePolygonFeature;
	}

	if (selfIntersects(feature as Feature<Polygon>)) {
		return {
			valid: false,
			reason: "Feature intersects itself",
		};
	}

	return { valid: true };
}

/**
 * Check if two coordinates are identical
 * @param coordinateOne - coordinate to compare
 * @param coordinateTwo - coordinate to compare with
 * @returns boolean
 */
function coordinatesMatch(coordinateOne: Position, coordinateTwo: Position) {
	return (
		coordinateOne[0] === coordinateTwo[0] &&
		coordinateOne[1] === coordinateTwo[1]
	);
}
