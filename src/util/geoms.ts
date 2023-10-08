import { Feature, LineString, Polygon, Position } from "geojson";

export function createPolygon(
	coordinates: Position[][] = [
		[
			[0, 0],
			[0, 1],
			[1, 1],
			[1, 0],
			[0, 0],
		],
	],
): Feature<Polygon> {
	return {
		type: "Feature",
		geometry: {
			type: "Polygon",
			coordinates,
		},
		properties: {},
	};
}

export function createLineString(coordinates: Position[]): Feature<LineString> {
	return {
		type: "Feature",
		geometry: {
			type: "LineString",
			coordinates,
		},
		properties: {},
	};
}
