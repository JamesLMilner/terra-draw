import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MockCursorEvent } from "../../../test/mock-cursor-event";
import { BehaviorConfig } from "../../base.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { ClosingPointsBehavior } from "./closing-points.behavior";

describe("ClosingPointsBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			new ClosingPointsBehavior(config, new PixelDistanceBehavior(config));
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
					startEndPointBehavior.create(
						[
							[0, 0],
							[0, 1],
						],
						"polygon",
					);
				}).toThrow();
			});

			it("creates correctly when enough coordinates are present", () => {
				startEndPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
					"polygon",
				);

				expect(startEndPointBehavior.ids.length).toBe(2);
				expect(startEndPointBehavior.ids[0]).toBeUUID4();
				expect(startEndPointBehavior.ids[1]).toBeUUID4();
			});

			it("create can't be run twice", () => {
				startEndPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
					"polygon",
				);

				expect(() => {
					startEndPointBehavior.create(
						[
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						],
						"polygon",
					);
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
				startEndPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
					"polygon",
				);

				expect(startEndPointBehavior.ids.length).toBe(2);
				startEndPointBehavior.delete();
				expect(startEndPointBehavior.ids.length).toBe(0);
			});
		});

		describe("update", () => {
			it("throws error if nothing created", () => {
				expect(() => {
					startEndPointBehavior.update([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					]);
				}).toThrow();
			});

			it("updates geometries correctly", () => {
				jest.spyOn(config.store, "updateGeometry");

				startEndPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[0, 0],
					],
					"polygon",
				);

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
				startEndPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
					"polygon",
				);

				const { isClosing, isPreviousClosing } =
					startEndPointBehavior.isClosingPoint(
						MockCursorEvent({ lng: 0, lat: 0 }),
					);

				expect(isClosing).toBe(true);
				expect(isPreviousClosing).toBe(false);
			});

			it("returns isPreviousClosing as true when in vicinity of previous closing point", () => {
				startEndPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
					"polygon",
				);

				const { isClosing, isPreviousClosing } =
					startEndPointBehavior.isClosingPoint(
						MockCursorEvent({ lng: 1, lat: 0 }),
					);

				expect(isClosing).toBe(false);
				expect(isPreviousClosing).toBe(true);
			});

			it("returns both as false when not in vicinity of either closing point", () => {
				startEndPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
					"polygon",
				);

				const { isClosing, isPreviousClosing } =
					startEndPointBehavior.isClosingPoint(
						MockCursorEvent({ lng: 10, lat: 10 }),
					);

				expect(isClosing).toBe(false);
				expect(isPreviousClosing).toBe(false);
			});
		});
	});
});
