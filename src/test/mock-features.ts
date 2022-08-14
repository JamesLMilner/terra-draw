import { Feature, LineString, Point, Polygon } from "geojson";

function createMockFeature<T extends Polygon | LineString | Point>(
  id: string,
  geometry: T
): Feature<T> {
  return {
    id: id ? id : "1",
    type: "Feature",
    properties: {},
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

  return createMockFeature(id, {
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
  return createMockFeature(id, {
    type: "Point",
    coordinates: [lng ? lng : 0, lat ? lat : 0],
  });
}

export function createMockLineString(id?: string): Feature<LineString> {
  return createMockFeature(id, {
    type: "LineString",
    coordinates: [
      [0, 0],
      [0, 1],
    ],
  });
}
