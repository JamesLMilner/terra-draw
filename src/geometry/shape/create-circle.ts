import { Feature, Polygon, Position } from "geojson";
import {
	degreesToRadians,
	lengthToRadians,
	radiansToDegrees,
} from "../helpers";
import { limitPrecision } from "../limit-decimal-precision";

// Based on Turf.js Circle module
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
