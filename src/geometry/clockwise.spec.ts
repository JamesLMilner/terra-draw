import { isClockwiseWebMercator } from "./clockwise";

describe("isClockwiseWebMercator", () => {
	it("returns clockwise when coordinates are in clockwise position", () => {
		const result = isClockwiseWebMercator(
			{ x: 1, y: 1 },
			{ x: 1, y: 2 },
			{ x: 2, y: 1 },
		);

		// (0, 2) (1, 2) (2, 2)
		// (0, 1) (1, 1) (2, 1)
		// (0, 0) (1, 0) (2, 0)
		expect(result).toBe(true);
	});

	it("returns not clockwise when coordinates are in clockwise position", () => {
		const result = isClockwiseWebMercator(
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
			{ x: 1, y: 2 },
		);

		// (0, 2) (1, 2) (2, 2)
		// (0, 1) (1, 1) (2, 1)
		// (0, 0) (1, 0) (2, 0)
		expect(result).toBe(false);
	});

	it("returns clockwise when coordinates are identical", () => {
		const result = isClockwiseWebMercator(
			{ x: 1, y: 1 },
			{ x: 1, y: 2 },
			{ x: 1, y: 2 },
		);

		// (0, 2) (1, 2) (2, 2)
		// (0, 1) (1, 1) (2, 1)
		// (0, 0) (1, 0) (2, 0)
		expect(result).toBe(true);
	});
});
