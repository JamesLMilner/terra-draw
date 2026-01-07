import { MockBehaviorConfig } from "./../test/mock-behavior-config";
import { MockCursorEvent } from "./../test/mock-cursor-event";
import { BehaviorConfig } from "./base.behavior";
import { MutateFeatureBehavior } from "./mutate-feature.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";
import { ReadFeatureBehavior } from "./read-feature.behavior";
import { ClosingPointsBehavior } from "./closing-points.behavior";

describe("ClosingPointsBehavior", () => {
	const UUIDV4 = new RegExp(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);

	const isUUIDV4 = (received: string) => UUIDV4.test(received);

	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			new ClosingPointsBehavior(
				config,
				new PixelDistanceBehavior(config),
				new MutateFeatureBehavior(config, {
					validate: jest.fn(() => ({ valid: true })),
				}),
				new ReadFeatureBehavior(config),
			);
		});
	});

	describe("api", () => {
		let startEndPointBehavior: ClosingPointsBehavior;
		let config: BehaviorConfig;

		beforeEach(() => {
			config = MockBehaviorConfig("test");
			startEndPointBehavior = new ClosingPointsBehavior(
				config,
				new PixelDistanceBehavior(config),
				new MutateFeatureBehavior(config, {
					validate: jest.fn(() => ({ valid: true })),
				}),
				new ReadFeatureBehavior(config),
			);
		});

		describe("ids", () => {
			it("get returns empty array", () => {
				expect(startEndPointBehavior.ids).toStrictEqual([]);
			});

			it("set fails", () => {
				startEndPointBehavior.ids = ["test"];

				expect(startEndPointBehavior.ids).toStrictEqual([]);
			});
		});

		describe("create", () => {
			it("throws error if not enough coordinates", () => {
				expect(() => {
					startEndPointBehavior.create([
						[
							[0, 0],
							[0, 1],
						],
					]);
				}).toThrow();
			});

			it("creates correctly when enough coordinates are present", () => {
				startEndPointBehavior.create([
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
				]);

				expect(startEndPointBehavior.ids.length).toBe(2);
				expect(isUUIDV4(startEndPointBehavior.ids[0] as string)).toBe(true);
				expect(isUUIDV4(startEndPointBehavior.ids[1] as string)).toBe(true);
			});

			it("create can't be run twice", () => {
				startEndPointBehavior.create([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(() => {
					startEndPointBehavior.create([
						[
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						],
					]);
				}).toThrow();
			});
		});

		describe("delete", () => {
			it("without closing points has no effect", () => {
				expect(startEndPointBehavior.ids.length).toBe(0);
				startEndPointBehavior.delete();
				expect(startEndPointBehavior.ids.length).toBe(0);
			});

			it("with closing points deletes them", () => {
				startEndPointBehavior.create([
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
				]);

				expect(startEndPointBehavior.ids.length).toBe(2);
				startEndPointBehavior.delete();
				expect(startEndPointBehavior.ids.length).toBe(0);
			});
		});

		describe("update", () => {
			it("updates geometries correctly", () => {
				jest.spyOn(config.store, "updateGeometry");

				startEndPointBehavior.create([
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[0, 0],
					],
				]);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);

				startEndPointBehavior.update([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});
		});

		describe("isClosingPoint", () => {
			it("returns isClosing as true when in vicinity of closing point", () => {
				startEndPointBehavior.create([
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
				]);

				const { isClosing, isPreviousClosing } =
					startEndPointBehavior.isPolygonClosingPoints(
						MockCursorEvent({ lng: 0, lat: 0 }),
					);

				expect(isClosing).toBe(true);
				expect(isPreviousClosing).toBe(false);
			});

			it("returns isPreviousClosing as true when in vicinity of previous closing point", () => {
				startEndPointBehavior.create([
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
				]);

				const { isClosing, isPreviousClosing } =
					startEndPointBehavior.isPolygonClosingPoints(
						MockCursorEvent({ lng: 1, lat: 0 }),
					);

				expect(isClosing).toBe(false);
				expect(isPreviousClosing).toBe(true);
			});

			it("returns both as false when not in vicinity of either closing point", () => {
				startEndPointBehavior.create([
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
				]);

				const { isClosing, isPreviousClosing } =
					startEndPointBehavior.isPolygonClosingPoints(
						MockCursorEvent({ lng: 10, lat: 10 }),
					);

				expect(isClosing).toBe(false);
				expect(isPreviousClosing).toBe(false);
			});
		});
	});
});
