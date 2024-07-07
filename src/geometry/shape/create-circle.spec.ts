import { haversineDistanceKilometers } from "../measure/haversine-distance";
import { circle, circleWebMercator } from "./create-circle";

describe("Geometry", () => {
	describe("circle", () => {
		it("should generate a GeoJSON Polygon Feature", () => {
			const result = circle({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
			});
			expect(result.type).toBe("Feature");
			expect(result.geometry.type).toBe("Polygon");
			expect(result.geometry.coordinates).toHaveLength(1);
		});

		it("should generate a closed polygon", () => {
			const result = circle({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
			});
			const coordinates = result.geometry.coordinates[0];
			expect(coordinates[0]).toEqual(coordinates[coordinates.length - 1]);
		});

		it("should generate the correct number of coordinates", () => {
			const points = 64;
			const result = circle({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
				steps: 64,
			});
			const coordinates = result.geometry.coordinates[0];
			// Including the closing point, so it should be coordinates + 1
			expect(coordinates).toHaveLength(points + 1);
		});

		it("should handle a small number of coordinates", () => {
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
				steps: 4,
			});
			const coordinates = result.geometry.coordinates[0];
			expect(coordinates).toHaveLength(4 + 1);
		});

		it("should handle a large number of coordinates", () => {
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
				steps: 360,
			});
			const coordinates = result.geometry.coordinates[0];
			expect(coordinates).toHaveLength(360 + 1);
		});

		it("should have coordinates within a valid range", () => {
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
				steps: 360,
			});
			const coordinates = result.geometry.coordinates[0];
			coordinates.forEach(([lon, lat]) => {
				expect(lon).toBeGreaterThanOrEqual(-180);
				expect(lon).toBeLessThanOrEqual(180);
				expect(lat).toBeGreaterThanOrEqual(-90);
				expect(lat).toBeLessThanOrEqual(90);
			});
		});

		it("should have approximately uniform distance between circle coordinates", () => {
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 10,
				coordinatePrecision: 9,
				steps: 360,
			});
			const coordinates = result.geometry.coordinates[0];
			const distances = [];
			for (let i = 0; i < coordinates.length - 1; i++) {
				distances.push(
					+haversineDistanceKilometers(
						coordinates[i],
						coordinates[i + 1],
					).toFixed(6),
				);
			}
			expect(
				distances.every((val, i, arr) => i === 0 || val === arr[i - 1]),
			).toBe(true);
		});
	});

	describe("circleWebMercator", () => {
		it("should generate a GeoJSON Polygon Feature", () => {
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
			});
			expect(result.type).toBe("Feature");
			expect(result.geometry.type).toBe("Polygon");
			expect(result.geometry.coordinates).toHaveLength(1);
		});

		it("should generate a closed polygon", () => {
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
			});
			const coordinates = result.geometry.coordinates[0];
			expect(coordinates[0]).toEqual(coordinates[coordinates.length - 1]);
		});

		it("should generate the correct number of coordinates", () => {
			const points = 64;
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
				steps: 64,
			});
			const coordinates = result.geometry.coordinates[0];
			// Including the closing point, so it should be coordinates + 1
			expect(coordinates).toHaveLength(points + 1);
		});

		it("should handle a small number of coordinates", () => {
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
				steps: 4,
			});
			const coordinates = result.geometry.coordinates[0];
			expect(coordinates).toHaveLength(4 + 1);
		});

		it("should handle a large number of coordinates", () => {
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
				steps: 360,
			});
			const coordinates = result.geometry.coordinates[0];
			expect(coordinates).toHaveLength(360 + 1);
		});

		it("should have coordinates within a valid range", () => {
			const result = circleWebMercator({
				center: [0, 0],
				radiusKilometers: 1,
				coordinatePrecision: 9,
				steps: 360,
			});
			const coordinates = result.geometry.coordinates[0];
			coordinates.forEach(([lon, lat]) => {
				expect(lon).toBeGreaterThanOrEqual(-180);
				expect(lon).toBeLessThanOrEqual(180);
				expect(lat).toBeGreaterThanOrEqual(-90);
				expect(lat).toBeLessThanOrEqual(90);
			});
		});

		it("should not have approximately uniform distance between circle coordinates due to mercator distortions", () => {
			const result = circle({
				center: [0, 0],
				radiusKilometers: 10,
				coordinatePrecision: 9,
				steps: 360,
			});
			const coordinates = result.geometry.coordinates[0];
			const distances = [];
			for (let i = 0; i < coordinates.length - 1; i++) {
				distances.push(
					+haversineDistanceKilometers(
						coordinates[i],
						coordinates[i + 1],
					).toFixed(6),
				);
			}
			expect(
				distances.every((val, i, arr) => i === 0 || val === arr[i - 1]),
			).toBe(false);
		});
	});
});
