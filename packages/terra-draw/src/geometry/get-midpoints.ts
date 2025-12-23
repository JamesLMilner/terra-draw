import { Position } from "geojson";
import { Project, Projection, Unproject } from "../common";
import {
	midpointCoordinate,
	geodesicMidpointCoordinate,
} from "./midpoint-coordinate";

export function getMidPointCoordinates({
	featureCoords,
	precision,
	unproject,
	project,
	projection,
}: {
	featureCoords: Position[];
	precision: number;
	project: Project;
	unproject: Unproject;
	projection: Projection;
}) {
	const midPointCoords: Position[] = [];
	for (let i = 0; i < featureCoords.length - 1; i++) {
		let mid;
		if (projection === "web-mercator") {
			mid = midpointCoordinate(
				featureCoords[i],
				featureCoords[i + 1],
				precision,
				project,
				unproject,
			);
		} else if (projection === "globe") {
			mid = geodesicMidpointCoordinate(
				featureCoords[i],
				featureCoords[i + 1],
				precision,
			);
		} else {
			throw new Error("Invalid projection");
		}

		midPointCoords.push(mid);
	}
	return midPointCoords;
}
