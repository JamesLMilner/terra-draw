import { getCoordinatesAsPoints } from "./get-coordinates-as-points";

describe("getCoordinatesAsPoints", () => {
	it("returns coordinates as Points for a given Polygon", () => {
		const result = getCoordinatesAsPoints(
			[
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
				[0, 0],
			],
			"Polygon",
			() => {
				return {};
			},
		);
		expect(result.length).toStrictEqual(4);
		result.forEach((point) => {
			expect(point.geometry.type).toBe("Point");
		});
	});

	it("returns coordinates as Points for a given LineString", () => {
		const result = getCoordinatesAsPoints(
			[
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
			],
			"LineString",
			() => {
				return {};
			},
		);
		expect(result.length).toStrictEqual(4);
		result.forEach((point) => {
			expect(point.geometry.type).toBe("Point");
		});
	});
});
