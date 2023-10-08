import { Position } from "geojson";

export function coordinatesIdentical(
	coordinate: Position,
	coordinateTwo: Position,
) {
	return (
		coordinate[0] === coordinateTwo[0] && coordinate[1] === coordinateTwo[1]
	);
}
