import { Position } from "geojson";
import { limitPrecision } from "./limit-decimal-precision";
import { Project, Unproject } from "../common";
import { haversineDistanceKilometers } from "./measure/haversine-distance";
import { rhumbBearing } from "./measure/rhumb-bearing";
import { rhumbDestination } from "./measure/rhumb-destination";

export function midpointCoordinate(
	coordinates1: Position,
	coordinates2: Position,
	precision: number,
	project: Project,
	unproject: Unproject,
) {
	const projectedCoordinateOne = project(coordinates1[0], coordinates1[1]);
	const projectedCoordinateTwo = project(coordinates2[0], coordinates2[1]);

	const { lng, lat } = unproject(
		(projectedCoordinateOne.x + projectedCoordinateTwo.x) / 2,
		(projectedCoordinateOne.y + projectedCoordinateTwo.y) / 2,
	);

	return [limitPrecision(lng, precision), limitPrecision(lat, precision)];
}

/* Get the geodesic midpoint coordinate between two coordinates */
export function geodesicMidpointCoordinate(
	coordinates1: Position,
	coordinates2: Position,
	precision: number,
) {
	const dist = haversineDistanceKilometers(coordinates1, coordinates2) * 1000;
	const heading = rhumbBearing(coordinates1, coordinates2);
	const midpoint = rhumbDestination(coordinates1, dist / 2, heading);
	return [
		limitPrecision(midpoint[0], precision),
		limitPrecision(midpoint[1], precision),
	];
}
