import { calculateRelativeAngle } from "./calculate-relative-angle";

describe("calculateRelativeAngle", () => {
	it("should return 0 degrees for two collinear lines (same direction)", () => {
		const A = { x: 0, y: 0 };
		const B = { x: 1, y: 1 };
		const C = { x: 2, y: 2 };

		const result = calculateRelativeAngle(A, B, C);

		expect(result).toBe(0);
	});

	it("should return 180 degrees for lines in the opposite direction", () => {
		const B = { x: 0, y: 0 };
		const A = { x: 1, y: 1 };
		const C = { x: 2, y: 2 };

		const result = calculateRelativeAngle(A, B, C);

		expect(result).toBe(180);
	});

	it("should return 90 degrees for lines that are orthogonal (one side)", () => {
		const A = { x: 0, y: 0 };
		const B = { x: 0, y: 2 };
		const C = { x: 2, y: 2 };

		const result = calculateRelativeAngle(A, B, C);

		expect(result).toBe(90);
	});

	it("should return 135 degrees (180 - 45)", () => {
		const A = { x: 0, y: 1 };
		const B = { x: 0, y: 0 };
		const C = { x: 1, y: 1 };

		const result = calculateRelativeAngle(A, B, C);

		expect(result).toBe(135);
	});

	it("should return 45 degrees", () => {
		const A = { x: 0, y: 1 };
		const B = { x: 0, y: 0 };
		const C = { x: -1, y: -1 };

		const result = calculateRelativeAngle(A, B, C);

		expect(result).toBe(45);
	});
});
