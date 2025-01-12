import { coordinateIsValid } from "../geometry/boolean/is-valid-coordinate";
import { coordinatesIdentical } from "../geometry/coordinates-identical";
import { haversineDistanceKilometers } from "../geometry/measure/haversine-distance";
import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { InsertCoordinatesBehavior } from "./insert-coordinates.behavior";

describe("InsertCoordinatesBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			new InsertCoordinatesBehavior(MockBehaviorConfig("test"));
		});
	});

	describe("api", () => {
		it("generateInsertionCoordinates", () => {
			const config = MockBehaviorConfig("test");

			const insertPointBehavior = new InsertCoordinatesBehavior(config);

			const thousandKms = insertPointBehavior.generateInsertionCoordinates(
				[0, 0],
				[90, 90],
				1000,
			);

			expect(thousandKms.length).toEqual(10);

			const seenCoordinatesOne = new Set();
			thousandKms.forEach((coordinate) => {
				expect(coordinateIsValid(coordinate, config.coordinatePrecision)).toBe(
					true,
				);
				expect(seenCoordinatesOne.has(coordinate.toString)).toBe(false);
				seenCoordinatesOne.add(coordinate.toString());

				expect(coordinatesIdentical(coordinate, [0, 0])).toBe(false);
				expect(coordinatesIdentical(coordinate, [90, 90])).toBe(false);
			});

			expect(
				haversineDistanceKilometers(
					thousandKms[0],
					thousandKms[thousandKms.length - 1],
				),
			).toBeGreaterThan(
				haversineDistanceKilometers(
					thousandKms[1],
					thousandKms[thousandKms.length - 2],
				),
			);

			const hundredKms = insertPointBehavior.generateInsertionCoordinates(
				[0, 0],
				[90, 90],
				100,
			);

			expect(hundredKms.length).toEqual(100);

			const seenCoordinatesTwo = new Set();
			hundredKms.forEach((coordinate) => {
				expect(coordinateIsValid(coordinate, config.coordinatePrecision)).toBe(
					true,
				);
				expect(seenCoordinatesTwo.has(coordinate.toString)).toBe(false);
				seenCoordinatesTwo.add(coordinate.toString());

				expect(coordinatesIdentical(coordinate, [0, 0])).toBe(false);
				expect(coordinatesIdentical(coordinate, [90, 90])).toBe(false);
			});

			expect(
				haversineDistanceKilometers(
					hundredKms[0],
					hundredKms[hundredKms.length - 1],
				),
			).toBeGreaterThan(
				haversineDistanceKilometers(
					hundredKms[1],
					hundredKms[hundredKms.length - 2],
				),
			);
		});

		it("generateInsertionGeodesicCoordinates", () => {
			const config = MockBehaviorConfig("test");

			const insertPointBehavior = new InsertCoordinatesBehavior(config);

			const thousandKms =
				insertPointBehavior.generateInsertionGeodesicCoordinates(
					[0, 0],
					[90, 90],
					1000,
				);

			expect(thousandKms.length).toEqual(10);

			const seenCoordinatesOne = new Set();
			thousandKms.forEach((coordinate) => {
				expect(coordinateIsValid(coordinate, config.coordinatePrecision)).toBe(
					true,
				);
				expect(seenCoordinatesOne.has(coordinate.toString)).toBe(false);
				seenCoordinatesOne.add(coordinate.toString());

				expect(coordinatesIdentical(coordinate, [0, 0])).toBe(false);
				expect(coordinatesIdentical(coordinate, [90, 90])).toBe(false);
			});

			expect(
				haversineDistanceKilometers(
					thousandKms[0],
					thousandKms[thousandKms.length - 1],
				),
			).toBeGreaterThan(
				haversineDistanceKilometers(
					thousandKms[1],
					thousandKms[thousandKms.length - 2],
				),
			);

			const hundredKms =
				insertPointBehavior.generateInsertionGeodesicCoordinates(
					[0, 0],
					[90, 90],
					100,
				);

			expect(hundredKms.length).toEqual(100);

			const seenCoordinatesTwo = new Set();
			hundredKms.forEach((coordinate) => {
				expect(coordinateIsValid(coordinate, config.coordinatePrecision)).toBe(
					true,
				);
				expect(seenCoordinatesTwo.has(coordinate.toString)).toBe(false);
				seenCoordinatesOne.add(coordinate.toString());

				expect(coordinatesIdentical(coordinate, [0, 0])).toBe(false);
				expect(coordinatesIdentical(coordinate, [90, 90])).toBe(false);
			});
			expect(
				haversineDistanceKilometers(
					hundredKms[0],
					hundredKms[hundredKms.length - 1],
				),
			).toBeGreaterThan(
				haversineDistanceKilometers(
					hundredKms[1],
					hundredKms[thousandKms.length - 2],
				),
			);
		});
	});
});
