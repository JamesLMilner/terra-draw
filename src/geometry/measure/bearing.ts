import { Position } from "geojson";
import { degreesToRadians, radiansToDegrees } from "../helpers";

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
