import { Feature, Polygon, Position } from "geojson";
import { GeoJSONStoreFeatures } from "../terra-draw";
import { selfIntersects } from "../geometry/boolean/self-intersects";
import { coordinateIsValid } from "./../geometry/boolean/is-valid-coordinate";
import { Validation } from "../common";

function coordinatesMatch(coordinateOne: Position, coordinateTwo: Position) {
	return (
		coordinateOne[0] === coordinateTwo[0] &&
		coordinateOne[1] === coordinateTwo[1]
	);
}

export function ValidatePolygonFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): ReturnType<Validation> {
	if (feature.geometry.type !== "Polygon") {
		return {
			valid: false,
			reason: "Feature is not a Polygon",
		};
	}

	if (feature.geometry.coordinates.length !== 1) {
		return {
			valid: false,
			reason: "Feature has holes",
		};
	}

	if (feature.geometry.coordinates[0].length < 4) {
		return {
			valid: false,
			reason: "Feature has less than 4 coordinates",
		};
	}

	if (
		!feature.geometry.coordinates[0].every((coordinate) =>
			coordinateIsValid(coordinate, coordinatePrecision),
		)
	) {
		return {
			valid: false,
			reason: "Feature has invalid coordinates",
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
			reason: "Feature coordinates are not closed",
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
