import { ellipse, ellipseWebMercator } from "./create-ellipse";

describe("Geometry", () => {
	describe("ellipse", () => {
		it("generates a closed polygon with the requested number of steps", () => {
			const result = ellipse({
				center: [0, 0],
				xRadiusKilometers: 10,
				yRadiusKilometers: 5,
				coordinatePrecision: 9,
				steps: 16,
			});

			expect(result.geometry.coordinates[0]).toHaveLength(17);
			expect(result.geometry.coordinates[0][0]).toEqual(
				result.geometry.coordinates[0][16],
			);
		});

		it("uses separate x and y radii", () => {
			const result = ellipse({
				center: [0, 0],
				xRadiusKilometers: 10,
				yRadiusKilometers: 5,
				coordinatePrecision: 9,
				steps: 4,
			});

			expect(result.geometry.coordinates[0][0][1]).toBeGreaterThan(
				result.geometry.coordinates[0][2][1],
			);
			expect(result.geometry.coordinates[0][0][0]).toBeCloseTo(0, 5);
			expect(result.geometry.coordinates[0][2][0]).toBeCloseTo(0, 5);
		});
	});

	describe("ellipseWebMercator", () => {
		it("generates a closed polygon with valid coordinates", () => {
			const result = ellipseWebMercator({
				center: [0, 45],
				xRadiusKilometers: 10,
				yRadiusKilometers: 5,
				coordinatePrecision: 9,
				steps: 16,
			});
			const coordinates = result.geometry.coordinates[0];

			expect(coordinates).toHaveLength(17);
			expect(coordinates[0]).toEqual(coordinates[16]);
			coordinates.forEach(([longitude, latitude]) => {
				expect(longitude).toBeGreaterThanOrEqual(-180);
				expect(longitude).toBeLessThanOrEqual(180);
				expect(latitude).toBeGreaterThanOrEqual(-90);
				expect(latitude).toBeLessThanOrEqual(90);
			});
		});
	});
});
