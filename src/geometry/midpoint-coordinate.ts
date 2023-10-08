import { Position } from "geojson";
import { limitPrecision } from "./limit-decimal-precision";
import { Project, Unproject } from "../common";

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
