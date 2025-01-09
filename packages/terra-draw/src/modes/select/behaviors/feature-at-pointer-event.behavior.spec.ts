import { GeoJSONStoreFeatures } from "../../../store/store";
import {
	createStoreLineString,
	createStoreMidPoint,
	createStorePoint,
	createStorePolygon,
} from "../../../test/create-store-features";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MockCursorEvent } from "../../../test/mock-cursor-event";
import { ClickBoundingBoxBehavior } from "../../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { FeatureAtPointerEventBehavior } from "./feature-at-pointer-event.behavior";

describe("FeatureAtPointerEventBehavior", () => {
	const UUIDV4 = new RegExp(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);

	const isUUIDV4 = (received: string) => UUIDV4.test(received);

	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			new FeatureAtPointerEventBehavior(
				config,
				new ClickBoundingBoxBehavior(config),
				new PixelDistanceBehavior(config),
			);
		});
	});

	describe("api", () => {
		let config: ReturnType<typeof MockBehaviorConfig>;
		let featureAtPointerEventBehavior: FeatureAtPointerEventBehavior;

		beforeEach(() => {
			config = MockBehaviorConfig("test");
			featureAtPointerEventBehavior = new FeatureAtPointerEventBehavior(
				config,
				new ClickBoundingBoxBehavior(config),
				new PixelDistanceBehavior(config),
			);
		});

		describe("find", () => {
			it("returns nothing if nothing in store", () => {
				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					false,
				);
				expect(result).toStrictEqual({
					clickedFeature: undefined,
					clickedMidPoint: undefined,
				});
			});

			it("ignores selection point", () => {
				config.store.create([
					{
						geometry: {
							type: "Point",
							coordinates: [0, 0],
						},
						properties: {
							selectionPoint: true,
						},
					},
				]);

				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					false,
				);

				expect(result).toStrictEqual({
					clickedFeature: undefined,
					clickedMidPoint: undefined,
				});
			});

			it("returns clicked point feature if point, linestring and polygon present", () => {
				createStorePolygon(config);
				createStoreLineString(config);
				createStorePoint(config);

				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					false,
				);

				expect(
					isUUIDV4(
						(result.clickedFeature as GeoJSONStoreFeatures).id as string,
					),
				).toBe(true);
				expect(result.clickedMidPoint).toBeUndefined();
				expect(result.clickedFeature?.geometry.type).toBe("Point");
			});

			it("returns clicked linestring feature if linestring and polygon present", () => {
				createStorePolygon(config);
				createStoreLineString(config);

				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					false,
				);

				expect(
					isUUIDV4(
						(result.clickedFeature as GeoJSONStoreFeatures).id as string,
					),
				).toBe(true);
				expect(result.clickedMidPoint).toBeUndefined();
				expect(result.clickedFeature?.geometry.type).toBe("LineString");
			});

			it("returns clicked point feature if point and polygon present", () => {
				createStorePoint(config);
				createStorePolygon(config);

				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					false,
				);

				expect(
					isUUIDV4(
						(result.clickedFeature as GeoJSONStoreFeatures).id as string,
					),
				).toBe(true);
				expect(result.clickedMidPoint).toBeUndefined();
				expect(result.clickedFeature?.geometry.type).toBe("Point");
			});

			it("returns clicked point feature if point and linestring present", () => {
				createStorePoint(config);
				createStoreLineString(config);

				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					false,
				);

				expect(
					isUUIDV4(
						(result.clickedFeature as GeoJSONStoreFeatures).id as string,
					),
				).toBe(true);
				expect(result.clickedMidPoint).toBeUndefined();
				expect(result.clickedFeature?.geometry.type).toBe("Point");
			});

			it("returns clicked polygon if only polygon present", () => {
				createStorePolygon(config);

				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					false,
				);

				expect(
					isUUIDV4(
						(result.clickedFeature as GeoJSONStoreFeatures).id as string,
					),
				).toBe(true);
				expect(result.clickedMidPoint).toBeUndefined();
				expect(result.clickedFeature?.geometry.type).toBe("Polygon");
			});

			it("returns clicked linestring if only linestring present", () => {
				createStoreLineString(config);

				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					false,
				);

				expect(
					isUUIDV4(
						(result.clickedFeature as GeoJSONStoreFeatures).id as string,
					),
				).toBe(true);
				expect(result.clickedMidPoint).toBeUndefined();
				expect(result.clickedFeature?.geometry.type).toBe("LineString");
			});

			it("returns clicked point if only point present", () => {
				createStorePoint(config);

				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					false,
				);

				expect(
					isUUIDV4(
						(result.clickedFeature as GeoJSONStoreFeatures).id as string,
					),
				).toBe(true);
				expect(result.clickedMidPoint).toBeUndefined();
				expect(result.clickedFeature?.geometry.type).toBe("Point");
			});

			it("returns midpoint", () => {
				createStorePolygon(config);
				createStoreMidPoint(config);

				const result = featureAtPointerEventBehavior.find(
					MockCursorEvent({ lng: 0, lat: 0 }),
					true,
				);

				expect(
					isUUIDV4(
						(result.clickedFeature as GeoJSONStoreFeatures).id as string,
					),
				).toBe(true);
			});
		});
	});
});
