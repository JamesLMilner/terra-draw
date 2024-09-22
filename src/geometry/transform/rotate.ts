import { Feature, LineString, Polygon, Position } from "geojson";
import { centroid } from "../centroid";
import { rhumbBearing } from "../measure/rhumb-bearing";
import { rhumbDestination } from "../measure/rhumb-destination";
import { rhumbDistance } from "../measure/rhumb-distance";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../project/web-mercator";

// Adapted on @turf/transform-rotate module which is MIT licensed
// https://github.com/Turfjs/turf/tree/master/packages/turf-transform-rotate

export function transformRotate(
	feature: Feature<Polygon | LineString>,
	angle: number,
) {
	// Shortcut no-rotation
	if (angle === 0 || angle === 360 || angle === -360) {
		return feature;
	}

	// Use centroid of GeoJSON if pivot is not provided
	const pivot = centroid(feature);

	const cooordinates =
		feature.geometry.type === "Polygon"
			? feature.geometry.coordinates[0]
			: feature.geometry.coordinates;

	cooordinates.forEach((pointCoords: Position) => {
		const initialAngle = rhumbBearing(pivot, pointCoords);
		const finalAngle = initialAngle + angle;
		const distance = rhumbDistance(pivot, pointCoords);
		const newCoords = rhumbDestination(pivot, distance, finalAngle);
		pointCoords[0] = newCoords[0];
		pointCoords[1] = newCoords[1];
	});

	return feature;
}

/**
 * Rotate a GeoJSON Polygon geometry in web mercator
 * @param polygon - GeoJSON Polygon geometry
 * @param angle - rotation angle in degrees
 * @returns - rotated GeoJSON Polygon geometry
 */
export const transformRotateWebMercator = (
	feature: Feature<Polygon> | Feature<LineString>,
	angle: number,
) => {
	if (angle === 0 || angle === 360 || angle === -360) {
		return feature;
	}

	const DEGREES_TO_RADIANS = 0.017453292519943295 as const; // Math.PI / 180

	const coordinates =
		feature.geometry.type === "Polygon"
			? feature.geometry.coordinates[0]
			: feature.geometry.coordinates;
	const angleRad = angle * DEGREES_TO_RADIANS;

	// Convert polygon coordinates to Web Mercator
	const webMercatorCoords = coordinates.map(([lng, lat]) =>
		lngLatToWebMercatorXY(lng, lat),
	);

	// Find centroid of the polygon in Web Mercator
	const centroid = webMercatorCoords.reduce(
		(acc: { x: number; y: number }, coord: { x: number; y: number }) => ({
			x: acc.x + coord.x,
			y: acc.y + coord.y,
		}),
		{ x: 0, y: 0 },
	);
	centroid.x /= webMercatorCoords.length;
	centroid.y /= webMercatorCoords.length;

	// Rotate the coordinates around the centroid
	const rotatedWebMercatorCoords = webMercatorCoords.map((coord) => ({
		x:
			centroid.x +
			(coord.x - centroid.x) * Math.cos(angleRad) -
			(coord.y - centroid.y) * Math.sin(angleRad),
		y:
			centroid.y +
			(coord.x - centroid.x) * Math.sin(angleRad) +
			(coord.y - centroid.y) * Math.cos(angleRad),
	}));

	// Convert rotated Web Mercator coordinates back to geographic
	const rotatedCoordinates = rotatedWebMercatorCoords.map(
		({ x, y }) =>
			[
				webMercatorXYToLngLat(x, y).lng,
				webMercatorXYToLngLat(x, y).lat,
			] as Position,
	);

	if (feature.geometry.type === "Polygon") {
		feature.geometry.coordinates[0] = rotatedCoordinates;
	} else {
		console.log("rotatedCoordinates linestring", rotatedCoordinates);
		feature.geometry.coordinates = rotatedCoordinates;
	}

	return feature;
};
