import { Polygon } from "geojson";
import {
	createStoreLineString,
	createStorePoint,
	createStorePolygon,
} from "../test/create-store-features";
import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { ReadFeatureBehavior } from "./read-feature.behavior";

describe("ReadFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			new ReadFeatureBehavior(MockBehaviorConfig("test"));
		});
	});

	describe("api", () => {
		describe("coordinateAtIndexIsIdentical", () => {
			it("works for Polygon/LineString and throws for invalid Point index", () => {
				const config = MockBehaviorConfig("test");
				const behavior = new ReadFeatureBehavior(config);

				const polygonId = createStorePolygon(config); // [[0,0],[0,1],[1,1],[1,0],[0,0]]
				const lineId = createStoreLineString(config);
				const pointId = createStorePoint(config, [5, 5]);

				// Polygon
				expect(
					behavior.coordinateAtIndexIsIdentical({
						featureId: polygonId,
						index: 0,
						newCoordinate: [0, 0],
					}),
				).toBe(true);
				expect(
					behavior.coordinateAtIndexIsIdentical({
						featureId: polygonId,
						index: 1,
						newCoordinate: [0, 2],
					}),
				).toBe(false);

				// LineString
				expect(
					behavior.coordinateAtIndexIsIdentical({
						featureId: lineId,
						index: 0,
						newCoordinate: [0, 0],
					}),
				).toBe(true);
				expect(
					behavior.coordinateAtIndexIsIdentical({
						featureId: lineId,
						index: 1,
						newCoordinate: [0, 2],
					}),
				).toBe(false);

				// Point valid index
				expect(
					behavior.coordinateAtIndexIsIdentical({
						featureId: pointId,
						index: 0,
						newCoordinate: [5, 5],
					}),
				).toBe(true);

				// Point invalid index throws
				expect(() =>
					behavior.coordinateAtIndexIsIdentical({
						featureId: pointId,
						index: 1,
						newCoordinate: [0, 0],
					}),
				).toThrow("Point geometries only have one coordinate at index 0");
			});
		});

		describe("getGeometry", () => {
			it("returns a copy of the geometry", () => {
				const config = MockBehaviorConfig("test");
				const behavior = new ReadFeatureBehavior(config);

				const polygonId = createStorePolygon(config); // [[0,0],[0,1],[1,1],[1,0],[0,0]]

				const geometry = behavior.getGeometry<Polygon>(polygonId);

				expect(geometry).toEqual({
					type: "Polygon",
					coordinates: [
						[
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						],
					],
				});

				// Mutate the returned geometry
				geometry.coordinates[0][0] = [5, 5];

				// Fetch the geometry again and verify it has not changed in the store
				const geometry2 = behavior.getGeometry<Polygon>(polygonId);

				expect(geometry2).toEqual({
					type: "Polygon",
					coordinates: [
						[
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						],
					],
				});

				expect(geometry).not.toEqual(geometry2);
			});
		});

		describe("getCoordinates", () => {
			it("returns a copy of the coordinates for Polygon/LineString", () => {
				const config = MockBehaviorConfig("test");
				const behavior = new ReadFeatureBehavior(config);

				const polygonId = createStorePolygon(config); // [[0,0],[0,1],[1,1],[1,0],[0,0]]
				const lineId = createStoreLineString(config); // [[0,0],[0,1]]

				const polygonCoords = behavior.getCoordinates<Polygon>(polygonId);

				expect(polygonCoords).toEqual([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				// Mutate the returned coordinates
				polygonCoords[0] = [5, 5];

				// Fetch the coordinates again and verify it has not changed in the store
				const polygonCoords2 = behavior.getCoordinates<Polygon>(polygonId);

				expect(polygonCoords2).toEqual([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(polygonCoords).not.toEqual(polygonCoords2);

				const lineCoords = behavior.getCoordinates<any>(lineId);

				expect(lineCoords).toEqual([
					[0, 0],
					[0, 1],
				]);

				// Mutate the returned coordinates
				lineCoords[0] = [5, 5];

				// Fetch the coordinates again and verify it has not changed in the store
				const lineCoords2 = behavior.getCoordinates<any>(lineId);

				expect(lineCoords2).toEqual([
					[0, 0],
					[0, 1],
				]);

				expect(lineCoords).not.toEqual(lineCoords2);
			});
		});
	});
});
