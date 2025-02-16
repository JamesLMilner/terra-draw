import { Polygon } from "geojson";

/**
 * Checks if a GeoJSON Polygon follows the right-hand rule.
 * @param polygon - The GeoJSON Polygon to check.
 * @returns {boolean} - True if the polygon follows the right-hand rule (counterclockwise outer ring), otherwise false.
 */
export function followsRightHandRule(polygon: Polygon): boolean {
	const outerRing = polygon.coordinates[0];

	let sum = 0;
	for (let i = 0; i < outerRing.length - 1; i++) {
		const [x1, y1] = outerRing[i];
		const [x2, y2] = outerRing[i + 1];
		sum += (x2 - x1) * (y2 + y1);
	}

	return sum < 0; // Right-hand rule: counterclockwise = negative area
}
