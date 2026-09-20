import { normalizeBearing } from "./measure/bearing";

/** Preserve large arcs, reversing only when the sweep crosses back through zero. */
export function getUpdatedArcDirection(
	direction: "clockwise" | "anticlockwise",
	startBearing: number,
	previousEndBearing: number,
	endBearing: number,
): "clockwise" | "anticlockwise" {
	const sweep =
		direction === "anticlockwise"
			? normalizeBearing(previousEndBearing - startBearing)
			: -normalizeBearing(startBearing - previousEndBearing);
	// Treat each cursor movement as the shortest angular step, including across
	// the -180/180 bearing boundary.
	const step = normalizeBearing(endBearing - previousEndBearing + 180) - 180;
	const nextSweep = sweep + step;
	if (direction === "anticlockwise" && nextSweep < 0) return "clockwise";
	if (direction === "clockwise" && nextSweep > 0) return "anticlockwise";
	return direction;
}
