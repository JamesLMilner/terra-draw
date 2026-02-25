import { Position } from "geojson";
import { SELECT_PROPERTIES, UpdateTypes } from "../../../common";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { BehaviorConfig } from "../../base.behavior";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("SelectionPointBehavior", () => {
	const UUIDV4 = new RegExp(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);

	const isUUIDV4 = (received: string) => UUIDV4.test(received);
	let selectionPointBehavior: SelectionPointBehavior;
	let config: BehaviorConfig;

	describe("constructor", () => {
		it("constructs", () => {
			config = MockBehaviorConfig("test");
			const mutateFeatureBehavior = new MutateFeatureBehavior(config, {
				validate: jest.fn(() => ({ valid: true })),
			});
			selectionPointBehavior = new SelectionPointBehavior(
				config,
				mutateFeatureBehavior,
			);
		});
	});

	describe("api", () => {
		beforeEach(() => {
			config = MockBehaviorConfig("test");
			const mutateFeatureBehavior = new MutateFeatureBehavior(config, {
				validate: jest.fn(() => ({ valid: true })),
			});
			selectionPointBehavior = new SelectionPointBehavior(
				config,
				mutateFeatureBehavior,
			);
		});

		it("get ids", () => {
			expect(selectionPointBehavior.ids).toStrictEqual([]);
		});

		it("set ids fails", () => {
			selectionPointBehavior.ids = ["test"];

			expect(selectionPointBehavior.ids).toStrictEqual([]);
		});

		it("create for Polygon", () => {
			selectionPointBehavior.create({
				featureCoordinates: [
					[0, 0],
					[0, 1],
				],
				featureId: "id",
			});

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
			selectionPointBehavior.create({
				featureCoordinates: [
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				],
				featureId: "id",
			});

			expect(selectionPointBehavior.ids.length).toBe(4);
			selectionPointBehavior.delete();
			expect(selectionPointBehavior.ids.length).toBe(0);
		});

		describe("getUpdated", () => {
			it("should return empty array if trying to get updated coordinates when non exist", () => {
				const result = selectionPointBehavior.updateAllInPlace({
					featureCoordinates: [
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					],
					updateType: UpdateTypes.Commit,
				});

				expect(result).toBe(undefined);
			});

			it("should get updated coordinates if lengths match for Polygon", () => {
				selectionPointBehavior.create({
					featureCoordinates: [
						[
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						],
					],
					featureId: "id",
				});

				const featureCoordinatesUpdated = [
					[0, 0],
					[0, 2],
					[2, 2],
					[2, 0],
					[0, 0],
				] as Position[];

				selectionPointBehavior.updateAllInPlace({
					featureCoordinates: [featureCoordinatesUpdated],
					updateType: UpdateTypes.Commit,
				});

				const selectionPoints = config.store.copyAllWhere((properties) =>
					Boolean(properties[SELECT_PROPERTIES.SELECTION_POINT]),
				);

				expect(Array.isArray(selectionPoints)).toBe(true);

				expect(selectionPoints.length).toBe(4);
				expect(
					selectionPoints.every(
						({ geometry }, i) =>
							geometry.type === "Point" &&
							geometry.coordinates.toString() ===
								featureCoordinatesUpdated[i].toString(),
					),
				).toBe(true);
			});

			it("should get updated coordinates if lengths match for LineString", () => {
				selectionPointBehavior.create({
					featureCoordinates: [
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					],
					featureId: "id",
				});

				const featureCoordinatesUpdated = [
					[2, 2],
					[2, 3],
					[2, 2],
					[2, 3],
				] as Position[];

				selectionPointBehavior.updateAllInPlace({
					featureCoordinates: [
						[2, 2],
						[2, 3],
						[2, 2],
						[2, 3],
					],
					updateType: UpdateTypes.Commit,
				});

				const selectionPoints = config.store.copyAllWhere((properties) =>
					Boolean(properties[SELECT_PROPERTIES.SELECTION_POINT]),
				);

				expect(Array.isArray(selectionPoints)).toBe(true);

				expect(selectionPoints.length).toBe(4);
				expect(
					selectionPoints.every(
						({ geometry }, i) =>
							geometry.type === "Point" &&
							geometry.coordinates.toString() ===
								featureCoordinatesUpdated[i].toString(),
					),
				).toBe(true);
			});
		});

		describe("getOneUpdated", () => {
			it("should return undefined if trying to get updated coordinates when non exist", () => {
				const result = selectionPointBehavior.updateOneAtIndex(
					0,
					[0, 1],
					UpdateTypes.Commit,
				);
				expect(result).toBe(undefined);
			});

			it("should update coordinates if index exists", () => {
				selectionPointBehavior.create({
					featureCoordinates: [
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					],
					featureId: "id",
				});

				selectionPointBehavior.updateOneAtIndex(0, [2, 2], UpdateTypes.Commit);

				const selectionPoints = config.store.copyAllWhere((properties) =>
					Boolean(properties[SELECT_PROPERTIES.SELECTION_POINT]),
				);

				expect(Array.isArray(selectionPoints)).toBe(true);

				const result = selectionPoints.find(
					({ properties }) =>
						properties.index === 0 &&
						properties[SELECT_PROPERTIES.SELECTION_POINT] === true,
				);

				expect(result).not.toBe(undefined);
				expect(result && isUUIDV4(result.id as string)).toBe(true);
				expect(result && result.geometry.coordinates).toStrictEqual([2, 2]);
			});
		});
	});
});
