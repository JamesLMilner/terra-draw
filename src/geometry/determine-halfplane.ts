// Function to determine the relative position of a point to a line segment
export function determineHalfPlane(
	point: { x: number; y: number },
	lineStart: { x: number; y: number },
	lineEnd: { x: number; y: number },
): string {
	// Calculate the vectors
	const vectorLine = { x: lineEnd.x - lineStart.x, y: lineEnd.y - lineStart.y };
	const vectorPoint = { x: point.x - lineStart.x, y: point.y - lineStart.y };

	// Calculate the cross product
	const crossProduct =
		vectorLine.x * vectorPoint.y - vectorLine.y * vectorPoint.x;

	// Use a small epsilon value to handle floating-point precision errors
	const epsilon = 1e-10;

	if (crossProduct > epsilon) {
		return "left";
	} else if (crossProduct < -epsilon) {
		return "right";
	} else {
		// Technically on the line but we treat it as left
		return "left";
	}
}
