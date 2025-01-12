import { webMercatorNearestPointOnLine } from "./web-mercator-point-on-line";

describe("webMercatorNearestPointOnLine", () => {
	it("returns exact feature coordinate if source coordinate is that coordinate", () => {
		const result = webMercatorNearestPointOnLine(
			[0, 1],
			[
				[
					[0, 0],
					[0, 1],
				],
				[
					[0, 1],
					[1, 1],
				],
				[
					[1, 1],
					[1, 0],
				],
				[
					[1, 0],
					[0, 0],
				],
			],
		);

		expect(result?.coordinate).toEqual([0, 1]);
		expect(result?.distance).toEqual(0);
	});

	it("returns coordinate on line", () => {
		const result = webMercatorNearestPointOnLine(
			[0, 2],
			[
				[
					[0, 0],
					[0, 1],
				],
				[
					[0, 1],
					[1, 1],
				],
				[
					[1, 1],
					[1, 0],
				],
				[
					[1, 0],
					[0, 0],
				],
			],
		);

		expect(result?.coordinate[0]).toBeCloseTo(0);
		expect(result?.coordinate[1]).toBeCloseTo(1);

		expect(result?.distance).toBeCloseTo(111359.06563915969);
	});
});
