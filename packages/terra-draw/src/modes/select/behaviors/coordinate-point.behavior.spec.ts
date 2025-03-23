import { Feature, Position } from "geojson";
import { COMMON_PROPERTIES } from "../../../common";
import { GeoJSONStoreFeatures, JSONObject } from "../../../store/store";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MockPolygonSquare } from "../../../test/mock-features";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";

describe("CoordinatePointBehavior", () => {
	const UUIDV4 = new RegExp(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);

	const isUUIDV4 = (received: string) => UUIDV4.test(received);

	describe("constructor", () => {
		it("constructs", () => {
			new CoordinatePointBehavior(MockBehaviorConfig("test"));
		});
	});

	describe("api", () => {
		it("createOrUpdate", () => {
			const config = MockBehaviorConfig("test");
			const coordinatePointBehavior = new CoordinatePointBehavior(config);

			const mockPolygon = MockPolygonSquare();
			const [featureId] = config.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			expect(config.store.has(featureId)).toBe(true);
			coordinatePointBehavior.createOrUpdate(featureId);

			const properties = config.store.getPropertiesCopy(featureId);
			expect(properties).toBeDefined();

			const coordinatePointIds = properties.coordinatePointIds as string[];
			expect(coordinatePointIds.length).toBe(4);
			expect(coordinatePointIds.every(isUUIDV4)).toBe(true);
		});

		it("deletePointsByFeatureIds", () => {
			const config = MockBehaviorConfig("test");
			const coordinatePointBehavior = new CoordinatePointBehavior(config);

			const mockPolygon = MockPolygonSquare();
			const [featureId] = config.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			expect(config.store.has(featureId)).toBe(true);
			coordinatePointBehavior.createOrUpdate(featureId);

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

		it("getUpdated", () => {
			const config = MockBehaviorConfig("test");
			const coordinatePointBehavior = new CoordinatePointBehavior(config);

			const mockPolygon = MockPolygonSquare();
			const [featureId] = config.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			expect(config.store.has(featureId)).toBe(true);
			coordinatePointBehavior.createOrUpdate(featureId);

			const properties = config.store.getPropertiesCopy(featureId);
			expect(properties).toBeDefined();

			const coordinatePointIds = properties.coordinatePointIds as string[];
			expect(coordinatePointIds.length).toBe(4);
			expect(coordinatePointIds.every(isUUIDV4)).toBe(true);

			const updatedCoordinates = [
				[0, 0],
				[0, 1],
				[1, 0],
				[1, 1],
			] as Position[];

			const updatedPoints = coordinatePointBehavior.getUpdated(
				featureId,
				updatedCoordinates,
			) as GeoJSONStoreFeatures[];

			expect(updatedPoints).toBeDefined();
			expect(updatedPoints.length).toBe(4);
			expect(
				updatedPoints.every((point) => point.geometry.type === "Point"),
			).toBe(true);
			expect(updatedPoints.every((_, i) => updatedCoordinates[i])).toBe(true);
		});
	});
});
