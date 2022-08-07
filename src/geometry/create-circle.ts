import { Feature, Polygon, Position } from "geojson";

// Based on Turf.js Circl module
// https://github.com/Turfjs/turf/blob/master/packages/turf-circle/index.ts

function degreesToRadians(degrees: number): number {
  const radians = degrees % 360;
  return (radians * Math.PI) / 180;
}

function lengthToRadians(distance: number): number {
  const earthRadius = 6371008.8;
  const factor = earthRadius / 1000;
  return distance / factor;
}

function radiansToDegrees(radians: number): number {
  const degrees = radians % (2 * Math.PI);
  return (degrees * 180) / Math.PI;
}

function destination(
  origin: Position,
  distance: number,
  bearing: number
): Position {
  const longitude1 = degreesToRadians(origin[0]);
  const latitude1 = degreesToRadians(origin[1]);
  const bearingRad = degreesToRadians(bearing);
  const radians = lengthToRadians(distance);

  // Main
  const latitude2 = Math.asin(
    Math.sin(latitude1) * Math.cos(radians) +
      Math.cos(latitude1) * Math.sin(radians) * Math.cos(bearingRad)
  );
  const longitude2 =
    longitude1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(radians) * Math.cos(latitude1),
      Math.cos(radians) - Math.sin(latitude1) * Math.sin(latitude2)
    );
  const lng = radiansToDegrees(longitude2);
  const lat = radiansToDegrees(latitude2);

  return [lng, lat];
}

export function circle(options: {
  center: Position;
  radiusKilometers: number;
  steps?: number;
}): Feature<Polygon> {
  const { center, radiusKilometers } = options;
  const steps = options.steps ? options.steps : 64;

  const coordinates: Position[] = [];
  for (let i = 0; i < steps; i++) {
    coordinates.push(destination(center, radiusKilometers, (i * -360) / steps));
  }
  coordinates.push(coordinates[0]);

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coordinates] },
    properties: {},
  };
}
