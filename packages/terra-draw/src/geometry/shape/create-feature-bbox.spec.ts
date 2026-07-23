import { bboxFromCoordinates, bboxPolygon } from "./create-feature-bbox";

describe("bboxFromCoordinates", () => {
	it("computes the bbox of a single ring (LineString coordinates)", () => {
		const result = bboxFromCoordinates([
			[0, 0],
			[10, 5],
			[3, 8],
		]);
		expect(result).toEqual([0, 0, 10, 8]);
	});

	it("computes the bbox of nested rings (Polygon coordinates)", () => {
		const result = bboxFromCoordinates([
			[
				[1, 1],
				[4, 1],
				[4, 6],
				[1, 6],
				[1, 1],
			],
		]);
		expect(result).toEqual([1, 1, 4, 6]);
	});

	it("handles negative coordinates", () => {
		const result = bboxFromCoordinates([
			[-10, -20],
			[-2, -3],
		]);
		expect(result).toEqual([-10, -20, -2, -3]);
	});

	it("handles a degenerate (zero-extent) horizontal line", () => {
		const result = bboxFromCoordinates([
			[0, 5],
			[10, 5],
		]);
		expect(result).toEqual([0, 5, 10, 5]);
	});
});

describe("bboxPolygon", () => {
	it("builds a closed ring ordered SW, SE, NE, NW", () => {
		const polygon = bboxPolygon([0, 0, 10, 8]);
		expect(polygon.geometry.type).toBe("Polygon");
		expect(polygon.geometry.coordinates).toEqual([
			[
				[0, 0],
				[10, 0],
				[10, 8],
				[0, 8],
				[0, 0],
			],
		]);
	});

	it("assigns provided properties", () => {
		const polygon = bboxPolygon([0, 0, 1, 1], { foo: "bar" });
		expect(polygon.properties).toEqual({ foo: "bar" });
	});

	it("defaults properties to an empty object", () => {
		const polygon = bboxPolygon([0, 0, 1, 1]);
		expect(polygon.properties).toEqual({});
	});
});
