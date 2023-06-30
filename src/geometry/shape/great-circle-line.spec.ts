import { greatCircleLine } from "./great-circle-line";

describe("Geometry", () => {
	describe("GreatCircleLine", () => {
		// TODO: Should this be the case?
		it("returns null if { start: [0, 0], end: [20, 20] }", () => {
			const result = greatCircleLine({ start: [0, 0], end: [20, 20] });
			expect(result).toEqual(null);
		});

		it("creates a new great circle linestring { start: [0.1, 0.1], end: [20, 20] }", () => {
			const result = greatCircleLine({ start: [0.1, 0.1], end: [20, 20] });
			expect(result).not.toEqual(null);
			expect(result?.geometry.coordinates.length).toBe(100);
		});

		it("creates a new great circle linestring { start: [0.1, 0.1], end: [20, 20] }", () => {
			expect(() => {
				greatCircleLine({ start: [], end: [20, 20] });
			}).toThrowError();

			expect(() => {
				greatCircleLine({ start: [20, 20], end: [] });
			}).toThrowError();
		});

		it("values over lng/lat limits return null", () => {
			const result = greatCircleLine({
				start: [-54.84375, 26.431228065],
				end: [-206.71875, 34.307143856],
			});
			expect(result).toEqual(null);
		});

		it("throws error for antipodal", () => {
			expect(() => {
				greatCircleLine({ start: [0, 0], end: [0, 180] });
			}).toThrowError();
		});

		it("throws error for NaN", () => {
			expect(() => {
				greatCircleLine({ start: [0, 0], end: [NaN, NaN] });
			}).toThrowError();
		});

		it("throws error for NaN", () => {
			expect(() => {
				greatCircleLine({ start: [0, 0], end: [1, 1], options: 1 as any });
			}).toThrowError();
		});

		it("handles number of points < 2", () => {
			const result = greatCircleLine({
				start: [0, 0],
				end: [1, 1],
				options: { numberOfPoints: 1 },
			});
			expect(result).toEqual(null);
		});
	});
});
