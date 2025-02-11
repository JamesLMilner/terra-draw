/**
 * @jest-environment jsdom
 */
import { FeatureId } from "./extend";
import {
	TerraDraw,
	TerraDrawLineStringMode,
	TerraDrawPointMode,
	TerraDrawPolygonMode,
	TerraDrawSelectMode,
} from "./terra-draw";
import { TerraDrawTestAdapter } from "./terra-draw.extensions.spec";

describe("Terra Draw", () => {
	let adapter: TerraDrawTestAdapter;

	beforeAll(() => {
		adapter = new TerraDrawTestAdapter({
			lib: {},
			coordinatePrecision: 9,
		});
	});

	describe("addFeature", () => {
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

	describe("selectFeature", () => {
		it("throws an error if there is no select moded", () => {
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
		it("clears the store", () => {
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

			draw.clear();

			const snapshot = draw.getSnapshot();

			expect(snapshot).toHaveLength(0);
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
		});
	});

	describe("getFeaturesAtPointerEvent", () => {
		it("gets features at a given longitude and latitude", () => {
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

		it("gets features at a given longitude and latitude within a given pointer distance", () => {
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
	});

	describe("start and stop", () => {
		it("start", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(draw.enabled).toBe(false);

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
