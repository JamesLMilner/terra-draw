import { Feature, LineString, Polygon, Position } from "geojson";
// import { centroid } from "../centroid";
import { rhumbBearing } from "../measure/rhumb-bearing";
import { rhumbDestination } from "../measure/rhumb-destination";
import { rhumbDistance } from "../measure/rhumb-distance";

// Based on turf-transform-scale: https://github.com/Turfjs/turf/tree/master/packages/turf-transform-scale

export function transformScale(
	feature: Feature<Polygon | LineString>,
	factor: number,
	origin: Position,
	axis: "x" | "y" | "xy" = "xy",
) {
	// Shortcut no-scaling
	if (factor === 1) {
		return feature;
	}

	const cooordinates =
		feature.geometry.type === "Polygon"
			? feature.geometry.coordinates[0]
			: feature.geometry.coordinates;

	cooordinates.forEach((pointCoords: Position) => {
		const originalDistance = rhumbDistance(origin, pointCoords);
		const bearing = rhumbBearing(origin, pointCoords);
		const newDistance = originalDistance * factor;
		const newCoord = rhumbDestination(origin, newDistance, bearing);

		if (axis === "x" || axis === "xy") {
			pointCoords[0] = newCoord[0];
		}

		if (axis === "y" || axis === "xy") {
			pointCoords[1] = newCoord[1];
		}
	});

	return feature;
}
