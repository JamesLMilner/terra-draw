import { Feature, LineString, Polygon, Position } from "geojson";
import { centroid } from "../centroid";
import { rhumbBearing } from "../measure/rhumb-bearing";
import { rhumbDestination } from "../measure/rhumb-destination";
import { rhumbDistance } from "../measure/rhumb-distance";

// Based on turf-transform-rotate: https://github.com/Turfjs/turf/tree/master/packages/turf-transform-rotate

export function transformRotate(
	geojson: Feature<Polygon | LineString>,
	angle: number,
) {
	// Shortcut no-rotation
	if (angle === 0) {
		return geojson;
	}

	// Use centroid of GeoJSON if pivot is not provided
	const pivot = centroid(geojson);

	const cooordinates =
		geojson.geometry.type === "Polygon"
			? geojson.geometry.coordinates[0]
			: geojson.geometry.coordinates;

	cooordinates.forEach((pointCoords: Position) => {
		const initialAngle = rhumbBearing(pivot, pointCoords);
		const finalAngle = initialAngle + angle;
		const distance = rhumbDistance(pivot, pointCoords);
		const newCoords = rhumbDestination(pivot, distance, finalAngle);
		pointCoords[0] = newCoords[0];
		pointCoords[1] = newCoords[1];
	});

	return geojson;
}
