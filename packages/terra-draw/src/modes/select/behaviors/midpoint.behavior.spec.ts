import { Position } from "geojson";
import {
	createStoreLineString,
	createStorePolygon,
} from "../../../test/create-store-features";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { BehaviorConfig } from "../../base.behavior";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("MidPointBehavior", () => {
	let config: BehaviorConfig;
	let midPointBehavior: MidPointBehavior;

	beforeEach(() => {
		jest.resetAllMocks();
		config = MockBehaviorConfig("test");
	});

	describe("constructor", () => {
		it("constructs", () => {
			const mutateFeatureBehavior = new MutateFeatureBehavior(config, {
				validate: jest.fn(() => ({ valid: true })),
			});
			const readFeatureBehavior = new ReadFeatureBehavior(config);
			midPointBehavior = new MidPointBehavior(
				config,
				new SelectionPointBehavior(config, mutateFeatureBehavior),
				new CoordinatePointBehavior(
					config,
					readFeatureBehavior,
					mutateFeatureBehavior,
				),
				mutateFeatureBehavior,
				readFeatureBehavior,
			);
		});

		describe("api", () => {
			beforeEach(() => {
				jest.resetAllMocks();
				config = MockBehaviorConfig("test");
				const mutateFeatureBehavior = new MutateFeatureBehavior(config, {
					validate: jest.fn(() => ({ valid: true })),
				});
				const readFeatureBehavior = new ReadFeatureBehavior(config);
				midPointBehavior = new MidPointBehavior(
					config,
					new SelectionPointBehavior(config, mutateFeatureBehavior),
					new CoordinatePointBehavior(
						config,
						readFeatureBehavior,
						mutateFeatureBehavior,
					),
					mutateFeatureBehavior,
					readFeatureBehavior,
				);
			});

			const UUIDV4 = new RegExp(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);

			const isUUIDV4 = (received: string) => UUIDV4.test(received);

			describe("api", () => {
				it("get ids", () => {
					expect(midPointBehavior.ids).toStrictEqual([]);
				});

				it("set ids fails", () => {
					midPointBehavior.ids = ["test"];

					expect(midPointBehavior.ids).toStrictEqual([]);
				});

				it("create fails when the feature does not exist", () => {
					jest.spyOn(config.store, "create");

					expect(() => {
						midPointBehavior.create({
							featureCoordinates: [
								[0, 0],
								[0, 1],
							],
							featureId: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
						});
					}).toThrow();
				});

				it("create", () => {
					jest.spyOn(config.store, "create");
					const createdId = createStoreLineString(config);
					expect(config.store.create).toHaveBeenCalledTimes(1);

					midPointBehavior.create({
						featureCoordinates: [
							[0, 0],
							[0, 1],
						],
						featureId: createdId,
					});

					expect(config.store.create).toHaveBeenCalledTimes(2);
					expect(midPointBehavior.ids.length).toBe(1);
					expect(isUUIDV4(midPointBehavior.ids[0] as string)).toBe(true);
				});

				it("delete", () => {
					const createdId = createStoreLineString(config);

					midPointBehavior.create({
						featureCoordinates: [
							[0, 0],
							[0, 1],
						],
						featureId: createdId,
					});

					expect(midPointBehavior.ids.length).toBe(1);
					midPointBehavior.delete();
					expect(midPointBehavior.ids.length).toBe(0);
				});

				describe("getUpdated", () => {
					it("should return empty array if trying to get updated coordinates when non exist", () => {
						const result = midPointBehavior.updateAllInPlace({
							featureCoordinates: [
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
							],
						});

						expect(result).toBe(undefined);
					});

					it("should get updated coordinates if lengths match", () => {
						const createdId = createStoreLineString(config);

						midPointBehavior.create({
							featureCoordinates: [
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
							],
							featureId: createdId,
						});

						midPointBehavior.updateAllInPlace({
							featureCoordinates: [
								[2, 2],
								[2, 3],
								[2, 2],
								[2, 3],
							],
						});

						const result = midPointBehavior.ids.map(
							(id) => config.store.getGeometryCopy(id).coordinates as Position,
						);

						expect(Array.isArray(result)).toBe(true);

						expect((result as any).length).toBe(3);
					});
				});

				describe("insert", () => {
					it("insert midpoint into the linestring", () => {
						jest.spyOn(config.store, "create");
						const createdId = createStoreLineString(config);
						expect(config.store.create).toHaveBeenCalledTimes(1);

						midPointBehavior.create({
							featureCoordinates: [
								[0, 0],
								[0, 1],
							],
							featureId: createdId,
						});

						const createCalls = (config.store.create as jest.Mock).mock.calls;

						// Initial Create
						expect(createCalls[1][0][0].properties).toStrictEqual({
							midPoint: true,
							midPointFeatureId: expect.any(String),
							midPointSegment: 0,
							mode: "test",
						});

						const midPointId = midPointBehavior.ids[0];

						expect(isUUIDV4(midPointId as string)).toBe(true);

						midPointBehavior.insert({
							featureId: createdId,
							midPointId,
						});

						expect(config.store.create).toHaveBeenCalledTimes(4);

						// New Midpoints
						createCalls[2][0].forEach((call: any, i: number) => {
							expect(call.properties).toStrictEqual({
								midPoint: true,
								midPointFeatureId: expect.any(String),
								midPointSegment: i,
								mode: "test",
							});
						});

						// New Selection points
						createCalls[3][0].forEach((call: any, i: number) => {
							expect(call.properties).toStrictEqual({
								index: i,
								mode: "test",
								selectionPoint: true,
								selectionPointFeatureId: expect.any(String),
							});
						});
					});

					describe("updateOneAtIndex", () => {
						it("should return undefined if index is negative and out of bounds", () => {
							// no midpoints exist
							const result = midPointBehavior.updateOneAtIndex(-1, [
								[0, 0],
								[0, 1],
							]);

							expect(result).toBe(undefined);
						});

						it("should update the final midpoint when using index -1", () => {
							const createdId = createStorePolygon(config);

							// This closed polygon ring generates 4 midpoints
							midPointBehavior.create({
								featureCoordinates: [
									[0, 0],
									[0, 1],
									[1, 1],
									[1, 0],
									[0, 0],
								],
								featureId: createdId,
							});

							// New polygon coordinates so we can assert midpoint changes
							const updatedCoords: Position[] = [
								[0, 0],
								[0, 2],
								[2, 2],
								[2, 0],
								[0, 0],
							];

							// Capture current last midpoint coordinate
							const lastMidPointId =
								midPointBehavior.ids[midPointBehavior.ids.length - 1];
							const lastMidPointBefore = config.store.getGeometryCopy(
								lastMidPointId,
							).coordinates as Position;

							midPointBehavior.updateOneAtIndex(-1, updatedCoords);

							const lastMidPointAfter = config.store.getGeometryCopy(
								lastMidPointId,
							).coordinates as Position;

							expect(lastMidPointAfter).not.toEqual(lastMidPointBefore);
						});
					});

					it("insert midpoint into the polygon", () => {
						jest.spyOn(config.store, "create");
						const createdId = createStorePolygon(config);
						expect(config.store.create).toHaveBeenCalledTimes(1);

						midPointBehavior.create({
							featureCoordinates: [
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
							featureId: createdId,
						});

						const createCalls = (config.store.create as jest.Mock).mock.calls;

						// Initial Create
						expect(createCalls[1][0][0].properties).toStrictEqual({
							midPoint: true,
							midPointFeatureId: expect.any(String),
							midPointSegment: 0,
							mode: "test",
						});

						const midPointId = midPointBehavior.ids[0];

						expect(isUUIDV4(midPointId as string)).toBe(true);

						midPointBehavior.insert({
							featureId: createdId,
							midPointId,
						});

						expect(config.store.create).toHaveBeenCalledTimes(4);

						// New Midpoints
						createCalls[2][0].forEach((call: any, i: number) => {
							expect(call.properties).toStrictEqual({
								midPoint: true,
								midPointFeatureId: expect.any(String),
								midPointSegment: i,
								mode: "test",
							});
						});

						// New Selection points
						createCalls[3][0].forEach((call: any, i: number) => {
							expect(call.properties).toStrictEqual({
								index: i,
								mode: "test",
								selectionPoint: true,
								selectionPointFeatureId: expect.any(String),
							});
						});
					});
				});
			});
		});
	});
});
