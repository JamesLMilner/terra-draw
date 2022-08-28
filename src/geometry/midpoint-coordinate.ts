import { Position } from "geojson";
import { degreesToRadians, destination } from "./create-circle";
import { haversineDistanceKilometers } from "./haversine-distance";
import { limitPrecision } from "./limit-decimal-precision";

function radiansToDegrees(radians: number): number {
  const degrees = radians % (2 * Math.PI);
  return (degrees * 180) / Math.PI;
}

function bearing(coordinates1: Position, coordinates2: Position) {
  const lon1 = degreesToRadians(coordinates1[0]);
  const lon2 = degreesToRadians(coordinates2[0]);
  const lat1 = degreesToRadians(coordinates1[1]);
  const lat2 = degreesToRadians(coordinates2[1]);
  const a = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const b =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  return radiansToDegrees(Math.atan2(a, b));
}

// Based on turf-midpoint: https://github.com/Turfjs/turf/tree/master/packages/turf-midpoint

export function midpointCoordinate(
  coordinates1: Position,
  coordinates2: Position,
  precision: number
) {
  const dist = haversineDistanceKilometers(coordinates1, coordinates2);
  const heading = bearing(coordinates1, coordinates2);
  const midpoint = destination(coordinates1, dist / 2, heading);

  return [
    limitPrecision(midpoint[0], precision),
    limitPrecision(midpoint[1], precision),
  ];
}
