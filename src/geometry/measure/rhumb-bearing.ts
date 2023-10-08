import { Position } from "geojson";
import { degreesToRadians, radiansToDegrees } from "../helpers";

// Based on Turf.js Rhumb Bearing module
// https://github.com/Turfjs/turf/blob/master/packages/turf-rhumb-bearing/index.ts

export function rhumbBearing(start: Position, end: Position): number {
	const from = start;
	const to = end;

	// φ => phi
	// Δλ => deltaLambda
	// Δψ => deltaPsi
	// θ => theta
	const phi1 = degreesToRadians(from[1]);
	const phi2 = degreesToRadians(to[1]);
	let deltaLambda = degreesToRadians(to[0] - from[0]);

	// if deltaLambdaon over 180° take shorter rhumb line across the anti-meridian:
	if (deltaLambda > Math.PI) {
		deltaLambda -= 2 * Math.PI;
	}
	if (deltaLambda < -Math.PI) {
		deltaLambda += 2 * Math.PI;
	}

	const deltaPsi = Math.log(
		Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4),
	);

	const theta = Math.atan2(deltaLambda, deltaPsi);

	const bear360 = (radiansToDegrees(theta) + 360) % 360;

	const bear180 = bear360 > 180 ? -(360 - bear360) : bear360;

	return bear180;
}
