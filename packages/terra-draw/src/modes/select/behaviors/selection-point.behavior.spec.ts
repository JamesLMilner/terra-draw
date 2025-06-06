import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("SelectionPointBehavior", () => {
	const UUIDV4 = new RegExp(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);

	const isUUIDV4 = (received: string) => UUIDV4.test(received);

	describe("constructor", () => {
		it("constructs", () => {
			new SelectionPointBehavior(MockBehaviorConfig("test"));
		});
	});

	describe("api", () => {
		it("get ids", () => {
			const selectionPointBehavior = new SelectionPointBehavior(
				MockBehaviorConfig("test"),
			);

			expect(selectionPointBehavior.ids).toStrictEqual([]);
		});

		it("set ids fails", () => {
			const selectionPointBehavior = new SelectionPointBehavior(
				MockBehaviorConfig("test"),
			);

			selectionPointBehavior.ids = ["test"];

			expect(selectionPointBehavior.ids).toStrictEqual([]);
		});

		it("create for Polygon", () => {
			const config = MockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);

			selectionPointBehavior.create(
				[
					[0, 0],
					[0, 1],
				],
				"LineString",
				"id",
			);

			expect(selectionPointBehavior.ids.length).toBe(2);
			selectionPointBehavior.ids.forEach((id) =>
				expect(isUUIDV4(id as string)),
			);

			selectionPointBehavior.ids.forEach((id, i) => {
				const properties = config.store.getPropertiesCopy(id);
				expect(properties.mode).toBe("test");
				expect(properties.index).toBe(i);
				expect(properties.selectionPoint).toBe(true);
				expect(properties.selectionPointFeatureId).toBe("id");
			});
		});

		it("delete", () => {
			const selectionPointBehavior = new SelectionPointBehavior(
				MockBehaviorConfig("test"),
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
				const config = MockBehaviorConfig("test");

				const selectionPointBehavior = new SelectionPointBehavior(config);

				const result = selectionPointBehavior.getUpdated([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				expect(result).toBe(undefined);
			});

			it("should get updated coordinates if lengths match for Polygon", () => {
				const config = MockBehaviorConfig("test");

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

				(result as any[]).forEach((point, i) => {
					expect(isUUIDV4(point.id as string));

					const properties = config.store.getPropertiesCopy(point.id);

					expect(properties.mode).toBe("test");
					expect(properties.index).toBe(i);
					expect(properties.selectionPoint).toBe(true);
					expect(properties.selectionPointFeatureId).toBe("id");

					expect(point.geometry.type).toBe("Point");
					expect(point.geometry.coordinates).toStrictEqual([
						expect.any(Number),
						expect.any(Number),
					]);
				});
			});

			it("should get updated coordinates if lengths match for LineString", () => {
				const config = MockBehaviorConfig("test");

				const selectionPointBehavior = new SelectionPointBehavior(config);

				selectionPointBehavior.create(
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					],
					"LineString",
					"id",
				);

				const result = selectionPointBehavior.getUpdated([
					[2, 2],
					[2, 3],
					[2, 2],
					[2, 3],
				]);

				expect(Array.isArray(result)).toBe(true);

				(result as any[]).forEach((point, i) => {
					expect(isUUIDV4(point.id as string));

					const properties = config.store.getPropertiesCopy(point.id);

					expect(properties.mode).toBe("test");
					expect(properties.index).toBe(i);
					expect(properties.selectionPoint).toBe(true);
					expect(properties.selectionPointFeatureId).toBe("id");

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
				const config = MockBehaviorConfig("test");

				const selectionPointBehavior = new SelectionPointBehavior(config);

				const result = selectionPointBehavior.getOneUpdated(0, [0, 1]);
				expect(result).toBe(undefined);
			});

			it("should get updated coordinates index exists", () => {
				const config = MockBehaviorConfig("test");

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
				expect(result && isUUIDV4(result.id as string)).toBe(true);
				expect(result && result.geometry.coordinates).toStrictEqual([2, 2]);
			});
		});
	});
});
