import { Position, Polygon } from "geojson";
import { UpdateTypes, COMMON_PROPERTIES } from "../common";
import {
	createStoreLineString,
	createStorePoint,
	createStorePolygon,
} from "../test/create-store-features";
import { MockBehaviorConfig } from "../test/mock-behavior-config";
import {
	CoordinateMutation,
	MutateFeatureBehavior,
	Mutations,
} from "./mutate-feature.behavior";

describe("ManipulateFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			new MutateFeatureBehavior(MockBehaviorConfig("test"), {
				validate: undefined,
				onUpdate: jest.fn(),
				onFinish: jest.fn(),
			});
		});
	});

	describe("api", () => {
		describe("createPolygonGeometry", () => {
			it("creates a feature and calls onSuccess", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const coords: Polygon["coordinates"][0] = [
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				];

				const created = behavior.createPolygon({
					coordinates: coords,
					properties: { [COMMON_PROPERTIES.CURRENTLY_DRAWING]: true },
				});

				expect(created.type).toBe("Feature");
				expect(created.geometry.type).toBe("Polygon");
				expect(created.geometry.coordinates[0]).toEqual(coords);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});
		});

		describe("updatePolygon", () => {
			it("returns null when featureId is missing", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				// @ts-expect-error testing missing id path
				const updated = behavior.updatePolygon({
					// no featureId
					context: { updateType: UpdateTypes.Commit },
				});
				expect(updated).toBeNull();
				expect(onSuccess).not.toHaveBeenCalled();
			});

			it("throws for non-Polygon geometries", () => {
				const config = MockBehaviorConfig("test");
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: jest.fn(),
					onFinish: jest.fn(),
				});

				const pointId = createStorePoint(config);

				expect(() => {
					const res = behavior.updatePolygon({
						featureId: pointId,
						context: { updateType: UpdateTypes.Commit },
						coordinateMutations: [
							{ type: Mutations.Update, index: 0, coordinate: [1, 1] },
						],
					});
				}).toThrow(
					"Polygon geometries cannot be updated on features with Point geometries",
				);
			});

			it("applies coordinate mutations (UPDATE)", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const polygonId = createStorePolygon(config); // original ring length 5

				const mutations: CoordinateMutation[] = [
					{ type: Mutations.Update, index: 1, coordinate: [0, 2] },
				];

				const updated = behavior.updatePolygon({
					featureId: polygonId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: mutations,
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("Polygon");
				const expected: Position[] = [
					[0, 0],
					[0, 2],
					[1, 1],
					[1, 0],
					[0, 0],
				];
				expect(updated!.geometry.coordinates[0]).toEqual(expected);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});

			it("applies coordinate mutations (INSERT_BEFORE)", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const polygonId = createStorePolygon(config); // original ring length 5

				const mutations: CoordinateMutation[] = [
					{ type: Mutations.InsertBefore, index: 1, coordinate: [0.5, 0.5] },
				];

				const updated = behavior.updatePolygon({
					featureId: polygonId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: mutations,
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("Polygon");
				const expected: Position[] = [
					[0, 0],
					[0.5, 0.5],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				];
				expect(updated!.geometry.coordinates[0]).toEqual(expected);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});

			it("applies coordinate mutations (DELETE)", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const polygonId = createStorePolygon(config); // original ring length 5

				const mutations: CoordinateMutation[] = [
					{ type: Mutations.Delete, index: 1 },
				];

				const updated = behavior.updatePolygon({
					featureId: polygonId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: mutations,
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("Polygon");
				const expected: Position[] = [
					[0, 0],
					[1, 1],
					[1, 0],
					[0, 0],
				];
				expect(updated!.geometry.coordinates[0]).toEqual(expected);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});

			it("applies coordinate mutations (insert/update/delete/tail insert)", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const polygonId = createStorePolygon(config); // ring length 5

				const mutations: CoordinateMutation[] = [
					{ type: Mutations.InsertBefore, index: 2, coordinate: [0.5, 0.5] }, // before original index 2
					{ type: Mutations.Update, index: 1, coordinate: [0, 2] }, // update original index 1
					{ type: Mutations.Delete, index: 3 }, // delete original index 3
					{ type: Mutations.InsertAfter, index: 4, coordinate: [9, 9] }, // tail insert (append)
				];

				const updated = behavior.updatePolygon({
					featureId: polygonId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: mutations,
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("Polygon");
				// Build expected ring from description above
				const expected: Position[] = [
					[0, 0], // C0
					[0, 2], // updated C1
					[0.5, 0.5], // insert before C2
					[1, 1], // C2 stays
					[0, 0], // C4 stays (C3 deleted)
					[9, 9], // tail insert
				];
				expect(updated!.geometry.coordinates[0]).toEqual(expected);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});

			it("applies coordinate mutations (insert/update/delete/tail insert)", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				// original length 5: [ [0, 0], [0, 1], [1, 1], [1, 0], [0, 0]],
				const polygonId = createStorePolygon(config);

				const mutations: CoordinateMutation[] = [
					{ type: Mutations.Update, index: 0, coordinate: [0, 1] }, // update first
					{ type: Mutations.InsertBefore, index: 1, coordinate: [0.5, 0.5] }, // between
					{ type: Mutations.InsertBefore, index: 2, coordinate: [2, 2] },
				];

				const updated = behavior.updatePolygon({
					featureId: polygonId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: mutations,
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("Polygon");
				const expected: Position[] = [
					[0, 1],
					[0.5, 0.5],
					[0, 1],
					[2, 2],
					[1, 1],
					[1, 0],
					[0, 0],
				];
				expect(updated!.geometry.coordinates[0]).toEqual(expected);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});

			it("supports negative indices for inserts", () => {
				const config = MockBehaviorConfig("test");
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: jest.fn(),
					onFinish: jest.fn(),
				});

				const polygonId = createStorePolygon(config); // original length 5

				// Negative index insert (-1 => before last original element)
				const updated = behavior.updatePolygon({
					featureId: polygonId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: [
						{ type: Mutations.InsertBefore, index: -1, coordinate: [7, 7] },
					],
				});
				expect(updated!.geometry.coordinates[0]).toContainEqual([
					7, 7,
				] as Position);
			});

			it("throws for out-of-bounds indices (positive and negative)", () => {
				const config = MockBehaviorConfig("test");
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: jest.fn(),
					onFinish: jest.fn(),
				});

				const polygonId = createStorePolygon(config); // original length 5

				// Out of bounds update (index === originalLength)
				expect(() =>
					behavior.updatePolygon({
						featureId: polygonId,
						context: { updateType: UpdateTypes.Commit },
						coordinateMutations: [
							{ type: Mutations.Update, index: 5, coordinate: [1, 1] },
						],
					}),
				).toThrow(RangeError);

				// Out of bounds negative index (less than -originalLength)
				expect(() =>
					behavior.updatePolygon({
						featureId: polygonId,
						context: { updateType: UpdateTypes.Commit },
						coordinateMutations: [{ type: Mutations.Delete, index: -6 }],
					}),
				).toThrow(RangeError);
			});

			it("replaces entire coordinates array when given a ReplaceMutation", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const polygonId = createStorePolygon(config); // original ring

				const newRing: Position[] = [
					[10, 10],
					[20, 10],
					[20, 20],
					[10, 20],
					[10, 10],
				];

				const updated = behavior.updatePolygon({
					featureId: polygonId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: {
						type: Mutations.Replace,
						coordinates: [newRing],
					},
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("Polygon");
				expect(updated!.geometry.coordinates[0]).toEqual(newRing);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});
		});

		describe("epsilonOffset", () => {
			it("returns >= 1e-6 for high precision and equals epsilon for lower precision", () => {
				const configHigh = MockBehaviorConfig("test", "web-mercator", 9);
				const behaviorHigh = new MutateFeatureBehavior(configHigh, {
					validate: undefined,
					onUpdate: jest.fn(),
					onFinish: jest.fn(),
				});
				expect(behaviorHigh.epsilonOffset()).toBeCloseTo(0.000001, 10);

				const configLow = MockBehaviorConfig("test", "web-mercator", 5);
				const behaviorLow = new MutateFeatureBehavior(configLow, {
					validate: undefined,
					onUpdate: jest.fn(),
					onFinish: jest.fn(),
				});
				expect(behaviorLow.epsilonOffset()).toBeCloseTo(0.0001, 10);
			});
		});

		describe("createLineString", () => {
			it("creates a LineString feature and calls onSuccess", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const coords = [
					[0, 0],
					[1, 1],
					[2, 2],
				];

				const created = behavior.createLineString({
					coordinates: coords,
					properties: { [COMMON_PROPERTIES.CURRENTLY_DRAWING]: true },
				});

				expect(created.type).toBe("Feature");
				expect(created.geometry.type).toBe("LineString");
				expect(created.geometry.coordinates).toEqual(coords);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});
		});

		describe("updateLineString", () => {
			it("returns null when featureId is missing", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				// @ts-expect-error testing missing id path
				const updated = behavior.updateLineString({
					// no featureId
					context: { updateType: UpdateTypes.Commit },
				});

				expect(updated).toBeNull();
				expect(onSuccess).not.toHaveBeenCalled();
			});

			it("throws for non-LineString geometries", () => {
				const config = MockBehaviorConfig("test");
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: jest.fn(),
					onFinish: jest.fn(),
				});

				const polygonId = createStorePolygon(config);

				expect(() => {
					behavior.updateLineString({
						featureId: polygonId,
						context: { updateType: UpdateTypes.Commit },
						coordinateMutations: [
							{ type: Mutations.Update, index: 0, coordinate: [1, 1] },
						],
					});
				}).toThrow(
					`LineString geometries cannot be updated on features with Polygon geometries`,
				);
			});

			it("applies coordinate mutations (UPDATE)", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const lineId = createStoreLineString(config); // original length 2: [[0,0],[0,1]]

				const mutations: CoordinateMutation[] = [
					{ type: Mutations.Update, index: 1, coordinate: [2, 2] }, // update first
				];

				const updated = behavior.updateLineString({
					featureId: lineId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: mutations,
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("LineString");
				const expected: Position[] = [
					[0, 0],
					[2, 2],
				];
				expect(updated!.geometry.coordinates).toEqual(expected);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});

			it("applies coordinate mutations (INSERT_BEFORE)", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const lineId = createStoreLineString(config); // original length 2: [[0,0],[0,1]]

				const mutations: CoordinateMutation[] = [
					{ type: Mutations.InsertBefore, index: 1, coordinate: [0.5, 0.5] }, // between
				];

				const updated = behavior.updateLineString({
					featureId: lineId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: mutations,
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("LineString");
				const expected: Position[] = [
					[0, 0],
					[0.5, 0.5],
					[0, 1],
				];
				expect(updated!.geometry.coordinates).toEqual(expected);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});

			it("applies coordinate mutations (DELETE)", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const lineId = createStoreLineString(config); // original length 2: [[0,0],[0,1]]

				const mutations: CoordinateMutation[] = [
					{ type: Mutations.Delete, index: 1 },
				];

				const updated = behavior.updateLineString({
					featureId: lineId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: mutations,
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("LineString");
				const expected: Position[] = [[0, 0]];
				expect(updated!.geometry.coordinates).toEqual(expected);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});

			it("applies coordinate mutations (insert/update/delete/tail insert)", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const lineId = createStoreLineString(config); // original length 2: [[0,0],[0,1]]

				const mutations: CoordinateMutation[] = [
					{ type: Mutations.Update, index: 0, coordinate: [0, 1] }, // update first
					{ type: Mutations.InsertBefore, index: 1, coordinate: [0.5, 0.5] }, // between
					{ type: Mutations.InsertAfter, index: 1, coordinate: [2, 2] }, // tail insert
				];

				const updated = behavior.updateLineString({
					featureId: lineId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: mutations,
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("LineString");
				const expected: Position[] = [
					[0, 1],
					[0.5, 0.5],
					[0, 1],
					[2, 2],
				];
				expect(updated!.geometry.coordinates).toEqual(expected);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});

			it("supports negative indices for inserts", () => {
				const config = MockBehaviorConfig("test");
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: jest.fn(),
					onFinish: jest.fn(),
				});

				const lineId = createStoreLineString(config); // original length 2

				const updated = behavior.updateLineString({
					featureId: lineId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: [
						{ type: Mutations.InsertAfter, index: -1, coordinate: [5, 5] },
					],
				});

				expect(updated!.geometry.coordinates).toEqual([
					[0, 0],
					[0, 1],
					[5, 5],
				]);
			});

			it("throws for out-of-bounds indices (positive and negative)", () => {
				const config = MockBehaviorConfig("test");
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: jest.fn(),
					onFinish: jest.fn(),
				});

				const lineId = createStoreLineString(config); // original length 2

				// Out of bounds update (index === originalLength)
				expect(() =>
					behavior.updateLineString({
						featureId: lineId,
						context: { updateType: UpdateTypes.Commit },
						coordinateMutations: [
							{ type: Mutations.Update, index: 2, coordinate: [1, 1] },
						],
					}),
				).toThrow(RangeError);

				// Out of bounds negative index (less than -originalLength)
				expect(() =>
					behavior.updateLineString({
						featureId: lineId,
						context: { updateType: UpdateTypes.Commit },
						coordinateMutations: [{ type: Mutations.Delete, index: -3 }],
					}),
				).toThrow(RangeError);
			});

			it("replaces entire coordinates array when given a ReplaceMutation", () => {
				const config = MockBehaviorConfig("test");
				const onSuccess = jest.fn();
				const behavior = new MutateFeatureBehavior(config, {
					validate: undefined,
					onUpdate: onSuccess,
					onFinish: jest.fn(),
				});

				const lineId = createStoreLineString(config);

				const newCoords: Position[] = [
					[10, 10],
					[20, 20],
					[30, 30],
				];

				const updated = behavior.updateLineString({
					featureId: lineId,
					context: { updateType: UpdateTypes.Commit },
					coordinateMutations: {
						type: Mutations.Replace,
						coordinates: newCoords,
					},
				});

				expect(updated).not.toBeNull();
				expect(updated!.geometry.type).toBe("LineString");
				expect(updated!.geometry.coordinates).toEqual(newCoords);
				expect(onSuccess).toHaveBeenCalledTimes(1);
			});
		});
	});
});
