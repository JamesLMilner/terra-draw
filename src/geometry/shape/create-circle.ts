import { Feature, Polygon, Position } from "geojson";
import {
	degreesToRadians,
	lengthToRadians,
	radiansToDegrees,
} from "../helpers";
import { limitPrecision } from "../limit-decimal-precision";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../project/web-mercator";

// Adapted from the @turf/circle module which is MIT Licensed
// https://github.com/Turfjs/turf/blob/master/packages/turf-circle/index.ts

function destination(
	origin: Position,
	distance: number,
	bearing: number,
): Position {
	const longitude1 = degreesToRadians(origin[0]);
	const latitude1 = degreesToRadians(origin[1]);
	const bearingRad = degreesToRadians(bearing);
	const radians = lengthToRadians(distance);

	// Main
	const latitude2 = Math.asin(
		Math.sin(latitude1) * Math.cos(radians) +
			Math.cos(latitude1) * Math.sin(radians) * Math.cos(bearingRad),
	);
	const longitude2 =
		longitude1 +
		Math.atan2(
			Math.sin(bearingRad) * Math.sin(radians) * Math.cos(latitude1),
			Math.cos(radians) - Math.sin(latitude1) * Math.sin(latitude2),
		);
	const lng = radiansToDegrees(longitude2);
	const lat = radiansToDegrees(latitude2);

	return [lng, lat];
}

export function circle(options: {
	center: Position;
	radiusKilometers: number;
	coordinatePrecision: number;
	steps?: number;
}): Feature<Polygon> {
	const { center, radiusKilometers, coordinatePrecision } = options;
	const steps = options.steps ? options.steps : 64;

	const coordinates: Position[] = [];
	for (let i = 0; i < steps; i++) {
		const circleCoordinate = destination(
			center,
			radiusKilometers,
			(i * -360) / steps,
		);

		coordinates.push([
			limitPrecision(circleCoordinate[0], coordinatePrecision),
			limitPrecision(circleCoordinate[1], coordinatePrecision),
		]);
	}
	coordinates.push(coordinates[0]);

	return {
		type: "Feature",
		geometry: { type: "Polygon", coordinates: [coordinates] },
		properties: {},
	};
}

export function circleWebMercator(options: {
	center: Position;
	radiusKilometers: number;
	coordinatePrecision: number;
	steps?: number;
}): GeoJSON.Feature<GeoJSON.Polygon> {
	const { center, radiusKilometers, coordinatePrecision } = options;
	const steps = options.steps ? options.steps : 64;

	const radiusMeters = radiusKilometers * 1000;

	const [lng, lat] = center;
	const { x, y } = lngLatToWebMercatorXY(lng, lat);

	const coordinates: Position[] = [];
	for (let i = 0; i < steps; i++) {
		const angle = (((i * 360) / steps) * Math.PI) / 180;
		const dx = radiusMeters * Math.cos(angle);
		const dy = radiusMeters * Math.sin(angle);
		const [wx, wy] = [x + dx, y + dy];
		const { lng, lat } = webMercatorXYToLngLat(wx, wy);
		coordinates.push([
			limitPrecision(lng, coordinatePrecision),
			limitPrecision(lat, coordinatePrecision),
		]);
	}

	// Close the circle by adding the first point at the end
	coordinates.push(coordinates[0]);

	return {
		type: "Feature",
		geometry: { type: "Polygon", coordinates: [coordinates] },
		properties: {},
	};
}
