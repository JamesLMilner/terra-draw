import { Feature, Polygon, Position } from "geojson";
import { GeoJSONStoreFeatures } from "../../terra-draw";
import { selfIntersects } from "./self-intersects";
import { coordinateIsValid } from "./is-valid-coordinate";

function coordinatesMatch(coordinateOne: Position, coordinateTwo: Position) {
	return (
		coordinateOne[0] === coordinateTwo[0] &&
		coordinateOne[1] === coordinateTwo[1]
	);
}

export function isValidPolygonFeature(
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

export function isValidNonIntersectingPolygonFeature(
	feature: GeoJSONStoreFeatures,
	coordinatePrecision: number,
): boolean {
	return (
		isValidPolygonFeature(feature, coordinatePrecision) &&
		!selfIntersects(feature as Feature<Polygon>)
	);
}
