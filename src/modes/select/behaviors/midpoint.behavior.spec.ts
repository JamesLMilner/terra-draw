import {
	createStoreLineString,
	createStorePolygon,
} from "../../../test/create-store-features";
import { mockBehaviorConfig } from "../../../test/mock-behavior-config";
import { BehaviorConfig } from "../../base.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("MidPointBehavior", () => {
	const coordinatePrecision = 9;
	let config: BehaviorConfig;

	beforeEach(() => {
		jest.resetAllMocks();
		config = mockBehaviorConfig("test");

		(config.project as jest.Mock).mockImplementation(
			(lng: number, lat: number) => ({
				x: lng * 100,
				y: lat * 100,
			}),
		);

		(config.unproject as jest.Mock).mockImplementation(
			(x: number, y: number) => ({
				lng: x / 100,
				lat: y / 100,
			}),
		);
	});

	describe("constructor", () => {
		it("constructs", () => {
			new MidPointBehavior(config, new SelectionPointBehavior(config));
		});
	});

	describe("api", () => {
		describe("api", () => {
			it("get ids", () => {
				const midPointBehavior = new MidPointBehavior(
					config,
					new SelectionPointBehavior(config),
				);

				expect(midPointBehavior.ids).toStrictEqual([]);
			});

			it("set ids fails", () => {
				const midPointBehavior = new MidPointBehavior(
					config,
					new SelectionPointBehavior(config),
				);

				midPointBehavior.ids = ["test"];

				expect(midPointBehavior.ids).toStrictEqual([]);
			});

			it("create fails when the feature does not exist", () => {
				const midPointBehavior = new MidPointBehavior(
					config,
					new SelectionPointBehavior(config),
				);

				jest.spyOn(config.store, "create");

				expect(() => {
					midPointBehavior.create(
						[
							[0, 0],
							[0, 1],
						],
						"e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
						coordinatePrecision,
					);
				}).toThrowError();
			});

			it("create", () => {
				const midPointBehavior = new MidPointBehavior(
					config,
					new SelectionPointBehavior(config),
				);

				jest.spyOn(config.store, "create");
				const createdId = createStoreLineString(config);
				expect(config.store.create).toBeCalledTimes(1);

				midPointBehavior.create(
					[
						[0, 0],
						[0, 1],
					],
					createdId,
					coordinatePrecision,
				);

				expect(config.store.create).toBeCalledTimes(2);
				expect(midPointBehavior.ids.length).toBe(1);
				expect(midPointBehavior.ids[0]).toBeUUID4();
			});

			it("delete", () => {
				const midPointBehavior = new MidPointBehavior(
					config,
					new SelectionPointBehavior(config),
				);

				const createdId = createStoreLineString(config);

				midPointBehavior.create(
					[
						[0, 0],
						[0, 1],
					],
					createdId,
					coordinatePrecision,
				);

				expect(midPointBehavior.ids.length).toBe(1);
				midPointBehavior.delete();
				expect(midPointBehavior.ids.length).toBe(0);
			});

			describe("getUpdated", () => {
				it("should return empty array if trying to get updated coordinates when non exist", () => {
					const midPointBehavior = new MidPointBehavior(
						config,
						new SelectionPointBehavior(config),
					);
					const result = midPointBehavior.getUpdated([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					expect(result).toBe(undefined);
				});

				it("should get updated coordinates if lengths match", () => {
					const midPointBehavior = new MidPointBehavior(
						config,
						new SelectionPointBehavior(config),
					);

					const createdId = createStoreLineString(config);

					midPointBehavior.create(
						[
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						],
						createdId,
						coordinatePrecision,
					);

					const result = midPointBehavior.getUpdated([
						[2, 2],
						[2, 3],
						[2, 2],
						[2, 3],
					]);

					expect(Array.isArray(result)).toBe(true);

					expect((result as any).length).toBe(3);

					(result as any[]).forEach((point) => {
						expect(point.id).toBeUUID4();
						expect(point.geometry.type).toBe("Point");
						expect(point.geometry.coordinates).toStrictEqual([
							expect.any(Number),
							expect.any(Number),
						]);
					});
				});
			});

			describe("insert", () => {
				it("insert midpoint into the linestring", () => {
					const midPointBehavior = new MidPointBehavior(
						config,
						new SelectionPointBehavior(config),
					);

					jest.spyOn(config.store, "create");
					const createdId = createStoreLineString(config);
					expect(config.store.create).toBeCalledTimes(1);

					midPointBehavior.create(
						[
							[0, 0],
							[0, 1],
						],
						createdId,
						coordinatePrecision,
					);

					const createCalls = (config.store.create as jest.Mock).mock.calls;

					// Initial Create
					expect(createCalls[1][0][0].properties).toStrictEqual({
						midPoint: true,
						midPointFeatureId: expect.any(String),
						midPointSegment: 0,
						mode: "test",
					});

					const midPointId = midPointBehavior.ids[0];

					expect(midPointId).toBeUUID4();

					midPointBehavior.insert(midPointId, coordinatePrecision);

					expect(config.store.create).toBeCalledTimes(4);

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

				it("insert midpoint into the polygon", () => {
					const midPointBehavior = new MidPointBehavior(
						config,
						new SelectionPointBehavior(config),
					);

					jest.spyOn(config.store, "create");
					const createdId = createStorePolygon(config);
					expect(config.store.create).toBeCalledTimes(1);

					midPointBehavior.create(
						[
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						],
						createdId,
						coordinatePrecision,
					);

					const createCalls = (config.store.create as jest.Mock).mock.calls;

					// Initial Create
					expect(createCalls[1][0][0].properties).toStrictEqual({
						midPoint: true,
						midPointFeatureId: expect.any(String),
						midPointSegment: 0,
						mode: "test",
					});

					const midPointId = midPointBehavior.ids[0];

					expect(midPointId).toBeUUID4();

					midPointBehavior.insert(midPointId, coordinatePrecision);

					expect(config.store.create).toBeCalledTimes(4);

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
