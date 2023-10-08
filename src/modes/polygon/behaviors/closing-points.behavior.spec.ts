import { mockBehaviorConfig } from "../../../test/mock-behavior-config";
import { mockDrawEvent } from "../../../test/mock-mouse-event";
import { BehaviorConfig } from "../../base.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { ClosingPointsBehavior } from "./closing-points.behavior";

describe("ClosingPointsBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = mockBehaviorConfig("test");
			new ClosingPointsBehavior(config, new PixelDistanceBehavior(config));
		});
	});

	describe("api", () => {
		let startEndPointBehavior: ClosingPointsBehavior;
		let config: BehaviorConfig;

		beforeEach(() => {
			config = mockBehaviorConfig("test");
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
				}).toThrowError();
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
				}).toThrowError();
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
				}).toThrowError();
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

				expect(config.store.updateGeometry).toBeCalledTimes(0);

				startEndPointBehavior.update([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(config.store.updateGeometry).toBeCalledTimes(1);
			});
		});

		describe("isClosingPoint", () => {
			it("returns isClosing as true when in vicinity of closing point", () => {
				jest.spyOn(config, "project");

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

				(config.project as jest.Mock).mockReturnValueOnce({
					x: 0,
					y: 0,
				});

				(config.project as jest.Mock).mockReturnValueOnce({
					x: 50,
					y: 50,
				});

				const { isClosing, isPreviousClosing } =
					startEndPointBehavior.isClosingPoint(
						mockDrawEvent({ containerX: 0, containerY: 0 }),
					);

				expect(isClosing).toBe(true);
				expect(isPreviousClosing).toBe(false);
			});

			it("returns isPreviousClosing as true when in vicinity of closing point", () => {
				jest.spyOn(config, "project");

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

				(config.project as jest.Mock).mockReturnValueOnce({
					x: 50,
					y: 50,
				});

				(config.project as jest.Mock).mockReturnValueOnce({
					x: 0,
					y: 0,
				});

				const { isClosing, isPreviousClosing } =
					startEndPointBehavior.isClosingPoint(
						mockDrawEvent({ containerX: 0, containerY: 0 }),
					);

				expect(isClosing).toBe(false);
				expect(isPreviousClosing).toBe(true);
			});

			it("returns both as false when in vicinity of closing point", () => {
				jest.spyOn(config, "project");

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

				(config.project as jest.Mock).mockReturnValueOnce({
					x: 50,
					y: 50,
				});

				(config.project as jest.Mock).mockReturnValueOnce({
					x: 100,
					y: 100,
				});

				const { isClosing, isPreviousClosing } =
					startEndPointBehavior.isClosingPoint(
						mockDrawEvent({ containerX: 0, containerY: 0 }),
					);

				expect(isClosing).toBe(false);
				expect(isPreviousClosing).toBe(false);
			});
		});
	});
});
