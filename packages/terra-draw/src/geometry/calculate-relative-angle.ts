import { CartesianPoint } from "../common";
import { webMercatorBearing } from "./measure/bearing";

/**
 * Calculate the relative angle between two lines
 * @param A The first point of the first line
 * @param B The second point of the first line and the first point of the second line
 * @param C The second point of the second line
 * @returns The relative angle between the two lines
 */
export function calculateRelativeAngle(
	A: CartesianPoint,
	B: CartesianPoint,
	C: CartesianPoint,
): number {
	const bearingAB = webMercatorBearing(A, B); // Bearing from A to B
	const bearingBC = webMercatorBearing(B, C); // Bearing from B to C

	// Calculate the relative angle (bearingBC relative to bearingAB)
	let relativeAngle = bearingBC - bearingAB;

	// Normalize the relative angle to 0-360 range
	if (relativeAngle < 0) {
		relativeAngle += 360;
	}

	// Normalise to 0 - 90
	const angle = relativeAngle - 90;

	return 180 - Math.abs(-90 + angle);
}
