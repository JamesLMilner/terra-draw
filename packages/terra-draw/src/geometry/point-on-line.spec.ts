import { nearestPointOnLine } from "./point-on-line";

describe("nearestPointOnLine", () => {
	it("returns exact feature coordinate if source coordinate is that coordinate", () => {
		const result = nearestPointOnLine(
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
		const result = nearestPointOnLine(
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

		expect(result?.distance).toBeCloseTo(111.19492664455873);
	});
});
