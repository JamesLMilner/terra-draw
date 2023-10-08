import { createLineString, createPolygon } from "../util/geoms";
import { centroid } from "./centroid";

describe("centroid", () => {
	it("returns centroid for a given Polygon", () => {
		const polygon = createPolygon([
			[
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
				[0, 0],
			],
		]);
		const result = centroid(polygon);
		expect(result).toStrictEqual([0.5, 0.5]);
	});

	it("returns centroid for a given LineString", () => {
		const linestring = createLineString([
			[0, 0],
			[0, 1],
			[1, 1],
			[1, 0],
		]);

		const result = centroid(linestring);
		expect(result).toStrictEqual([0.5, 0.5]);
	});
});
