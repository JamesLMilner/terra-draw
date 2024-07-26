import { Feature, LineString, Polygon, Position } from "geojson";
// import { centroid } from "../centroid";
import { rhumbBearing } from "../measure/rhumb-bearing";
import { rhumbDestination } from "../measure/rhumb-destination";
import { rhumbDistance } from "../measure/rhumb-distance";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../project/web-mercator";

// Based on turf-transform-scale: https://github.com/Turfjs/turf/tree/master/packages/turf-transform-scale

export function transformScale(
	feature: Feature<Polygon | LineString>,
	factor: number,
	origin: Position,
	axis: "x" | "y" | "xy" = "xy",
) {
	// Shortcut no-scaling
	if (factor === 1) {
		return feature;
	}

	const cooordinates =
		feature.geometry.type === "Polygon"
			? feature.geometry.coordinates[0]
			: feature.geometry.coordinates;

	cooordinates.forEach((pointCoords: Position) => {
		const originalDistance = rhumbDistance(origin, pointCoords);
		const bearing = rhumbBearing(origin, pointCoords);
		const newDistance = originalDistance * factor;
		const newCoord = rhumbDestination(origin, newDistance, bearing);

		if (axis === "x" || axis === "xy") {
			pointCoords[0] = newCoord[0];
		}

		if (axis === "y" || axis === "xy") {
			pointCoords[1] = newCoord[1];
		}
	});

	return feature;
}

/**
 * Scale a GeoJSON Polygon geometry in web mercator
 * @param polygon - GeoJSON Polygon geometry
 * @param scale - scaling factor
 * @returns - scaled GeoJSON Polygon geometry
 */
export function transformScaleWebMercator(
	feature: Feature<Polygon | LineString>,
	factor: number,
	origin: Position,
): Feature<Polygon | LineString> {
	if (factor === 1) {
		return feature;
	}

	const coordinates =
		feature.geometry.type === "Polygon"
			? feature.geometry.coordinates[0]
			: feature.geometry.coordinates;

	// Convert polygon coordinates to Web Mercator
	const webMercatorCoords = coordinates.map(([lng, lat]) =>
		lngLatToWebMercatorXY(lng, lat),
	);

	const originWebMercator = lngLatToWebMercatorXY(origin[0], origin[1]);

	// Scale the coordinates around the centroid
	const scaledWebMercatorCoords = webMercatorCoords.map((coord) => ({
		x: originWebMercator.x + (coord.x - originWebMercator.x) * factor,
		y: originWebMercator.y + (coord.y - originWebMercator.y) * factor,
	}));

	// Convert scaled Web Mercator coordinates back to geographic
	const scaledCoordinates = scaledWebMercatorCoords.map(({ x, y }) => [
		webMercatorXYToLngLat(x, y).lng,
		webMercatorXYToLngLat(x, y).lat,
	]);

	if (feature.geometry.type === "Polygon") {
		feature.geometry.coordinates[0] = scaledCoordinates;
	} else {
		feature.geometry.coordinates = scaledCoordinates;
	}

	return feature;
}
