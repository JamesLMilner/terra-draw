import { Position } from "geojson";
import {
	degreesToRadians,
	lengthToRadians,
	radiansToDegrees,
} from "../helpers";

// Adapted from @turf/destination module which is MIT Licensed
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

// Function to create a destination point in Web Mercator projection
export function webMercatorDestination(
	{ x, y }: { x: number; y: number },
	distance: number,
	bearing: number,
): { x: number; y: number } {
	// Convert origin to Web Mercator
	const bearingRad = degreesToRadians(bearing);

	// Calculate the destination coordinates
	const deltaX = distance * Math.cos(bearingRad);
	const deltaY = distance * Math.sin(bearingRad);

	const newX = x + deltaX;
	const newY = y + deltaY;

	return { x: newX, y: newY };
}
