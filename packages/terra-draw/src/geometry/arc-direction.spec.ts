import { getUpdatedArcDirection } from "./arc-direction";

describe("getUpdatedArcDirection", () => {
	it.each([
		["anticlockwise", 0, 20, -20, "clockwise"],
		["clockwise", 0, -20, 20, "anticlockwise"],
		["anticlockwise", 0, 170, -170, "anticlockwise"],
		["clockwise", 0, -170, 170, "clockwise"],
		["anticlockwise", 170, -170, 160, "clockwise"],
		["clockwise", -170, 170, -160, "anticlockwise"],
		["anticlockwise", 0, 20, 0, "anticlockwise"],
		["anticlockwise", 0, 0, -20, "clockwise"],
		["clockwise", 0, -20, 0, "clockwise"],
		["clockwise", 0, 0, 20, "anticlockwise"],
	] as const)(
		"updates %s sweep from %s through %s to %s as %s",
		(direction, start, previous, end, expected) => {
			expect(getUpdatedArcDirection(direction, start, previous, end)).toBe(
				expected,
			);
		},
	);
});
