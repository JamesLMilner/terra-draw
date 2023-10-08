import { mockBehaviorConfig } from "../../../test/mock-behavior-config";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("SelectionPointBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			new SelectionPointBehavior(mockBehaviorConfig("test"));
		});
	});

	describe("api", () => {
		it("get ids", () => {
			const selectionPointBehavior = new SelectionPointBehavior(
				mockBehaviorConfig("test"),
			);

			expect(selectionPointBehavior.ids).toStrictEqual([]);
		});

		it("set ids fails", () => {
			const selectionPointBehavior = new SelectionPointBehavior(
				mockBehaviorConfig("test"),
			);

			selectionPointBehavior.ids = ["test"];

			expect(selectionPointBehavior.ids).toStrictEqual([]);
		});

		it("create - for polygon", () => {
			const selectionPointBehavior = new SelectionPointBehavior(
				mockBehaviorConfig("test"),
			);

			selectionPointBehavior.create(
				[
					[0, 0],
					[0, 1],
				],
				"LineString",
				"id",
			);

			expect(selectionPointBehavior.ids.length).toBe(2);
			selectionPointBehavior.ids.forEach((id) => expect(id).toBeUUID4());
		});

		it("delete", () => {
			const selectionPointBehavior = new SelectionPointBehavior(
				mockBehaviorConfig("test"),
			);

			selectionPointBehavior.create(
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
				"Polygon",
				"id",
			);

			expect(selectionPointBehavior.ids.length).toBe(4);
			selectionPointBehavior.delete();
			expect(selectionPointBehavior.ids.length).toBe(0);
		});

		describe("getUpdated", () => {
			it("should return empty array if trying to get updated coordinates when non exist", () => {
				const config = mockBehaviorConfig("test");

				const selectionPointBehavior = new SelectionPointBehavior(config);

				const result = selectionPointBehavior.getUpdated([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				expect(result).toBe(undefined);
			});

			it("should get updated coordinates if lengths match", () => {
				const config = mockBehaviorConfig("test");

				const selectionPointBehavior = new SelectionPointBehavior(config);

				selectionPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
					"Polygon",
					"id",
				);

				const result = selectionPointBehavior.getUpdated([
					[2, 2],
					[2, 3],
					[2, 2],
					[2, 3],
				]);

				expect(Array.isArray(result)).toBe(true);

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

		describe("getOneUpdated", () => {
			it("should return undefined if trying to get updated coordinates when non exist", () => {
				const config = mockBehaviorConfig("test");

				const selectionPointBehavior = new SelectionPointBehavior(config);

				const result = selectionPointBehavior.getOneUpdated(0, [0, 1]);
				expect(result).toBe(undefined);
			});

			it("should get updated coordinates index exists", () => {
				const config = mockBehaviorConfig("test");

				const selectionPointBehavior = new SelectionPointBehavior(config);

				selectionPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
					"Polygon",
					"id",
				);

				const result = selectionPointBehavior.getOneUpdated(0, [2, 2]);

				expect(result).not.toBe(undefined);
				expect(result && result.id).toBeUUID4();
				expect(result && result.geometry.coordinates).toStrictEqual([2, 2]);
			});
		});
	});
});
