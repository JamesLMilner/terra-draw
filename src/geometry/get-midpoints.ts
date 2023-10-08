import { Point, Position } from "geojson";
import { Project, Unproject } from "../common";
import { JSONObject } from "../store/store";
import { midpointCoordinate } from "./midpoint-coordinate";

export function getMidPointCoordinates(
	featureCoords: Position[],
	precision: number,
	project: Project,
	unproject: Unproject,
) {
	const midPointCoords: Position[] = [];
	for (let i = 0; i < featureCoords.length - 1; i++) {
		const mid = midpointCoordinate(
			featureCoords[i],
			featureCoords[i + 1],
			precision,
			project,
			unproject,
		);
		midPointCoords.push(mid);
	}
	return midPointCoords;
}

export function getMidPoints(
	selectedCoords: Position[],
	properties: (index: number) => JSONObject,
	precision: number,
	project: Project,
	unproject: Unproject,
) {
	return getMidPointCoordinates(
		selectedCoords,
		precision,
		project,
		unproject,
	).map((coord, i) => ({
		geometry: { type: "Point", coordinates: coord } as Point,
		properties: properties(i),
	}));
}
