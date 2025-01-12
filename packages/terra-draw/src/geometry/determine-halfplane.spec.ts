import { determineHalfPlane } from "./determine-halfplane";

describe("determineHalfPlane", () => {
	it('should return "left" when the point is on the left side of the line', () => {
		const point = { x: 0, y: 1 };
		const lineStart = { x: -1, y: 0 };
		const lineEnd = { x: 1, y: 0 };

		const result = determineHalfPlane(point, lineStart, lineEnd);

		expect(result).toBe("left");
	});

	it('should return "right" when the point is on the right side of the line', () => {
		const point = { x: 0, y: -1 };
		const lineStart = { x: -1, y: 0 };
		const lineEnd = { x: 1, y: 0 };

		const result = determineHalfPlane(point, lineStart, lineEnd);

		expect(result).toBe("right");
	});

	it('should return "left" when the point is exactly on the line', () => {
		const point = { x: 0, y: 0 };
		const lineStart = { x: -1, y: 0 };
		const lineEnd = { x: 1, y: 0 };

		const result = determineHalfPlane(point, lineStart, lineEnd);

		expect(result).toBe("left");
	});

	it('should return "left" when the point is at the start of the line', () => {
		const point = { x: -1, y: 0 };
		const lineStart = { x: -1, y: 0 };
		const lineEnd = { x: 1, y: 0 };

		const result = determineHalfPlane(point, lineStart, lineEnd);

		expect(result).toBe("left");
	});

	it('should return "left" when the point is at the end of the line', () => {
		const point = { x: 1, y: 0 };
		const lineStart = { x: -1, y: 0 };
		const lineEnd = { x: 1, y: 0 };

		const result = determineHalfPlane(point, lineStart, lineEnd);

		expect(result).toBe("left");
	});

	it("should handle floating-point precision issues", () => {
		const point = { x: 0.00000000001, y: 1 };
		const lineStart = { x: -1, y: 0 };
		const lineEnd = { x: 1, y: 0 };

		const result = determineHalfPlane(point, lineStart, lineEnd);

		expect(result).toBe("left");
	});
});
