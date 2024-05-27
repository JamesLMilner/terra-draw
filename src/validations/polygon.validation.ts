import { Feature, Polygon, Position } from "geojson";
import { GeoJSONStoreFeatures } from "../terra-draw";
import { selfIntersects } from "../geometry/boolean/self-intersects";
import { coordinateIsValid } from "./../geometry/boolean/is-valid-coordinate";

function coordinatesMatch(coordinateOne: Position, coordinateTwo: Position) {
	return (
		coordinateOne[0] === coordinateTwo[0] &&
		coordinateOne[1] === coordinateTwo[1]
	);
}

export function ValidatePolygonFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): boolean {
	return (
		feature.geometry.type === "Polygon" &&
		feature.geometry.coordinates.length === 1 && // No hole support
		feature.geometry.coordinates[0].length >= 4 &&
		feature.geometry.coordinates[0].every((coordinate) =>
			coordinateIsValid(coordinate, coordinatePrecision),
		) &&
		coordinatesMatch(
			feature.geometry.coordinates[0][0],
			feature.geometry.coordinates[0][
				feature.geometry.coordinates[0].length - 1
			],
		)
	);
}

export function ValidateNonIntersectingPolygonFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): boolean {
	return (
		ValidatePolygonFeature(feature, coordinatePrecision) &&
		!selfIntersects(feature as Feature<Polygon>)
	);
}
