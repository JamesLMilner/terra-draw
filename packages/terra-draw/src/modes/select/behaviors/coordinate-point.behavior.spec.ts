import { Feature, Position } from "geojson";
import { COMMON_PROPERTIES } from "../../../common";
import { GeoJSONStoreFeatures, JSONObject } from "../../../store/store";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MockPolygonSquare } from "../../../test/mock-features";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import { BehaviorConfig } from "../../base.behavior";

describe("CoordinatePointBehavior", () => {
	const UUIDV4 = new RegExp(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);

	const isUUIDV4 = (received: string) => UUIDV4.test(received);

	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			new CoordinatePointBehavior(
				config,
				new ReadFeatureBehavior(config),
				new MutateFeatureBehavior(config, {
					validate: jest.fn(() => ({ valid: true })),
				}),
			);
		});
	});

	describe("api", () => {
		let config: BehaviorConfig;
		let coordinatePointBehavior: CoordinatePointBehavior;

		beforeEach(() => {
			config = MockBehaviorConfig("test");
			coordinatePointBehavior = new CoordinatePointBehavior(
				config,
				new ReadFeatureBehavior(config),
				new MutateFeatureBehavior(config, {
					validate: jest.fn(() => ({ valid: true })),
				}),
			);
		});

		it("createOrUpdate", () => {
			jest.spyOn(config.store, "create");

			const mockPolygon = MockPolygonSquare();
			const [featureId] = config.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			expect(config.store.has(featureId)).toBe(true);
			coordinatePointBehavior.createOrUpdate({
				featureId,
				featureCoordinates: mockPolygon.geometry.coordinates,
			});

			const properties = config.store.getPropertiesCopy(featureId);
			expect(properties).toBeDefined();

			const coordinatePointIds = properties.coordinatePointIds as string[];
			expect(coordinatePointIds.length).toBe(4);
			expect(coordinatePointIds.every(isUUIDV4)).toBe(true);

			expect(config.store.create).toHaveBeenCalledTimes(2);

			// Ensure all coordinate points are created
			const coordinatePoints = config.store.copyAllWhere((properties) =>
				Boolean(properties[COMMON_PROPERTIES.COORDINATE_POINT]),
			);

			expect(coordinatePoints.length).toBe(4);
			expect(
				coordinatePoints.every((point) => point.geometry.type === "Point"),
			).toBe(true);
			expect(
				coordinatePoints.every(
					(point) =>
						point.properties[COMMON_PROPERTIES.COORDINATE_POINT_FEATURE_ID] ===
						featureId,
				),
			).toBe(true);
		});

		it("createOrUpdate creates new points if previous ones have been deleted", () => {
			const mockPolygon = MockPolygonSquare();
			const [featureId] = config.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			expect(config.store.has(featureId)).toBe(true);
			coordinatePointBehavior.createOrUpdate({
				featureId,
				featureCoordinates: mockPolygon.geometry.coordinates,
			});

			const properties = config.store.getPropertiesCopy(featureId);
			const coordinatePointIds = properties.coordinatePointIds as string[];

			config.store.delete(coordinatePointIds);

			coordinatePointBehavior.createOrUpdate({
				featureId,
				featureCoordinates: mockPolygon.geometry.coordinates,
			});
			const propertiesAfterDelete = config.store.getPropertiesCopy(featureId);
			const coordinatePointIdsAfterDelete =
				propertiesAfterDelete.coordinatePointIds as string[];
			expect(coordinatePointIdsAfterDelete.length).toBe(4);
			expect(coordinatePointIdsAfterDelete.every(isUUIDV4)).toBe(true);

			// Ensure they have changed
			expect(coordinatePointIdsAfterDelete).not.toEqual(coordinatePointIds);

			// Ensure all coordinate points are created
			const coordinatePoints = config.store.copyAllWhere((properties) =>
				Boolean(properties[COMMON_PROPERTIES.COORDINATE_POINT]),
			);

			expect(coordinatePoints.length).toBe(4);
			expect(
				coordinatePoints.every((point) => point.geometry.type === "Point"),
			).toBe(true);
			expect(
				coordinatePoints.every(
					(point) =>
						point.properties[COMMON_PROPERTIES.COORDINATE_POINT_FEATURE_ID] ===
						featureId,
				),
			).toBe(true);
		});

		it("createOrUpdate updates current points", () => {
			const mockPolygon = MockPolygonSquare();
			const [featureId] = config.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			const featureCoordinates = [
				[0, 0],
				[0, 1],
				[1, 0],
				[1, 1],
			] as Position[];

			expect(config.store.has(featureId)).toBe(true);
			coordinatePointBehavior.createOrUpdate({ featureId, featureCoordinates });

			const properties = config.store.getPropertiesCopy(featureId);
			expect(properties).toBeDefined();

			const coordinatePointIds = properties.coordinatePointIds as string[];
			expect(coordinatePointIds.length).toBe(4);
			expect(coordinatePointIds.every(isUUIDV4)).toBe(true);

			const featureCoordinatesUpdated = [
				[0, 0],
				[0, 2],
				[2, 0],
				[2, 2],
			] as Position[];

			coordinatePointBehavior.createOrUpdate({
				featureId,
				featureCoordinates: featureCoordinatesUpdated,
			});

			// Ensure all coordinate points are updated
			const coordinatePoints = config.store.copyAllWhere((properties) =>
				Boolean(properties[COMMON_PROPERTIES.COORDINATE_POINT]),
			);
			expect(coordinatePoints.length).toBe(4);
			expect(
				coordinatePoints.every(
					({ geometry }, i) =>
						geometry.type === "Point" &&
						geometry.coordinates.toString() ===
							featureCoordinatesUpdated[i].toString(),
				),
			).toBe(true);
		});

		it("deletePointsByFeatureIds", () => {
			const mockPolygon = MockPolygonSquare();
			const [featureId] = config.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			expect(config.store.has(featureId)).toBe(true);
			coordinatePointBehavior.createOrUpdate({
				featureId,
				featureCoordinates: mockPolygon.geometry.coordinates,
			});

			const properties = config.store.getPropertiesCopy(featureId);
			expect(properties).toBeDefined();

			const coordinatePointIds = properties.coordinatePointIds as string[];
			expect(coordinatePointIds.length).toBe(4);
			expect(coordinatePointIds.every(isUUIDV4)).toBe(true);

			coordinatePointBehavior.deletePointsByFeatureIds([featureId]);

			const propertiesAfterDelete = config.store.getPropertiesCopy(featureId);
			expect(propertiesAfterDelete.coordinatePointIds).toBe(null);

			const coordinatePointsAfterDelete = config.store.copyAllWhere(
				(properties) => Boolean(properties[COMMON_PROPERTIES.COORDINATE_POINT]),
			);
			expect(coordinatePointsAfterDelete).toStrictEqual([]);
		});

		it("deletePointsByFeatureIds when points no longer exist doesn't throw an error", () => {
			const mockPolygon = MockPolygonSquare();
			const [featureId] = config.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			expect(config.store.has(featureId)).toBe(true);
			coordinatePointBehavior.createOrUpdate({
				featureId,
				featureCoordinates: mockPolygon.geometry.coordinates,
			});

			const properties = config.store.getPropertiesCopy(featureId);
			expect(properties).toBeDefined();

			const coordinatePointIds = properties.coordinatePointIds as string[];
			expect(coordinatePointIds.length).toBe(4);
			expect(coordinatePointIds.every(isUUIDV4)).toBe(true);

			// Delete all the coordinate points
			config.store.delete(coordinatePointIds);

			jest.spyOn(config.store, "delete");

			coordinatePointBehavior.deletePointsByFeatureIds([featureId]);

			// Ensure no delete calls were made because we have already deleted the points
			expect(config.store.delete).toHaveBeenCalledTimes(0);

			const propertiesAfterDelete = config.store.getPropertiesCopy(featureId);
			expect(propertiesAfterDelete.coordinatePointIds).toBe(null);

			const coordinatePointsAfterDelete = config.store.copyAllWhere(
				(properties) => Boolean(properties[COMMON_PROPERTIES.COORDINATE_POINT]),
			);
			expect(coordinatePointsAfterDelete).toStrictEqual([]);
		});
	});
});
