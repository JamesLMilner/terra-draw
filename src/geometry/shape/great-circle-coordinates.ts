import { Position } from "geojson";

function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
	return radians * (180 / Math.PI);
}

export function generateGreatCircleCoordinates(
	start: Position,
	end: Position,
	numberOfPoints: number,
): Position[] {
	const points: Position[] = [];

	const lat1 = toRadians(start[1]);
	const lon1 = toRadians(start[0]);
	const lat2 = toRadians(end[1]);
	const lon2 = toRadians(end[0]);

	numberOfPoints += 1;

	// Calculate the angular distance between the two points using the Haversine formula
	const d =
		2 *
		Math.asin(
			Math.sqrt(
				Math.sin((lat2 - lat1) / 2) ** 2 +
					Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
			),
		);

	if (d === 0 || isNaN(d)) {
		// Start and end coordinates are the same, or distance calculation failed, return empty array
		return points;
	}

	for (let i = 0; i <= numberOfPoints; i++) {
		const f = i / numberOfPoints; // Fraction of the total distance for the current point
		const A = Math.sin((1 - f) * d) / Math.sin(d); // Interpolation factor A
		const B = Math.sin(f * d) / Math.sin(d); // Interpolation factor B

		// Calculate the x, y, z coordinates of the intermediate point
		const x =
			A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
		const y =
			A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
		const z = A * Math.sin(lat1) + B * Math.sin(lat2);

		// Calculate the latitude and longitude of the intermediate point from the x, y, z coordinates
		if (isNaN(x) || isNaN(y) || isNaN(z)) {
			// Skip this point if any coordinate is NaN
			continue;
		}

		const lat = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2));
		const lon = Math.atan2(y, x);

		if (isNaN(lat) || isNaN(lon)) {
			// Skip this point if any coordinate is NaN
			continue;
		}

		points.push([toDegrees(lon), toDegrees(lat)]);
	}

	return points.slice(1, -1);
}
