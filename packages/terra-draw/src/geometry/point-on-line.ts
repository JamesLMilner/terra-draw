import { Feature, Point, Position, LineString } from "geojson";
import { degreesToRadians, radiansToDegrees } from "./helpers";
import { haversineDistanceKilometers } from "./measure/haversine-distance";

// nearestPointOnLine is adapted from the @turf/midpoint which is MIT Licensed
// https://github.com/Turfjs/turf/tree/master/packages/turf-nearest-point-on-line

export function nearestPointOnLine(
	inputCoordinate: Position,
	lines: [Position, Position][],
):
	| {
			coordinate: Position;
			distance: number;
	  }
	| undefined {
	let closestPoint: Position = [Infinity, Infinity];
	let closestDistance = Infinity;

	for (let line of lines) {
		const startPosition: Position = line[0];
		const stopPosition: Position = line[1];

		// sectionLength
		let intersectPosition: Position;
		let intersectDistance: number = Infinity;

		// Short circuit if snap point is start or end position of the line segment.
		if (
			startPosition[0] === inputCoordinate[0] &&
			startPosition[1] === inputCoordinate[1]
		) {
			intersectPosition = startPosition;
		} else if (
			stopPosition[0] === inputCoordinate[0] &&
			stopPosition[1] === inputCoordinate[1]
		) {
			intersectPosition = stopPosition;
		} else {
			// Otherwise, find the nearest point the hard way.
			[intersectPosition] = nearestPointOnSegment(
				startPosition,
				stopPosition,
				inputCoordinate,
			);
		}

		if (intersectPosition) {
			intersectDistance = haversineDistanceKilometers(
				inputCoordinate,
				intersectPosition,
			);

			if (intersectDistance < closestDistance) {
				closestPoint = intersectPosition;
				closestDistance = intersectDistance;
			}
		}
	}

	return closestDistance === Infinity
		? undefined
		: { coordinate: closestPoint, distance: closestDistance };
}

/*
 * Plan is to externalise these vector functions to a simple third party
 * library.
 * Possible candidate is @amandaghassaei/vector-math though having some import
 * issues.
 */
type Vector = [number, number, number];

function dot(v1: Vector, v2: Vector): number {
	const [v1x, v1y, v1z] = v1;
	const [v2x, v2y, v2z] = v2;
	return v1x * v2x + v1y * v2y + v1z * v2z;
}

// https://en.wikipedia.org/wiki/Cross_product
function cross(v1: Vector, v2: Vector): Vector {
	const [v1x, v1y, v1z] = v1;
	const [v2x, v2y, v2z] = v2;
	return [v1y * v2z - v1z * v2y, v1z * v2x - v1x * v2z, v1x * v2y - v1y * v2x];
}

function magnitude(v: Vector) {
	return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2) + Math.pow(v[2], 2));
}

function angle(v1: Vector, v2: Vector): number {
	const theta = dot(v1, v2) / (magnitude(v1) * magnitude(v2));
	return Math.acos(Math.min(Math.max(theta, -1), 1));
}

function lngLatToVector(a: Position): Vector {
	const lat = degreesToRadians(a[1]);
	const lng = degreesToRadians(a[0]);
	return [
		Math.cos(lat) * Math.cos(lng),
		Math.cos(lat) * Math.sin(lng),
		Math.sin(lat),
	];
}

function vectorToLngLat(v: Vector): Position {
	const [x, y, z] = v;
	const lat = radiansToDegrees(Math.asin(z));
	const lng = radiansToDegrees(Math.atan2(y, x));

	return [lng, lat];
}

function nearestPointOnSegment(
	posA: Position, // start point of segment to measure to
	posB: Position, // end point of segment to measure to
	posC: Position, // point to measure from
): [Position, boolean, boolean] {
	// Based heavily on this article on finding cross track distance to an arc:
	// https://gis.stackexchange.com/questions/209540/projecting-cross-track-distance-on-great-circle

	// Convert spherical (lng, lat) to cartesian vector coords (x, y, z)
	// In the below https://tikz.net/spherical_1/ we convert lng (𝜙) and lat (𝜃)
	// into vectors with x, y, and z components with a length (r) of 1.
	const A = lngLatToVector(posA); // the vector from 0,0,0 to posA
	const B = lngLatToVector(posB); // ... to posB
	const C = lngLatToVector(posC); // ... to posC

	// Components of target point.
	const [Cx, Cy, Cz] = C;

	// Calculate coefficients.
	const [D, E, F] = cross(A, B);
	const a = E * Cz - F * Cy;
	const b = F * Cx - D * Cz;
	const c = D * Cy - E * Cx;

	const f = c * E - b * F;
	const g = a * F - c * D;
	const h = b * D - a * E;

	const t = 1 / Math.sqrt(Math.pow(f, 2) + Math.pow(g, 2) + Math.pow(h, 2));

	// Vectors to the two points these great circles intersect.
	const I1: Vector = [f * t, g * t, h * t];
	const I2: Vector = [-1 * f * t, -1 * g * t, -1 * h * t];

	// Figure out which is the closest intersection to this segment of the great
	// circle.
	const angleAB = angle(A, B);
	const angleAI1 = angle(A, I1);
	const angleBI1 = angle(B, I1);
	const angleAI2 = angle(A, I2);
	const angleBI2 = angle(B, I2);

	let I: Vector;

	if (
		(angleAI1 < angleAI2 && angleAI1 < angleBI2) ||
		(angleBI1 < angleAI2 && angleBI1 < angleBI2)
	) {
		I = I1;
	} else {
		I = I2;
	}

	// I is the closest intersection to the segment, though might not actually be
	// ON the segment.

	// If angle AI or BI is greater than angleAB, I lies on the circle *beyond* A
	// and B so use the closest of A or B as the intersection
	if (angle(A, I) > angleAB || angle(B, I) > angleAB) {
		if (
			haversineDistanceKilometers(vectorToLngLat(I), vectorToLngLat(A)) <=
			haversineDistanceKilometers(vectorToLngLat(I), vectorToLngLat(B))
		) {
			return [vectorToLngLat(A), true, false];
		} else {
			return [vectorToLngLat(B), false, true];
		}
	}

	// As angleAI nor angleBI don't exceed angleAB, I is on the segment
	return [vectorToLngLat(I), false, false];
}
