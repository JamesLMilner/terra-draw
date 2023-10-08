import { haversineDistanceKilometers } from "./haversine-distance";

describe("Geometry", () => {
	describe("haversineDistance", () => {
		it("distance between two identical points is zero", () => {
			expect(haversineDistanceKilometers([0, 0], [0, 0]));
		});

		it("measures distance between two points", () => {
			expect(
				haversineDistanceKilometers([0.119, 52.205], [2.351, 48.857]),
			).toBe(404.27916398867916);
		});
	});
});
