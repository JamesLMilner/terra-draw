import { CartesianPoint } from "../common";

export function isClockwiseWebMercator(
	center: CartesianPoint,
	secondCoord: CartesianPoint,
	thirdCoord: CartesianPoint,
): boolean {
	// Calculate the vectors
	const vector1 = { x: secondCoord.x - center.x, y: secondCoord.y - center.y };
	const vector2 = { x: thirdCoord.x - center.x, y: thirdCoord.y - center.y };

	// Calculate the cross product
	const cross = vector1.x * vector2.y - vector1.y * vector2.x;

	// If the cross product is negative, the third point is on the right (clockwise)
	// If the cross product is positive, the third point is on the left (anticlockwise)
	return cross <= 0;
}
