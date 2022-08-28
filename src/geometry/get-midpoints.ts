import { Point, Position } from "geojson";
import { JSONObject } from "../store/store";
import { midpointCoordinate } from "./midpoint-coordinate";

export function getMidPointCoordinates(
  featureCoords: Position[],
  precision: number
) {
  const midPointCoords: Position[] = [];
  for (let i = 0; i < featureCoords.length - 1; i++) {
    const mid = midpointCoordinate(
      featureCoords[i],
      featureCoords[i + 1],
      precision
    );
    midPointCoords.push(mid);
  }
  return midPointCoords;
}

export function getMidPoints(
  selectedCoords: Position[],
  properties: (index: number) => JSONObject,
  precision: number
) {
  return getMidPointCoordinates(selectedCoords, precision).map((coord, i) => ({
    geometry: { type: "Point", coordinates: coord } as Point,
    properties: properties(i),
  }));
}
