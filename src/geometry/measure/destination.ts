import { Position } from "geojson";
import {
	degreesToRadians,
	lengthToRadians,
	radiansToDegrees,
} from "../helpers";

// Based on Turf.js destination module
// https://github.com/Turfjs/turf/blob/master/packages/turf-desination/index.ts

export function destination(
	origin: Position,
	distance: number,
	bearing: number,
): Position {
	const longitude1 = degreesToRadians(origin[0]);
	const latitude1 = degreesToRadians(origin[1]);
	const bearingRad = degreesToRadians(bearing);
	const radians = lengthToRadians(distance);

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
