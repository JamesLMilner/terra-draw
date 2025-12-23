import { Position } from "geojson";

export function isPolygonArray(
	coords: Position[] | Position[][],
): coords is Position[][] {
	return (
		Array.isArray(coords) &&
		coords.length > 0 &&
		Array.isArray(coords[0]) &&
		Array.isArray(coords[0][0])
	);
}

export const getUnclosedCoordinates = (
	featureCoordinates: Position[] | Position[][],
): Position[] => {
	const isPolygon = isPolygonArray(featureCoordinates);
	const coordinates = isPolygon
		? (featureCoordinates as Position[][])[0].slice(0, -1)
		: (featureCoordinates as Position[]);

	return coordinates;
};

export const getClosedCoordinates = (
	featureCoordinates: Position[] | Position[][],
): Position[] => {
	const isPolygon = isPolygonArray(featureCoordinates);
	const coordinates = isPolygon
		? (featureCoordinates as Position[][])[0]
		: (featureCoordinates as Position[]);

	return coordinates;
};
