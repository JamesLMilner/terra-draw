import { Position } from "geojson";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "./project/web-mercator";
import { cartesianDistance } from "./measure/pixel-distance";
import { CartesianPoint } from "../common";

// nearestPointOnLine is adapted from the @turf/midpoint which is MIT Licensed
// https://github.com/Turfjs/turf/tree/master/packages/turf-nearest-point-on-line

/**
 * Takes two points and finds the closest point on the line between them to a third point.
 * @param lines
 * @param inputCoordinate
 * @returns
 */
export function webMercatorNearestPointOnLine(
	inputCoordinate: Position,
	lines: [Position, Position][],
):
	| {
			coordinate: Position;
			lineIndex: number;
			distance: number;
	  }
	| undefined {
	let closestPoint: Position = [Infinity, Infinity];
	let closestDistance = Infinity;
	let lineIndex = 0;

	for (let line of lines) {
		const startPosition: Position = line[0];
		const stopPosition: Position = line[1];

		// sectionLength
		let intersectPosition: Position;
		let intersectDistance: number = Infinity;

		const start = lngLatToWebMercatorXY(startPosition[0], startPosition[1]);
		const stop = lngLatToWebMercatorXY(stopPosition[0], stopPosition[1]);
		const source = lngLatToWebMercatorXY(
			inputCoordinate[0],
			inputCoordinate[1],
		);

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
			const { x, y } = findNearestPointOnLine(start, stop, source);

			const { lng, lat } = webMercatorXYToLngLat(x, y);
			intersectPosition = [lng, lat];
		}

		if (intersectPosition) {
			intersectDistance = cartesianDistance(
				source,
				lngLatToWebMercatorXY(intersectPosition[0], intersectPosition[1]),
			);

			if (intersectDistance < closestDistance) {
				closestPoint = intersectPosition;
				closestDistance = intersectDistance;
				lineIndex = lines.indexOf(line);
			}
		}
	}

	return closestDistance === Infinity
		? undefined
		: {
				coordinate: closestPoint,
				lineIndex: lineIndex,
				distance: closestDistance,
			};
}

/**
 * Finds the nearest Web Mercator coordinate on a line to a given coordinate.
 * @param pointA - The first point of the line (Web Mercator coordinate).
 * @param pointB - The second point of the line (Web Mercator coordinate).
 * @param target - The target point to which the nearest point on the line is calculated.
 * @returns The nearest Web Mercator coordinate on the line to the target.
 */
function findNearestPointOnLine(
	pointA: CartesianPoint,
	pointB: CartesianPoint,
	target: CartesianPoint,
): CartesianPoint {
	// Vector from pointA to pointB
	const lineVector = {
		x: pointB.x - pointA.x,
		y: pointB.y - pointA.y,
	};

	// Vector from pointA to the target point
	const targetVector = {
		x: target.x - pointA.x,
		y: target.y - pointA.y,
	};

	// Compute the dot product of the target vector with the line vector
	const dotProduct =
		targetVector.x * lineVector.x + targetVector.y * lineVector.y;

	// Compute the length squared of the line vector
	const lineLengthSquared =
		lineVector.x * lineVector.x + lineVector.y * lineVector.y;

	// Find the projection of the target vector onto the line vector
	const t = Math.max(0, Math.min(1, dotProduct / lineLengthSquared));

	// Compute the nearest point on the line
	const nearestPoint = {
		x: pointA.x + t * lineVector.x,
		y: pointA.y + t * lineVector.y,
	};

	return nearestPoint;
}
