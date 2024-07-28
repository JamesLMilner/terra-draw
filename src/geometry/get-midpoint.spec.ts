import { getMidPointCoordinates } from "./get-midpoints";

describe("getMidPointCoordinates", () => {
	it("get midpoint coordinates", () => {
		const result = getMidPointCoordinates({
			featureCoords: [
				[0, 0],
				[0, 1],
				[1, 1],
				[0, 1],
				[0, 0],
			],
			precision: 9,
			project: (lng: number, lat: number) => {
				return { x: lng * 100, y: lat * 100 };
			},
			unproject: (x: number, y: number) => {
				return { lng: x / 100, lat: y / 100 };
			},
			projection: "web-mercator",
		});

		expect(result).toStrictEqual([
			[0, 0.5],
			[0.5, 1],
			[0.5, 1],
			[0, 0.5],
		]);
	});
});
