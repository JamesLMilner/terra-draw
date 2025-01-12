import { Feature, LineString, Polygon, Position } from "geojson";

// Adapter from the @turf/bearing which is MIT Licensed
// https://github.com/Turfjs/turf/tree/master/packages/turf-centroid

export function centroid(geojson: Feature<Polygon | LineString>): Position {
	let xSum = 0;
	let ySum = 0;
	let len = 0;

	const coordinates =
		geojson.geometry.type === "Polygon"
			? geojson.geometry.coordinates[0].slice(0, -1)
			: geojson.geometry.coordinates;

	coordinates.forEach((coord: Position) => {
		xSum += coord[0];
		ySum += coord[1];
		len++;
	}, true);

	return [xSum / len, ySum / len];
}
