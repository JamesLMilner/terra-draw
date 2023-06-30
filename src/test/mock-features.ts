import { Feature, LineString, Point, Polygon } from "geojson";

const mockUUID = "29da86c2-92e2-4095-a1b3-22103535ebfa";

function createMockFeature<T extends Polygon | LineString | Point>(
	id: string,
	geometry: T
): Feature<T> {
	return {
		id: id ? id : mockUUID,
		type: "Feature",
		properties: {
			mode: geometry.type.toLowerCase(),
		},
		geometry: geometry,
	};
}

export function createMockPolygonSquare(
	id?: string,
	squareStart?: number,
	squareEnd?: number
): Feature<Polygon> {
	squareStart = squareStart !== undefined ? squareStart : 0;
	squareEnd = squareEnd !== undefined ? squareEnd : 1;

	return createMockFeature(id || mockUUID, {
		type: "Polygon",
		coordinates: [
			[
				// 0, 0    0,1------1,1
				// 0, 1    |         |
				// 1, 1    |         |
				// 1, 0    |         |
				// 0, 0  . 0,0------1,0

				[squareStart, squareStart],
				[squareStart, squareEnd],
				[squareEnd, squareEnd],
				[squareEnd, squareStart],
				[squareStart, squareStart],
			],
		],
	});
}

export function createMockPoint(
	id?: string,
	lng?: number,
	lat?: number
): Feature<Point> {
	return createMockFeature(id || mockUUID, {
		type: "Point",
		coordinates: [lng ? lng : 0, lat ? lat : 0],
	});
}

export function createMockLineString(id?: string): Feature<LineString> {
	return createMockFeature(id || mockUUID, {
		type: "LineString",
		coordinates: [
			[0, 0],
			[0, 1],
		],
	});
}
