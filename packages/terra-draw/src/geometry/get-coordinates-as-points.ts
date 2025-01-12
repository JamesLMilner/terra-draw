import { Point, Position } from "geojson";
import { JSONObject } from "../store/store";

export function getCoordinatesAsPoints(
	selectedCoords: Position[],
	geometryType: "Polygon" | "LineString",
	properties: (index: number) => JSONObject,
) {
	const selectionPoints = [];

	// We can skip the last point for polygons
	// as it's a duplicate of the first
	const length =
		geometryType === "Polygon"
			? selectedCoords.length - 1
			: selectedCoords.length;

	for (let i = 0; i < length; i++) {
		selectionPoints.push({
			geometry: {
				type: "Point",
				coordinates: selectedCoords[i],
			} as Point,
			properties: properties(i),
		});
	}

	return selectionPoints;
}
