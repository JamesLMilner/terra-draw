import { Position } from "geojson";
import { degreesToRadians, radiansToDegrees } from "../helpers";

// Adapted from the @turf/bearing module which is MIT Licensed
// https://github.com/Turfjs/turf/tree/master/packages/turf-bearing

export function bearing(start: Position, end: Position): number {
	const lon1 = degreesToRadians(start[0]);
	const lon2 = degreesToRadians(end[0]);
	const lat1 = degreesToRadians(start[1]);
	const lat2 = degreesToRadians(end[1]);
	const a = Math.sin(lon2 - lon1) * Math.cos(lat2);
	const b =
		Math.cos(lat1) * Math.sin(lat2) -
		Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

	return radiansToDegrees(Math.atan2(a, b));
}

export function webMercatorBearing(
	{ x: x1, y: y1 }: { x: number; y: number },
	{ x: x2, y: y2 }: { x: number; y: number },
): number {
	const deltaX = x2 - x1;
	const deltaY = y2 - y1;

	// Calculate the angle in radians
	let angle = Math.atan2(deltaY, deltaX);

	// Convert the angle to degrees
	angle = angle * (180 / Math.PI);

	// Normalize to -180 to 180
	if (angle > 180) {
		angle -= 360;
	} else if (angle < -180) {
		angle += 360;
	}

	return angle;
}

export function normalizeBearing(bearing: number): number {
	return (bearing + 360) % 360;
}
