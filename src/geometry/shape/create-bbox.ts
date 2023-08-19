import { Feature, Polygon } from "geojson";
import { Unproject } from "../../common";

export function createBBoxFromPoint({
	unproject,
	point,
	pointerDistance,
}: {
	point: {
		x: number;
		y: number;
	};
	unproject: Unproject;
	pointerDistance: number;
}) {
	const halfDist = pointerDistance / 2;
	const { x, y } = point;

	return {
		type: "Feature",
		properties: {},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					unproject(x - halfDist, y - halfDist), // TopLeft
					unproject(x + halfDist, y - halfDist), // TopRight
					unproject(x + halfDist, y + halfDist), // BottomRight
					unproject(x - halfDist, y + halfDist), // BottomLeft
					unproject(x - halfDist, y - halfDist), // TopLeft
				].map((c) => [c.lng, c.lat]),
			],
		},
	} as Feature<Polygon>;
}
