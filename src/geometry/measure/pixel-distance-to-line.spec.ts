import { pixelDistanceToLine } from "./pixel-distance-to-line";

const checkApprox = (num1: number, num2: number, epsilon = 0.00001) => {
	// Calculating the absolute difference
	// and compare with epsilon
	return Math.abs(num1 - num2) < epsilon;
};

describe("Geometry", () => {
	describe("getPixelDistanceToLine", () => {
		it("point is start of line, distance should be zero", () => {
			const result = pixelDistanceToLine(
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
			);
			expect(result).toBe(0);
		});

		it("point is end line, distance should be zero", () => {
			const result = pixelDistanceToLine(
				{ x: 1, y: 1 },
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
			);
			expect(result).toBe(0);
		});

		it("point is middle of line, distance should be zero", () => {
			const result = pixelDistanceToLine(
				{ x: 0.5, y: 0.5 },
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
			);
			expect(result).toBe(0);
		});

		it("point is off from line by 1", () => {
			const result = pixelDistanceToLine(
				{ x: 1, y: 2 },
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
			);
			expect(result).toBe(1);
		});

		it("point is off from line diagonally", () => {
			const result = pixelDistanceToLine(
				{ x: 2, y: 2 },
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
			);
			expect(checkApprox(result, 1.4142135623730951)).toBe(true);
		});

		it("handles line of zero length", () => {
			const result = pixelDistanceToLine(
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
			);
			expect(result).toBe(0);
		});
	});
});
