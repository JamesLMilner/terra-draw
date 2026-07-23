import { Position } from "geojson";
import { BBoxPolygon, JSON } from "../../store/store";

// Axis-aligned bounding box: [minX, minY, maxX, maxY]
export type BBox = [number, number, number, number];

// Axis-aligned bbox of a feature's coordinates (single ring or nested rings)
export function bboxFromCoordinates(
	coordinates: Position[] | Position[][],
): BBox {
	const isSingleRing = typeof coordinates[0]?.[0] === "number";
	const allPoints = isSingleRing
		? (coordinates as Position[])
		: (coordinates as Position[][]).flat();

	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;

	for (const [x, y] of allPoints) {
		if (x <= minX) minX = x;
		if (x >= maxX) maxX = x;
		if (y <= minY) minY = y;
		if (y >= maxY) maxY = y;
	}

	return [minX, minY, maxX, maxY];
}

// Closed Polygon from a bbox; ring ordered SW, SE, NE, NW so ring[0..3] are the corners
export function bboxPolygon(
	bbox: BBox,
	properties?: Record<string, JSON>,
): BBoxPolygon {
	const [minX, minY, maxX, maxY] = bbox;

	return {
		type: "Feature",
		properties: properties ?? {},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[minX, minY],
					[maxX, minY],
					[maxX, maxY],
					[minX, maxY],
					[minX, minY],
				],
			],
		},
	};
}
