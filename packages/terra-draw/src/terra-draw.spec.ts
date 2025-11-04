/**
 * @jest-environment jsdom
 */
import { COMMON_PROPERTIES, SELECT_PROPERTIES } from "./common";
import { FeatureId } from "./extend";
import {
	GeoJSONStoreFeatures,
	TerraDraw,
	TerraDrawLineStringMode,
	TerraDrawPointMode,
	TerraDrawPolygonMode,
	TerraDrawSelectMode,
} from "./terra-draw";
import { TerraDrawTestAdapter } from "./terra-draw.extensions.spec";
import { MockCursorEvent } from "./test/mock-cursor-event";

describe("Terra Draw", () => {
	let adapter: TerraDrawTestAdapter;

	beforeAll(() => {
		adapter = new TerraDrawTestAdapter({
			lib: {},
			coordinatePrecision: 9,
		});
	});

	describe("addFeatures", () => {
		it("respects the default id strategy", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			const result = draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(result[0].valid).toBe(true);
			expect(typeof result[0].id).toBe("string");
			const snapshot = draw.getSnapshot();
			expect(typeof snapshot[0].id).toBe("string");
			expect(snapshot[0].id).toHaveLength(36);
		});

		it("respects the user defined id strategy", () => {
			let id = 1;

			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
				idStrategy: {
					isValidId: (id) => typeof id === "number" && Number.isInteger(id),
					getId: () => id++,
				},
			});

			draw.start();

			const result = draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(result[0].valid).toBe(true);
			expect(result[0].id).toBe(1);

			const snapshot = draw.getSnapshot();
			expect(typeof snapshot[0].id).toBe("number");
			expect(snapshot[0].id).toBe(1);
		});

		it("returns invalid feature when a duplicate feature id is added", () => {
			const draw = new TerraDraw({
				adapter: adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(
				draw.addFeatures([
					{
						id: "e90e54ea-0a63-407e-b433-08717009d9f6",
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-25.431289673, 34.355907891],
						},
						properties: {
							mode: "point",
						},
					},
					{
						id: "e90e54ea-0a63-407e-b433-08717009d9f6",
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-26.431289673, 34.355907891],
						},
						properties: {
							mode: "point",
						},
					},
				]),
			).toEqual([
				{
					id: "e90e54ea-0a63-407e-b433-08717009d9f6",
					valid: true,
				},
				{
					id: "e90e54ea-0a63-407e-b433-08717009d9f6",
					reason:
						"Feature already exists with this id: e90e54ea-0a63-407e-b433-08717009d9f6",
					valid: false,
				},
			]);
		});

		it("returns invalid feature when an incorrect id strategy is used", () => {
			const draw = new TerraDraw({
				adapter: adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(
				draw.addFeatures([
					{
						id: 1,
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-25.431289673, 34.355907891],
						},
						properties: {
							mode: "point",
						},
					},
					{
						id: 2,
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-26.431289673, 34.355907891],
						},
						properties: {
							mode: "point",
						},
					},
				]),
			).toEqual([
				{
					id: 1,
					reason: "Feature must match the id strategy (default is UUID4)",
					valid: false,
				},
				{
					id: 2,
					reason: "Feature must match the id strategy (default is UUID4)",
					valid: false,
				},
			]);
		});

		it("returns invalid feature when the modes do not match any instantiated modes", () => {
			const draw = new TerraDraw({
				adapter: adapter,
				modes: [new TerraDrawPolygonMode()],
			});

			draw.start();

			expect(
				draw.addFeatures([
					{
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-25.431289673, 34.355907891],
						},
						properties: {
							mode: "point",
						},
					},
					{
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-26.431289673, 34.355907891],
						},
						properties: {
							mode: "rectangle",
						},
					},
				]),
			).toEqual([
				{
					id: expect.any(String),
					reason: "point mode is not in the list of instantiated modes",
					valid: false,
				},
				{
					id: expect.any(String),
					reason: "rectangle mode is not in the list of instantiated modes",
					valid: false,
				},
			]);
		});

		it("returns valid false if the coordinate precision is excessive", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			const onChange = jest.fn();

			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(result.valid).toBe(false);
			expect(result.reason).toBe(
				"Feature has coordinates with excessive precision",
			);

			expect(onChange).not.toHaveBeenCalled();
		});

		it("returns valid true if the coordinate precision is exactly the adapter coordinate precision", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 9,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			const onChange = jest.fn();

			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(result.valid).toBe(true);
			expect(result.reason).toBe(undefined);

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith([expect.any(String)], "create", {
				origin: "api",
			});
		});

		it("throws an error if not enabled", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			const onChange = jest.fn();

			draw.on("change", onChange);

			draw.start();
			draw.stop();

			expect(() => {
				draw.addFeatures([
					{
						id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-25, 34],
						},
						properties: {
							mode: "point",
						},
					},
				]);
			}).toThrow("Terra Draw is not enabled");

			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe("getFeatureId", () => {
		it("respects the default id strategy", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			const featureId = draw.getFeatureId();
			expect(typeof featureId).toBe("string");
			expect(featureId).toHaveLength(36);

			const featureId2 = draw.getFeatureId();
			expect(typeof featureId2).toBe("string");
			expect(featureId2).toHaveLength(36);

			expect(featureId).not.toBe(featureId2);
		});

		it("respects the user defined id strategy", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
				idStrategy: {
					isValidId: (id) => typeof id === "number" && Number.isInteger(id),
					getId: (function () {
						let id = 0;
						return function () {
							return ++id;
						};
					})(),
				},
			});

			draw.start();

			const featureId = draw.getFeatureId();
			expect(typeof featureId).toBe("number");
			expect(featureId).toBe(1);

			const featureId2 = draw.getFeatureId();
			expect(typeof featureId2).toBe("number");
			expect(featureId2).toBe(2);

			expect(featureId).not.toBe(featureId2);
		});
	});

	describe("hasFeature", () => {
		it("returns true if there is a feature with a given id", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();
			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			const id = draw.getSnapshot()[0].id as string;

			expect(draw.hasFeature(id)).toBe(true);
		});

		it("returns false if there is no feature with a given id", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(draw.hasFeature("f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8")).toBe(
				false,
			);
		});
	});

	describe("getSnapshotFeature", () => {
		it("returns the correct feature for an id", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();
			const [result] = draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			const feature = draw.getSnapshotFeature(result.id as FeatureId);

			expect(feature).toEqual({
				geometry: {
					coordinates: [-25.431289673, 34.355907891],
					type: "Point",
				},
				id: expect.any(String),
				properties: {
					mode: "point",
				},
				type: "Feature",
			});
		});

		it("returns undefined if feature does not exist for an id", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			const feature = draw.getSnapshotFeature(0);

			expect(feature).toEqual(undefined);
		});
	});

	describe("updateModeOptions", () => {
		it("updates the mode options", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			draw.updateModeOptions("point", {
				editable: true,
				cursors: { start: "move" },
			});
		});

		it("updates the mode styles", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			const onStyleChange = jest.fn();

			const onChange = jest.fn((_, type) => {
				if (type === "styling") {
					onStyleChange();
				}
			});

			draw.on("change", onChange);

			draw.start();

			draw.updateModeOptions<typeof TerraDrawPointMode>("point", {
				styles: {
					pointWidth: 5,
					pointColor: "#000000",
					pointOutlineColor: "#000000",
					pointOutlineWidth: 2,
					editedPointColor: "#000000",
					editedPointWidth: 5,
					editedPointOutlineColor: "#000000",
					editedPointOutlineWidth: 2,
				},
			});

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onStyleChange).toHaveBeenCalledTimes(1);
		});
	});

	describe("selectFeature", () => {
		it("throws an error if there is no select mode present", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();
			draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(() => {
				draw.selectFeature("f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8");
			}).toThrow("No select mode defined in instance");
		});

		it("returns false if there is no feature with a given id", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			draw.start();
			draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			draw.selectFeature("f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8");

			const snapshot = draw.getSnapshot();
			expect(snapshot.length).toBe(1);

			const feature = draw.getSnapshot()[0];
			expect(feature.properties.selected).toBe(true);
		});
	});

	describe("removeFeatures", () => {
		it("correctly removes a feature as expected", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25, 34],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(onChange).toHaveBeenCalledTimes(1);

			expect(result.valid).toBe(true);

			draw.removeFeatures([result.id as FeatureId]);

			expect(onChange).toHaveBeenCalledTimes(2);
			expect(onChange).toHaveBeenCalledWith([result.id], "delete", {
				origin: "api",
			});

			expect(draw.getSnapshot()).toHaveLength(0);
		});

		it("throws an error if not enabled", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25, 34],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(onChange).toHaveBeenCalledTimes(1);

			expect(result.valid).toBe(true);

			draw.stop();

			expect(() => {
				draw.removeFeatures([result.id as FeatureId]);
			}).toThrow("Terra Draw is not enabled");
		});

		it("throws an error trying to remove non-existent feature", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			draw.start();

			expect(() => {
				draw.removeFeatures(["123" as FeatureId]);
			}).toThrow("No feature with id 123, can not delete");
		});

		it("removes coordinate points and selection points if they are present", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPolygonMode({ showCoordinatePoints: true }),
					new TerraDrawSelectMode({
						flags: {
							polygon: {
								feature: {
									draggable: true,
									coordinates: {
										draggable: true,
										deletable: true,
										midpoints: true,
									},
								},
							},
						},
					}),
				],
			});

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			expect(result.valid).toBe(true);

			draw.setMode("select");

			draw.selectFeature(result.id as FeatureId);

			// 4 selection points, 4 coordinate points, 4 midpoints, 1 polygon = 13
			expect(draw.getSnapshot()).toHaveLength(13);

			draw.removeFeatures([result.id as FeatureId]);

			expect(draw.getSnapshot()).toHaveLength(0);
		});

		it("can handle removing and re-adding a polygon when showCoordinatePoints is true", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPolygonMode({ showCoordinatePoints: true }),
					new TerraDrawSelectMode({
						flags: {
							polygon: {
								feature: {
									draggable: true,
									coordinates: {
										draggable: true,
										deletable: true,
										midpoints: true,
									},
								},
							},
						},
					}),
				],
			});

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			expect(result.valid).toBe(true);

			draw.setMode("select");

			draw.selectFeature(result.id as FeatureId);

			// 4 selection points, 4 coordinate points, 4 midpoints, 1 polygon = 13
			expect(draw.getSnapshot()).toHaveLength(13);

			const polygon = draw.getSnapshotFeature(result.id as FeatureId);

			if (!polygon) {
				throw new Error("Polygon not found");
			}

			draw.removeFeatures([result.id as FeatureId]);

			draw.addFeatures([polygon]);

			expect(draw.getSnapshot()).toHaveLength(5);
		});
	});

	describe("updateFeatureProperties", () => {
		const baseFeature = {
			id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
			type: "Feature",
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[25, 34],
						[26, 35],
						[27, 34],
						[25, 34],
					],
				],
			},
			properties: {
				mode: "polygon",
			},
		} as GeoJSONStoreFeatures;

		it("correctly updates a feature property", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawPolygonMode()],
			});

			draw.start();

			draw.addFeatures([{ ...baseFeature }]);

			draw.updateFeatureProperties(baseFeature.id as FeatureId, {
				customProperty: "customValue",
			});

			expect(
				draw.getSnapshotFeature(baseFeature.id as FeatureId)?.properties
					.customProperty,
			).toBe("customValue");
		});

		it("correctly updates a feature property multiple times", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawPolygonMode()],
			});

			draw.start();

			draw.addFeatures([{ ...baseFeature }]);

			draw.updateFeatureProperties(baseFeature.id as FeatureId, {
				customProperty: "customValue",
			});

			draw.updateFeatureProperties(baseFeature.id as FeatureId, {
				customProperty: "newCustomValue",
			});

			expect(
				draw.getSnapshotFeature(baseFeature.id as FeatureId)?.properties
					.customProperty,
			).toBe("newCustomValue");
		});

		it("unsets a feature property if undefined is passed", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawPolygonMode()],
			});

			draw.start();

			draw.addFeatures([{ ...baseFeature }]);

			draw.updateFeatureProperties(baseFeature.id as FeatureId, {
				customProperty: "customValue",
			});

			expect(
				draw.getSnapshotFeature(baseFeature.id as FeatureId)?.properties
					.customProperty,
			).toBe("customValue");

			draw.updateFeatureProperties(baseFeature.id as FeatureId, {
				customProperty: undefined,
			});

			expect(baseFeature.hasOwnProperty("customProperty")).toBe(false);
		});

		it("fails to update a feature property if the property is a reserved internal property", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawPolygonMode()],
			});

			draw.start();

			draw.addFeatures([{ ...baseFeature }]);

			[
				...Object.values(COMMON_PROPERTIES),
				...Object.values(SELECT_PROPERTIES),
			].forEach((property) => {
				expect(() => {
					draw.updateFeatureProperties(baseFeature.id as FeatureId, {
						[property]: "customValue",
					});
				}).toThrow(
					`You are trying to update a reserved property name: ${property}. Please choose another name.`,
				);
			});
		});

		it("fails to update a feature property if the passed value is not valid JSON", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawPolygonMode()],
			});

			draw.start();

			draw.addFeatures([{ ...baseFeature }]);

			[
				Symbol(),
				new Map(),
				new Set(),
				new Date(),
				new Int32Array(),
				new WeakMap(),
				new ArrayBuffer(0),
				new Float32Array(),
				new Uint8Array(),
				new BigInt64Array(),
				() => {},
				NaN,
				Infinity,
				-Infinity,
				{ a: () => {} },
				{ a: undefined },
				{ a: Symbol() },
				[undefined],
			].forEach((value) => {
				expect(() => {
					draw.updateFeatureProperties(baseFeature.id as FeatureId, {
						customProperty: value as unknown as string,
					});
				}).toThrow(`Invalid JSON value provided for property customProperty`);

				expect(() => {
					draw.updateFeatureProperties(baseFeature.id as FeatureId, {
						customProperty: {
							nestedCustomProperty: value as unknown as string,
						},
					});
				}).toThrow(`Invalid JSON value provided for property customProperty`);
			});
		});

		it("correctly updates multiple feature properties", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawPolygonMode()],
			});

			draw.start();

			draw.addFeatures([{ ...baseFeature }]);

			draw.updateFeatureProperties(baseFeature.id as FeatureId, {
				customProperty: "customValue",
				anotherProperty: "anotherValue",
			});

			expect(
				draw.getSnapshotFeature(baseFeature.id as FeatureId)?.properties
					.customProperty,
			).toBe("customValue");
			expect(
				draw.getSnapshotFeature(baseFeature.id as FeatureId)?.properties
					.anotherProperty,
			).toBe("anotherValue");
		});

		it("fails to update multiple feature properties if any property is reserved", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawPolygonMode()],
			});

			draw.start();

			draw.addFeatures([{ ...baseFeature }]);

			expect(() => {
				draw.updateFeatureProperties(baseFeature.id as FeatureId, {
					customProperty: "customValue",
					anotherProperty: "anotherValue",
					[COMMON_PROPERTIES.MODE]: "point",
				});
			}).toThrow(
				`You are trying to update a reserved property name: ${COMMON_PROPERTIES.MODE}. Please choose another name.`,
			);

			expect(
				draw.getSnapshotFeature(baseFeature.id as FeatureId)?.properties
					.customProperty,
			).toBe(undefined);
			expect(
				draw.getSnapshotFeature(baseFeature.id as FeatureId)?.properties
					.anotherProperty,
			).toBe(undefined);
		});
	});

	describe("updateFeatureGeometry", () => {
		it("correctly updates a point geometry", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawPointMode(), new TerraDrawSelectMode()],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [25, 34],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(result.valid).toBe(true);

			onChange.mockClear();

			draw.updateFeatureGeometry(result.id as FeatureId, {
				type: "Point",
				coordinates: [-26, -34],
			});

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith([result.id], "update", {
				origin: "api",
			});

			const snapshot = draw.getSnapshot();
			expect(snapshot).toHaveLength(1);

			const updatedFeature = snapshot[0];
			expect(updatedFeature.id).toBe(result.id);

			expect(updatedFeature.geometry.coordinates).toEqual([-26, -34]);
		});

		it("correctly updates a linestring geometry", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawLineStringMode(), new TerraDrawSelectMode()],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[25, 34],
							[26, 35],
						],
					},
					properties: {
						mode: "linestring",
					},
				},
			]);

			expect(result.valid).toBe(true);

			onChange.mockClear();

			draw.updateFeatureGeometry(result.id as FeatureId, {
				type: "LineString",
				coordinates: [
					[-25, -34],
					[-26, -35],
				],
			});

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith([result.id], "update", {
				origin: "api",
			});

			const snapshot = draw.getSnapshot();
			expect(snapshot).toHaveLength(1);

			const updatedFeature = snapshot[0];
			expect(updatedFeature.id).toBe(result.id);

			expect(updatedFeature.geometry.coordinates).toEqual([
				[-25, -34],
				[-26, -35],
			]);
		});

		it("correctly updates a polygon geometry", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [new TerraDrawPolygonMode(), new TerraDrawSelectMode()],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[25, 34],
								[26, 35],
								[27, 34],
								[25, 34],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			expect(result.valid).toBe(true);

			onChange.mockClear();

			draw.updateFeatureGeometry(result.id as FeatureId, {
				type: "Polygon",
				coordinates: [
					[
						[-25, -34],
						[-26, -35],
						[-27, -34],
						[-25, -34],
					],
				],
			});

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith([result.id], "update", {
				origin: "api",
			});

			const snapshot = draw.getSnapshot();
			expect(snapshot).toHaveLength(1);

			const updatedFeature = snapshot[0];
			expect(updatedFeature.id).toBe(result.id);

			expect(updatedFeature.geometry.coordinates).toEqual([
				[
					[-25, -34],
					[-26, -35],
					[-27, -34],
					[-25, -34],
				],
			]);
		});

		it("correctly updates a polygon geometry when it is selected", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPolygonMode(),
					new TerraDrawSelectMode({
						flags: {
							polygon: {
								feature: {
									draggable: true,
									coordinates: {},
								},
							},
						},
					}),
				],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[25, 34],
								[26, 35],
								[27, 34],
								[25, 34],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			expect(result.valid).toBe(true);

			draw.selectFeature(result.id as FeatureId);

			const snapshotBefore = draw.getSnapshot();
			expect(snapshotBefore).toHaveLength(4);

			onChange.mockClear();

			draw.updateFeatureGeometry(result.id as FeatureId, {
				type: "Polygon",
				coordinates: [
					[
						[-25, -34],
						[-26, -35],
						[-27, -34],
						[-25, -34],
					],
				],
			});

			expect(onChange).toHaveBeenCalledTimes(3);
			expect(onChange).toHaveBeenCalledWith([result.id], "update", {
				origin: "api",
			});

			const snapshot = draw.getSnapshot();
			expect(snapshot).toHaveLength(4);

			const updatedFeature = snapshot[0];
			expect(updatedFeature.id).toBe(result.id);

			expect(updatedFeature.geometry.coordinates).toEqual([
				[
					[-25, -34],
					[-26, -35],
					[-27, -34],
					[-25, -34],
				],
			]);

			// Coordinate points are also updated
			const coordinatePoints = snapshot.filter(
				(f) => f.properties[SELECT_PROPERTIES.SELECTION_POINT],
			);
			expect(coordinatePoints).toHaveLength(3);
			expect(coordinatePoints[0].geometry.coordinates).toEqual([-25, -34]);
			expect(coordinatePoints[1].geometry.coordinates).toEqual([-26, -35]);
			expect(coordinatePoints[2].geometry.coordinates).toEqual([-27, -34]);
		});

		it("fails when geometry is malformed", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [25, 34],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			onChange.mockClear();

			expect(() => {
				draw.updateFeatureGeometry(result.id as FeatureId, {} as any);
			}).toThrow("Invalid geometry provided");
		});

		it("fails when geometry types mismatch", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [25, 34],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			onChange.mockClear();

			expect(() => {
				draw.updateFeatureGeometry(result.id as FeatureId, {
					type: "LineString",
					coordinates: [
						[-26, -34],
						[-27, -35],
					],
				});
			}).toThrow("Geometry type mismatch: expected Point, got LineString");
		});

		it("fails when geometry coordinates are empty", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [25, 34],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			onChange.mockClear();

			expect(() => {
				draw.updateFeatureGeometry(result.id as FeatureId, {
					type: "Point",
					coordinates: [],
				});
			}).toThrow("Feature validation failed: Feature has invalid coordinates");
		});

		it("fails when geometry coordinates are not in bounds", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [25, 34],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			onChange.mockClear();

			expect(() => {
				draw.updateFeatureGeometry(result.id as FeatureId, {
					type: "Point",
					coordinates: [-1000, 1000],
				});
			}).toThrow("Feature validation failed: Feature has invalid coordinates");
		});

		it("fails when feature is guidance feature", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 3,
				}),
				modes: [
					new TerraDrawPolygonMode(),
					new TerraDrawSelectMode({
						flags: {
							polygon: {
								feature: {
									coordinates: {
										draggable: true,
									},
								},
							},
						},
					}),
				],
			});

			const onChange = jest.fn();
			draw.on("change", onChange);

			draw.start();
			const [result] = draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[25, 34],
								[26, 35],
								[27, 34],
								[25, 34],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			draw.selectFeature(result.id as FeatureId);

			onChange.mockClear();

			const guidanceFeature = draw
				.getSnapshot()
				.find((f) => f.properties[SELECT_PROPERTIES.SELECTION_POINT]);

			expect(guidanceFeature).toBeDefined();

			expect(() => {
				draw.updateFeatureGeometry(guidanceFeature!.id as FeatureId, {
					type: "Point",
					coordinates: [-26, -34],
				});
			}).toThrow("Guidance features are not allowed to be updated directly");
		});
	});

	describe("transformFeatureGeometry", () => {
		describe.each(["rotate", "scale"] as const)(
			"called with %s transform",
			(transformType) => {
				const options = {
					rotate: {
						angle: 90,
					},
					scale: {
						xScale: 2,
						yScale: 2,
					},
				}[transformType];

				it("throws an error for globe projection", () => {
					const draw = new TerraDraw({
						adapter: new TerraDrawTestAdapter({
							lib: {},
							coordinatePrecision: 3,
						}),
						modes: [new TerraDrawPolygonMode(), new TerraDrawSelectMode()],
					});

					const onChange = jest.fn();
					draw.on("change", onChange);

					draw.start();
					const [result] = draw.addFeatures([
						{
							id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
							type: "Feature",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[25, 34],
										[26, 35],
										[27, 34],
										[25, 34],
									],
								],
							},
							properties: {
								mode: "polygon",
							},
						},
					]);

					expect(result.valid).toBe(true);

					onChange.mockClear();

					draw.transformFeatureGeometry(result.id as FeatureId, {
						type: transformType,
						projection: "web-mercator",
						origin: [25, 34],
						options: options as any,
					});

					expect(result.valid).toBe(true);

					onChange.mockClear();

					expect(() => {
						draw.transformFeatureGeometry(result.id as FeatureId, {
							type: transformType,
							projection: "globe" as any,
							origin: [25, 34],
							options: options as any,
						});
					}).toThrow(
						`Projection globe is not currently supported for transformation`,
					);

					expect(onChange).toHaveBeenCalledTimes(0);
				});

				it("throws an error for a point geometry", () => {
					const draw = new TerraDraw({
						adapter: new TerraDrawTestAdapter({
							lib: {},
							coordinatePrecision: 3,
						}),
						modes: [new TerraDrawPointMode(), new TerraDrawSelectMode()],
					});

					const onChange = jest.fn();
					draw.on("change", onChange);

					draw.start();
					const [result] = draw.addFeatures([
						{
							id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [25, 34],
							},
							properties: {
								mode: "point",
							},
						},
					]);

					expect(result.valid).toBe(true);

					onChange.mockClear();

					expect(() => {
						draw.transformFeatureGeometry(result.id as FeatureId, {
							type: transformType,
							projection: "web-mercator",
							origin: [25, 34],
							options: options as any,
						});
					}).toThrow(
						`Feature geometry type Point is not supported for transformation`,
					);

					expect(onChange).toHaveBeenCalledTimes(0);
				});

				it("correctly updates a linestring geometry", () => {
					const draw = new TerraDraw({
						adapter: new TerraDrawTestAdapter({
							lib: {},
							coordinatePrecision: 3,
						}),
						modes: [new TerraDrawLineStringMode(), new TerraDrawSelectMode()],
					});

					const onChange = jest.fn();
					draw.on("change", onChange);

					draw.start();
					const [result] = draw.addFeatures([
						{
							id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
							type: "Feature",
							geometry: {
								type: "LineString",
								coordinates: [
									[25, 34],
									[26, 35],
								],
							},
							properties: {
								mode: "linestring",
							},
						},
					]);

					expect(result.valid).toBe(true);

					onChange.mockClear();

					draw.transformFeatureGeometry(result.id as FeatureId, {
						type: transformType,
						projection: "web-mercator",
						origin: [25, 34],
						options: options as any,
					});

					expect(onChange).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledWith([result.id], "update", {
						origin: "api",
					});

					const snapshot = draw.getSnapshot();
					expect(snapshot).toHaveLength(1);

					const updatedFeature = snapshot[0];
					expect(updatedFeature.id).toBe(result.id);

					expect(updatedFeature.geometry.coordinates).toEqual(
						transformType === "rotate"
							? [
									[26.107, 34.088],
									[24.893, 34.913],
								]
							: [
									[25, 34],
									[27, 35.988],
								],
					);
				});

				it("correctly updates a polygon geometry", () => {
					const draw = new TerraDraw({
						adapter: new TerraDrawTestAdapter({
							lib: {},
							coordinatePrecision: 3,
						}),
						modes: [new TerraDrawPolygonMode(), new TerraDrawSelectMode()],
					});

					const onChange = jest.fn();
					draw.on("change", onChange);

					draw.start();
					const [result] = draw.addFeatures([
						{
							id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
							type: "Feature",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[25, 34],
										[26, 35],
										[27, 34],
										[25, 34],
									],
								],
							},
							properties: {
								mode: "polygon",
							},
						},
					]);

					expect(result.valid).toBe(true);

					onChange.mockClear();

					draw.transformFeatureGeometry(result.id as FeatureId, {
						type: transformType,
						projection: "web-mercator",
						origin: [25, 34],
						options: options as any,
					});

					expect(onChange).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledWith([result.id], "update", {
						origin: "api",
					});

					const snapshot = draw.getSnapshot();
					expect(snapshot).toHaveLength(1);

					const updatedFeature = snapshot[0];
					expect(updatedFeature.id).toBe(result.id);

					expect(updatedFeature.geometry.coordinates).toEqual(
						transformType === "rotate"
							? [
									[
										[26.053, 33.629],
										[24.84, 34.458],
										[26.053, 35.278],
										[26.053, 33.629],
									],
								]
							: [
									[
										[25, 34],
										[27.0, 35.988],
										[29, 34],
										[25, 34],
									],
								],
					);
				});

				it("correctly updates a polygon geometry when it is selected", () => {
					const draw = new TerraDraw({
						adapter: new TerraDrawTestAdapter({
							lib: {},
							coordinatePrecision: 3,
						}),
						modes: [
							new TerraDrawPolygonMode(),
							new TerraDrawSelectMode({
								flags: {
									polygon: {
										feature: {
											draggable: true,
											coordinates: {},
										},
									},
								},
							}),
						],
					});

					const onChange = jest.fn();
					draw.on("change", onChange);

					draw.start();
					const [result] = draw.addFeatures([
						{
							id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
							type: "Feature",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[25, 34],
										[26, 35],
										[27, 34],
										[25, 34],
									],
								],
							},
							properties: {
								mode: "polygon",
							},
						},
					]);

					expect(result.valid).toBe(true);

					draw.selectFeature(result.id as FeatureId);

					const snapshotBefore = draw.getSnapshot();
					expect(snapshotBefore).toHaveLength(4);

					onChange.mockClear();

					draw.transformFeatureGeometry(result.id as FeatureId, {
						type: transformType,
						projection: "web-mercator",
						origin: [25, 34],
						options: options as any,
					});

					expect(onChange).toHaveBeenCalledTimes(3);
					expect(onChange).toHaveBeenCalledWith([result.id], "update", {
						origin: "api",
					});

					const snapshot = draw.getSnapshot();
					expect(snapshot).toHaveLength(4);

					const updatedFeature = snapshot[0];
					expect(updatedFeature.id).toBe(result.id);

					expect(updatedFeature.geometry.coordinates).toEqual(
						transformType === "rotate"
							? [
									[
										[26.053, 33.629],
										[24.84, 34.458],
										[26.053, 35.278],
										[26.053, 33.629],
									],
								]
							: [
									[
										[25, 34],
										[27.0, 35.988],
										[29, 34],
										[25, 34],
									],
								],
					);

					// Coordinate points are also updated
					const coordinatePoints = snapshot.filter(
						(f) => f.properties[SELECT_PROPERTIES.SELECTION_POINT],
					);
					expect(coordinatePoints).toHaveLength(3);
					expect(coordinatePoints[0].geometry.coordinates).toEqual(
						transformType === "rotate" ? [26.053, 33.629] : [25, 34],
					);
					expect(coordinatePoints[1].geometry.coordinates).toEqual(
						transformType === "rotate" ? [24.84, 34.458] : [27.0, 35.988],
					);
					expect(coordinatePoints[2].geometry.coordinates).toEqual(
						transformType === "rotate" ? [26.053, 35.278] : [29, 34],
					);
				});

				it("fails when feature is guidance feature", () => {
					const draw = new TerraDraw({
						adapter: new TerraDrawTestAdapter({
							lib: {},
							coordinatePrecision: 3,
						}),
						modes: [
							new TerraDrawPolygonMode(),
							new TerraDrawSelectMode({
								flags: {
									polygon: {
										feature: {
											coordinates: {
												draggable: true,
											},
										},
									},
								},
							}),
						],
					});

					const onChange = jest.fn();
					draw.on("change", onChange);

					draw.start();
					const [result] = draw.addFeatures([
						{
							id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
							type: "Feature",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[25, 34],
										[26, 35],
										[27, 34],
										[25, 34],
									],
								],
							},
							properties: {
								mode: "polygon",
							},
						},
					]);

					draw.selectFeature(result.id as FeatureId);

					onChange.mockClear();

					const guidanceFeature = draw
						.getSnapshot()
						.find((f) => f.properties[SELECT_PROPERTIES.SELECTION_POINT]);

					expect(guidanceFeature).toBeDefined();

					expect(() => {
						draw.transformFeatureGeometry(guidanceFeature!.id as FeatureId, {
							type: transformType,
							projection: "web-mercator",
							origin: [25, 34],
							options: options as any,
						});
					}).toThrow(
						"Guidance features are not allowed to be updated directly",
					);
				});
			},
		);
	});

	describe("deselectFeature", () => {
		it("throws an error if there is no select moded", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(() => {
				draw.deselectFeature("f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8");
			}).toThrow("No select mode defined in instance");
		});

		it("returns false if there is no feature with a given id", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawSelectMode({
						flags: {
							point: {
								feature: { draggable: true },
							},
						},
					}),
				],
			});

			draw.start();
			draw.addFeatures([
				{
					id: "f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			draw.selectFeature("f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8");

			const snapshotAfterSelect = draw.getSnapshot();
			expect(snapshotAfterSelect.length).toBe(1);

			const featureAfterSelect = draw.getSnapshot()[0];
			expect(featureAfterSelect.properties.selected).toBe(true);

			draw.deselectFeature("f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8");

			const snapshotAfterDeselect = draw.getSnapshot();
			expect(snapshotAfterDeselect.length).toBe(1);

			const featureAfterDeselect = draw.getSnapshot()[0];
			expect(featureAfterDeselect.properties.selected).toBe(false);
		});
	});

	describe("clear", () => {
		const point = {
			type: "Feature",
			geometry: {
				type: "Point",
				coordinates: [0, 0],
			},
			properties: {
				mode: "point",
			},
		} as GeoJSONStoreFeatures;

		it("clears the store in static mode", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(draw.enabled).toBe(false);

			draw.start();

			draw.addFeatures([point]);

			draw.clear();

			const snapshot = draw.getSnapshot();

			expect(snapshot).toHaveLength(0);
		});

		it("clears the store in point mode", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(draw.enabled).toBe(false);

			draw.start();

			draw.setMode("point");

			draw.addFeatures([point]);

			draw.clear();

			const snapshot = draw.getSnapshot();

			expect(snapshot).toHaveLength(0);
		});

		it("does not throw if called multiple times in point mode", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(draw.enabled).toBe(false);

			draw.start();

			draw.setMode("point");

			draw.addFeatures([point]);

			draw.clear();
			let snapshot = draw.getSnapshot();
			expect(snapshot).toHaveLength(0);

			draw.clear();
			snapshot = draw.getSnapshot();
			expect(snapshot).toHaveLength(0);

			draw.clear();
			snapshot = draw.getSnapshot();
			expect(snapshot).toHaveLength(0);
		});

		it("throws an error if trying to clear whilst unregistered (never started)", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(() => {
				draw.clear();
			}).toThrow("Terra Draw is not enabled");
		});

		it("throws an error if trying to clear whilst unregistered (started then stopped)", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(draw.enabled).toBe(false);

			draw.start();

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [0, 0],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			draw.stop();

			expect(() => {
				draw.clear();
			}).toThrow("Terra Draw is not enabled");
		});
	});

	describe("enabled", () => {
		it("returns false if disabled", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(draw.enabled).toBe(false);
		});

		it("returns true if enabled", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(draw.enabled).toBe(true);
		});

		it("throws an error if trying to set enabled directly (it is a read only property)", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(() => {
				draw.enabled = true;
			}).toThrow("Enabled is read only");
		});
	});

	describe("setMode", () => {
		it("point mode when mode is set", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(draw.getMode()).toBe("static");

			draw.setMode("point");

			expect(draw.getMode()).toBe("point");
		});
	});

	describe("getModeState", () => {
		it("returns registered", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 9,
				}),
				modes: [new TerraDrawPointMode()],
			});

			expect(draw.getModeState()).toBe("registered");
		});

		it("returns started", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 9,
				}),
				modes: [new TerraDrawPointMode()],
			});

			draw.start();
			draw.setMode("point");

			expect(draw.getModeState()).toBe("started");
		});

		it("returns drawing", () => {
			const linestringMode = new TerraDrawLineStringMode();

			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 9,
				}),
				modes: [linestringMode],
			});

			draw.start();
			draw.setMode("linestring");

			// NOTE: we shouldn't call a mode's onClick directly, but this is a test
			linestringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(draw.getModeState()).toBe("drawing");
		});

		it("returns selecting", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawTestAdapter({
					lib: {},
					coordinatePrecision: 9,
				}),
				modes: [new TerraDrawLineStringMode(), new TerraDrawSelectMode()],
			});

			draw.start();
			draw.setMode("select");

			expect(draw.getModeState()).toBe("selecting");
		});
	});

	describe("getFeaturesAtLngLat", () => {
		it("gets features at a given longitude and latitude", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [
					new TerraDrawPointMode(),
					new TerraDrawLineStringMode(),
					new TerraDrawPolygonMode(),
				],
			});

			draw.start();

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [0, 0],
					},
					properties: {
						mode: "point",
					},
				},
				{
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[0, 0],
							[1, 1],
						],
					},
					properties: {
						mode: "linestring",
					},
				},
				{
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			const features = draw.getFeaturesAtLngLat({ lng: 0, lat: 0 });

			expect(features).toHaveLength(3);
			expect(features[0].geometry.type).toBe("Point");
			expect(features[0].geometry.coordinates).toEqual([0, 0]);
			expect(features[1].geometry.type).toBe("LineString");
			expect(features[1].geometry.coordinates).toEqual([
				[0, 0],
				[1, 1],
			]);
			expect(features[2].geometry.type).toBe("Polygon");
			expect(features[2].geometry.coordinates).toEqual([
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
			]);
		});

		it("filters out coordinate points if ignoreSnappingPoints set to true", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [
					new TerraDrawPolygonMode({
						snapping: {
							toCoordinate: true,
						},
					}),
				],
			});

			draw.start();
			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreSnappingPoints: true,
				},
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.type).toBe("Polygon");
			expect(features[0].geometry.coordinates).toEqual([
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
			]);
		});

		it("filters out coordinate points if ignoreSnappingPoints set to false", () => {
			const polygonMode = new TerraDrawPolygonMode({
				snapping: {
					toCoordinate: true,
				},
			});

			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});

			draw.start();
			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			polygonMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreSnappingPoints: false,
				},
			);

			expect(features).toHaveLength(2);
			expect(features[0].geometry.type).toBe("Polygon");
			expect(features[0].geometry.coordinates).toEqual([
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
			]);
			expect(features[1].geometry.type).toBe("Point");
			expect(features[1].geometry.coordinates).toEqual([0, 0]);
		});

		it("filters out points and linestrings that are not within the pointer distance", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode(), new TerraDrawLineStringMode()],
			});

			draw.start();
			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [0, 0],
					},
					properties: {
						mode: "point",
					},
				},
				{
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[0, 0],
							[1, 1],
						],
					},
					properties: {
						mode: "linestring",
					},
				},
			]);

			const features = draw.getFeaturesAtLngLat({ lng: 50, lat: 50 });

			expect(features).toHaveLength(0);
		});

		it("filters out coordinate points if ignoreCoordinatePoints set to true", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [
					new TerraDrawPolygonMode({
						showCoordinatePoints: true,
					}),
				],
			});

			draw.start();
			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreCoordinatePoints: true,
				},
			);

			expect(features).toHaveLength(1);
		});

		it("does not filter out coordinate points if ignoreCoordinatePoints set to false", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [
					new TerraDrawPolygonMode({
						showCoordinatePoints: true,
					}),
				],
			});

			draw.start();
			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreCoordinatePoints: false,
				},
			);

			expect(features).toHaveLength(5);
		});

		it("filters out selection points if ignoreSelectFeatures set to true", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [
					new TerraDrawPolygonMode(),
					new TerraDrawSelectMode({
						flags: {
							polygon: {
								feature: {
									coordinates: {
										draggable: true,
									},
								},
							},
						},
					}),
				],
			});

			draw.start();
			const [{ id }] = draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			draw.selectFeature(id as FeatureId);

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreSelectFeatures: true,
				},
			);

			expect(features).toHaveLength(1);
		});

		it("does not filter out selection points if ignoreSelectFeatures set to false", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [
					new TerraDrawPolygonMode(),
					new TerraDrawSelectMode({
						flags: {
							polygon: {
								feature: {
									coordinates: {
										draggable: true,
									},
								},
							},
						},
					}),
				],
			});

			draw.start();
			const [{ id }] = draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[0, 1],
								[1, 1],
								[1, 0],
								[0, 0],
							],
						],
					},
					properties: {
						mode: "polygon",
					},
				},
			]);

			draw.selectFeature(id as FeatureId);

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreSelectFeatures: false,
				},
			);

			expect(features).toHaveLength(5);
		});

		it("filters out currently drawn features if ignoreCurrentlyDrawing set to true", () => {
			const polygonMode = new TerraDrawPolygonMode();

			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});

			draw.start();
			draw.setMode("polygon");

			// NOTE: we shouldn't call a mode's onClick directly, but this is a test
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreCurrentlyDrawing: true,
				},
			);

			expect(features).toHaveLength(0);
		});

		it("filters out currently drawn features if ignoreCurrentlyDrawing set to false", () => {
			const polygonMode = new TerraDrawPolygonMode();

			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});

			draw.start();
			draw.setMode("polygon");

			// NOTE: we shouldn't call a mode's onClick directly, but this is a test
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreCurrentlyDrawing: false,
					includePolygonsWithinPointerDistance: true,
				},
			);

			expect(features).toHaveLength(1);
		});

		it("does not filter out closing point features if ignoreClosingPoints set to false", () => {
			const polygonMode = new TerraDrawPolygonMode();

			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});

			draw.start();
			draw.setMode("polygon");

			// NOTE: we shouldn't call a mode's onClick directly, but this is a test
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreClosingPoints: false,
				},
			);

			expect(features).toHaveLength(2);
			expect(features[0].geometry.type).toBe("Point");
			expect(features[1].geometry.type).toBe("Point");
		});

		it("filters closing point features if ignoreClosingPoints set to true", () => {
			const polygonMode = new TerraDrawPolygonMode();

			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});

			draw.start();
			draw.setMode("polygon");

			// NOTE: we shouldn't call a mode's onClick directly, but this is a test
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			const features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 0 },
				{
					ignoreClosingPoints: true,
				},
			);

			expect(features).toHaveLength(0);
		});

		it("includes polygons features within pointer distance if includePolygonsWithinPointerDistance set to true", () => {
			const polygonMode = new TerraDrawPolygonMode();

			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});

			draw.start();
			draw.setMode("polygon");

			let features = draw.getFeaturesAtLngLat(
				{ lng: -0.5, lat: -0.5 },
				{
					includePolygonsWithinPointerDistance: true,
				},
			);

			expect(features).toHaveLength(0);

			// NOTE: we shouldn't call a mode's onClick directly, but this is a test
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			features = draw.getFeaturesAtLngLat(
				{ lng: -0.5, lat: -0.5 },
				{
					includePolygonsWithinPointerDistance: true,
				},
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.type).toBe("Polygon");
		});

		it("ignores polygons features within pointer distance if includePolygonsWithinPointerDistance set to false", () => {
			const polygonMode = new TerraDrawPolygonMode();

			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});

			draw.start();
			draw.setMode("polygon");

			// NOTE: we shouldn't call a mode's onClick directly, but this is a test
			// Draw a square
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const features = draw.getFeaturesAtLngLat(
				{ lng: -0.5, lat: -0.5 },
				{
					includePolygonsWithinPointerDistance: false,
				},
			);

			expect(features).toHaveLength(0);
		});

		it("add closest coordinate index to pointer event to polygon features properties when addClosestCoordinateInfoToProperties is true", () => {
			const polygonMode = new TerraDrawPolygonMode();

			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});

			draw.start();
			draw.setMode("polygon");

			let features = draw.getFeaturesAtLngLat(
				{ lng: 0.00000001, lat: 0 },
				{
					addClosestCoordinateInfoToProperties: true,
					includePolygonsWithinPointerDistance: true,
				},
			);

			expect(features).toHaveLength(0);

			// NOTE: we shouldn't call a mode's onClick directly, but this is a test
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 })); // closing click

			features = draw.getFeaturesAtLngLat(
				{ lng: 1.00000001, lat: 1 },
				{
					addClosestCoordinateInfoToProperties: true,
					includePolygonsWithinPointerDistance: true,
				},
			);

			expect(features).toHaveLength(1);
			expect(features[0].properties.closestCoordinateIndexToEvent).toBe(1);

			features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 1.00000001 },
				{
					addClosestCoordinateInfoToProperties: true,
					includePolygonsWithinPointerDistance: true,
				},
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.type).toBe("Polygon");
			expect(features[0].geometry.coordinates).toEqual([
				[
					[0, 0],
					[1, 1],
					[0, 1],
					[0, 0],
				],
			]);
			expect(features[0].properties.closestCoordinateIndexToEvent).toBe(2);
			expect(
				features[0].properties.closestCoordinatePixelDistanceToEvent,
			).toBeGreaterThan(0);
			expect(
				features[0].properties.closestCoordinateDistanceKmToEvent,
			).toBeCloseTo(0.00000001);

			// Ensure not present if flag not set
			features = draw.getFeaturesAtLngLat(
				{ lng: 0, lat: 1.00000001 },
				{
					addClosestCoordinateInfoToProperties: false,
					includePolygonsWithinPointerDistance: true,
				},
			);

			expect(features).toHaveLength(1);
			expect(
				features[0].properties.closestCoordinateIndexToEvent,
			).toBeUndefined();
			expect(
				features[0].properties.closestCoordinatePixelDistanceToEvent,
			).toBeUndefined();
			expect(
				features[0].properties.closestCoordinateDistanceKmToEvent,
			).toBeUndefined();
		});

		it("add closest coordinate index to pointer event to linestring features properties when addClosestCoordinateInfoToProperties is true", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			const draw = new TerraDraw({
				adapter,
				modes: [lineStringMode],
			});

			draw.start();
			draw.setMode("linestring");

			let features = draw.getFeaturesAtLngLat(
				{ lng: 0.00000001, lat: 0 },
				{
					addClosestCoordinateInfoToProperties: true,
				},
			);

			expect(features).toHaveLength(0);

			// NOTE: we shouldn't call a mode's onClick directly, but this is a test
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			lineStringMode.onClick(MockCursorEvent({ lng: 25, lat: 25 }));
			lineStringMode.onClick(MockCursorEvent({ lng: 50, lat: 50 }));

			features = draw.getFeaturesAtLngLat(
				{ lng: 0.000001, lat: 0 },
				{
					addClosestCoordinateInfoToProperties: true,
				},
			);

			expect(features).toHaveLength(1);
			expect(features[0].properties.closestCoordinateIndexToEvent).toBe(0);
			expect(
				features[0].properties.closestCoordinatePixelDistanceToEvent,
			).toBeGreaterThan(0);
			expect(
				features[0].properties.closestCoordinateDistanceKmToEvent,
			).toBeCloseTo(0.00000001);

			features = draw.getFeaturesAtLngLat(
				{ lng: 25, lat: 25.00000001 },
				{
					addClosestCoordinateInfoToProperties: true,
				},
			);

			expect(features).toHaveLength(1);
			expect(features[0].properties.closestCoordinateIndexToEvent).toBe(1);
			expect(
				features[0].properties.closestCoordinatePixelDistanceToEvent,
			).toBeGreaterThan(0);
			expect(
				features[0].properties.closestCoordinateDistanceKmToEvent,
			).toBeCloseTo(0.00000001);

			// Ensure not present if flag not set
			features = draw.getFeaturesAtLngLat(
				{ lng: 25, lat: 25.00000001 },
				{
					addClosestCoordinateInfoToProperties: false,
					includePolygonsWithinPointerDistance: true,
				},
			);

			expect(features).toHaveLength(1);
			expect(
				features[0].properties.closestCoordinateIndexToEvent,
			).toBeUndefined();
			expect(
				features[0].properties.closestCoordinatePixelDistanceToEvent,
			).toBeUndefined();
			expect(
				features[0].properties.closestCoordinateDistanceKmToEvent,
			).toBeUndefined();
		});
	});

	describe("getFeaturesAtPointerEvent", () => {
		it("gets features at a given clientX and clientY", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [0, 0],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			const features = draw.getFeaturesAtPointerEvent({
				clientX: 100,
				clientY: 100,
			} as PointerEvent);

			expect(features).toHaveLength(1);
		});

		it("gets features at a given clientX and clientY within a given pointer distance", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [0, 0],
					},
					properties: {
						mode: "point",
					},
				},
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [50, 50],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			adapter.getLngLatFromEvent = jest.fn(() => ({ lng: 50, lat: 50 }));

			const features = draw.getFeaturesAtPointerEvent(
				{
					clientX: 50,
					clientY: 50,
				} as PointerEvent,
				{
					pointerDistance: 10,
				},
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.coordinates).toEqual([50, 50]);
		});

		// Underlying code does not change from getFeaturesAtLngLat, so we can skip testing filtering etc
	});

	describe("start and stop", () => {
		it("start", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			// Starts out false
			expect(draw.enabled).toBe(false);

			draw.start();
			expect(draw.enabled).toBe(true);
		});

		it("start has no effect if already started", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			// Starts out false
			expect(draw.enabled).toBe(false);

			draw.start();
			expect(draw.enabled).toBe(true);
			draw.start();
			expect(draw.enabled).toBe(true);
		});

		it("stop", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(draw.enabled).toBe(false);

			draw.start();
			expect(draw.enabled).toBe(true);

			draw.stop();
			expect(draw.enabled).toBe(false);
		});

		it("stop has no effect if already stopped", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			// Starts out false
			expect(draw.enabled).toBe(false);
			draw.stop();
			expect(draw.enabled).toBe(false);
			draw.stop();
			expect(draw.enabled).toBe(false);
		});

		it("can fully cycle through stop -> start -> stop -> start", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			// Starts out false
			expect(draw.enabled).toBe(false);
			draw.start();
			expect(draw.enabled).toBe(true);
			draw.stop();
			expect(draw.enabled).toBe(false);
			draw.start();
			expect(draw.enabled).toBe(true);
		});
	});

	describe("on", () => {
		it("it calls on change", async () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			const callback = jest.fn();
			draw.on("change", callback);

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(callback).toHaveBeenCalled();
		});

		it("it calls on change after draw has been stopped and started", async () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			const callback = jest.fn();
			draw.on("change", callback);

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25, 34],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(callback).toHaveBeenCalledTimes(1);

			draw.stop();

			draw.start();

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-35, 44],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(callback).toHaveBeenCalledTimes(2);
		});
	});

	describe("off", () => {
		it("it does not call on change once it has been removed", async () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			const callback = jest.fn();
			draw.on("change", callback);
			draw.off("change", callback);

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			expect(callback).not.toHaveBeenCalled();
		});
	});
});
