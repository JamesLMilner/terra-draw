import { getMidPointCoordinates } from "./get-midpoints";

describe("getMidPointCoordinates", () => {
	it("get midpoint coordinates", () => {
		const result = getMidPointCoordinates(
			[
				[0, 0],
				[0, 1],
				[1, 1],
				[0, 1],
				[0, 0],
			],
			9,
			(lng: number, lat: number) => {
				return { x: lng * 100, y: lat * 100 };
			},
			(x: number, y: number) => {
				return { lng: x / 100, lat: y / 100 };
			},
		);

		expect(result).toStrictEqual([
			[0, 0.5],
			[0.5, 1],
			[0.5, 1],
			[0, 0.5],
		]);
	});
});
