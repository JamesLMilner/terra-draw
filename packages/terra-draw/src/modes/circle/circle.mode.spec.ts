import {
	GeoJSONStore,
	GeoJSONStoreFeatures,
	JSONObject,
} from "../../store/store";
import { MockModeConfig } from "../../test/mock-mode-config";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { TerraDrawCircleMode } from "./circle.mode";
import { Polygon } from "geojson";
import { followsRightHandRule } from "../../geometry/boolean/right-hand-rule";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { COMMON_PROPERTIES, TerraDrawGeoJSONStore } from "../../common";
import { DefaultPointerEvents } from "../base.mode";
import { MockPolygonSquare } from "../../test/mock-features";

describe("TerraDrawCircleMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const circleMode = new TerraDrawCircleMode();
			expect(circleMode.mode).toBe("circle");
			expect(circleMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
			});
			expect(circleMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawCircleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawCircleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});

		it("constructs startingRadiusKilometers", () => {
			new TerraDrawCircleMode({
				startingRadiusKilometers: 0.00001,
			});
		});

		it("constructs with custom mode name", () => {
			const circleMode = new TerraDrawCircleMode({
				modeName: "custom",
			});
			expect(circleMode.mode).toBe("custom");
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const circleMode = new TerraDrawCircleMode();
			expect(circleMode.state).toBe("unregistered");
			circleMode.register(MockModeConfig(circleMode.mode));
			expect(circleMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.register(MockModeConfig(circleMode.mode));
				circleMode.register(MockModeConfig(circleMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const circleMode = new TerraDrawCircleMode();

			circleMode.register(MockModeConfig(circleMode.mode));
			circleMode.start();

			expect(circleMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const circleMode = new TerraDrawCircleMode();

			circleMode.register(MockModeConfig(circleMode.mode));
			circleMode.start();
			circleMode.stop();

			expect(circleMode.state).toBe("stopped");
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const circleMode = new TerraDrawCircleMode();
			circleMode.updateOptions({
				cursors: {
					start: "pointer",
				},
			});
			const mockConfig = MockModeConfig(circleMode.mode);
			circleMode.register(mockConfig);
			circleMode.start();
			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change key events", () => {
			const circleMode = new TerraDrawCircleMode();
			circleMode.updateOptions({
				keyEvents: {
					cancel: "C",
					finish: "F",
				},
			});
			const mockConfig = MockModeConfig(circleMode.mode);
			circleMode.register(mockConfig);
			circleMode.start();

			circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			circleMode.onKeyUp(MockKeyboardEvent({ key: "C" }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(0);
		});

		it("can update styles", () => {
			const circleMode = new TerraDrawCircleMode();

			const mockConfig = MockModeConfig(circleMode.mode);

			circleMode.register(mockConfig);
			circleMode.start();

			circleMode.updateOptions({
				styles: {
					fillColor: "#ffffff",
				},
			});
			expect(circleMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
		});
	});

	describe("onClick", () => {
		let circleMode: TerraDrawCircleMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			circleMode = new TerraDrawCircleMode();
			store = new GeoJSONStore();
			onChange = jest.fn();
		});

		it("throws an error if not registered", () => {
			expect(() => {
				circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			}).toThrow();
		});

		describe("registered", () => {
			describe("default startingRadiusKilometers", () => {
				beforeEach(() => {
					const mockConfig = MockModeConfig(circleMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					circleMode.register(mockConfig);
					circleMode.start();
				});

				it("adds a circle to store if registered", () => {
					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onChange).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledWith(
						[expect.any(String)],
						"create",
						undefined,
					);
				});

				it("finishes drawing circle on second click with no cursor movement", () => {
					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					let features = store.copyAll();
					expect(features.length).toBe(1);
					expect(
						features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
					).toBe(true);

					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					features = store.copyAll();
					expect(features.length).toBe(1);

					expect(
						features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
					).toBe(undefined);

					expect(followsRightHandRule(features[0].geometry as Polygon)).toBe(
						true,
					);

					// We don't expect any changes if there is no cursor movement
					expect(onChange).toHaveBeenCalledTimes(2);
					expect(onChange).toHaveBeenCalledWith(
						[expect.any(String)],
						"create",
						undefined,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
				});

				it("finishes drawing circle on second click with cursor movement", () => {
					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					let features = store.copyAll();
					expect(features.length).toBe(1);

					circleMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

					circleMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

					features = store.copyAll();
					expect(features.length).toBe(1);

					expect(followsRightHandRule(features[0].geometry as Polygon)).toBe(
						true,
					);

					expect(onChange).toHaveBeenCalledTimes(5);
					expect(onChange).toHaveBeenCalledWith(
						[expect.any(String)],
						"create",
						undefined,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
				});
			});

			describe("set startingRadiusKilometers", () => {
				beforeEach(() => {
					circleMode = new TerraDrawCircleMode({
						startingRadiusKilometers: 1000,
					});
					const mockConfig = MockModeConfig(circleMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					circleMode.register(mockConfig);
					circleMode.start();
				});

				it("adds a circle to store if registered with the minimum radius", () => {
					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onChange).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledWith(
						[expect.any(String)],
						"create",
						undefined,
					);
					expect(store.copyAll()[0].properties.radiusKilometers).toStrictEqual(
						1000,
					);
				});
			});

			describe("validate", () => {
				let valid = false;

				beforeEach(() => {
					circleMode = new TerraDrawCircleMode({
						validation: () => ({ valid }),
					});
					const mockConfig = MockModeConfig(circleMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					circleMode.register(mockConfig);
					circleMode.start();
				});

				it("does not finish drawing circle on second click if validation returns false", () => {
					valid = false;

					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					let features = store.copyAll();
					expect(features.length).toBe(1);

					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					features = store.copyAll();
					expect(features.length).toBe(1);

					expect(onChange).toHaveBeenCalledTimes(2);
					expect(onChange).toHaveBeenCalledWith(
						[expect.any(String)],
						"create",
						undefined,
					);

					expect(onFinish).toHaveBeenCalledTimes(0);
				});

				it("does finish drawing circle on second click if validation returns true with no cursor movement", () => {
					valid = true;

					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					let features = store.copyAll();
					expect(features.length).toBe(1);

					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					features = store.copyAll();
					expect(features.length).toBe(1);

					expect(onChange).toHaveBeenCalledTimes(2);
					expect(onChange).toHaveBeenCalledWith(
						[expect.any(String)],
						"create",
						undefined,
					);
					expect(onFinish).toHaveBeenCalledTimes(1);
					expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
						action: "draw",
						mode: "circle",
					});
				});
			});

			describe("with leftClick pointer event set to false", () => {
				beforeEach(() => {
					circleMode = new TerraDrawCircleMode({
						pointerEvents: {
							...DefaultPointerEvents,
							leftClick: false,
						},
					});
					const mockConfig = MockModeConfig(circleMode.mode);

					store = mockConfig.store;
					circleMode.register(mockConfig);
					circleMode.start();
				});

				it("should not allow click", () => {
					circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					circleMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

					circleMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

					let features = store.copyAll();
					expect(features.length).toBe(0);
				});
			});
		});
	});

	describe("onKeyUp", () => {
		let circleMode: TerraDrawCircleMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			circleMode = new TerraDrawCircleMode();

			const mockConfig = MockModeConfig(circleMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			circleMode.register(mockConfig);
			circleMode.start();
		});

		it("finishes drawing circle on finish key press", () => {
			circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);

			circleMode.onKeyUp({
				key: "Enter",
				heldKeys: [],
				preventDefault: jest.fn(),
			});

			features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING]).toBe(
				undefined,
			);

			expect(onChange).toHaveBeenCalledTimes(2);
			expect(onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"create",
				undefined,
			);
			expect(onFinish).toHaveBeenCalledTimes(1);
			expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
				action: "draw",
				mode: "circle",
			});
		});
	});

	describe("onMouseMove", () => {
		let circleMode: TerraDrawCircleMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			circleMode = new TerraDrawCircleMode();

			const mockConfig = MockModeConfig(circleMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;

			circleMode.register(mockConfig);
			circleMode.start();
		});

		it("updates the circle size", () => {
			circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"create",
				undefined,
			);

			const feature = store.copyAll()[0];

			circleMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			expect(onChange).toHaveBeenCalledTimes(3);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"update",
				{ target: "geometry" },
			);

			const updatedFeature = store.copyAll()[0];

			expect(feature.id).toBe(updatedFeature.id);
			expect(feature.geometry.coordinates).not.toStrictEqual(
				updatedFeature.geometry.coordinates,
			);
		});
	});

	describe("cleanUp", () => {
		let circleMode: TerraDrawCircleMode;
		let onChange: jest.Mock;

		beforeEach(() => {
			circleMode = new TerraDrawCircleMode();

			const mockConfig = MockModeConfig(circleMode.mode);

			onChange = mockConfig.onChange;

			circleMode.register(mockConfig);
			circleMode.start();
		});

		it("does not delete if no circle has been created", () => {
			circleMode.cleanUp();
			expect(onChange).toHaveBeenCalledTimes(0);
		});

		it("does delete if a circle has been created", () => {
			circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			circleMode.cleanUp();

			expect(onChange).toHaveBeenCalledTimes(2);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"delete",
				undefined,
			);
		});
	});

	describe("onKeyUp", () => {
		let store: TerraDrawGeoJSONStore;
		let circleMode: TerraDrawCircleMode;

		beforeEach(() => {
			jest.resetAllMocks();
			circleMode = new TerraDrawCircleMode();

			const mockConfig = MockModeConfig(circleMode.mode);
			store = mockConfig.store;
			circleMode.register(mockConfig);
			circleMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no circle is present", () => {
				circleMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});
			});

			it("deletes the circle when currently editing", () => {
				circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);

				circleMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});

				features = store.copyAll();
				expect(features.length).toBe(0);
			});

			it("does not delete the circle when currently editing if keyEvents is null", () => {
				jest.resetAllMocks();
				circleMode = new TerraDrawCircleMode({ keyEvents: null });

				const mockConfig = MockModeConfig(circleMode.mode);
				store = mockConfig.store;
				circleMode.register(mockConfig);
				circleMode.start();

				circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);

				circleMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});

				features = store.copyAll();
				expect(features.length).toBe(1);
			});
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.onDrag();
			}).not.toThrow();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.onDragStart();
			}).not.toThrow();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.onDragEnd();
			}).not.toThrow();
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});

			expect(
				circleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "circle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct styles for polygon", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: {
					fillColor: () => "#ffffff",
					outlineColor: () => "#ffffff",
					outlineWidth: () => 2,
					fillOpacity: () => 0.5,
				},
			});

			expect(
				circleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "circle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid circle feature", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			circleMode.register(MockModeConfig("circle"));

			expect(
				circleMode.validateFeature({
					id: "29da86c2-92e2-4095-a1b3-22103535ebfa",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [[]],
					},
					properties: {
						mode: "circle",
						createdAt: 1685568434891,
						updatedAt: 1685568435434,
					},
				}),
			).toEqual({
				reason: "Feature has less than 4 coordinates",
				valid: false,
			});
		});

		it("returns true for valid circle feature", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			circleMode.register(MockModeConfig("circle"));

			expect(
				circleMode.validateFeature({
					id: "29da86c2-92e2-4095-a1b3-22103535ebfa",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.494384766, 52.581606375],
								[-0.506010566, 52.581258762],
								[-0.517523856, 52.580219286],
								[-0.528813228, 52.578498007],
								[-0.539769474, 52.576111581],
								[-0.550286655, 52.573083097],
								[-0.560263136, 52.56944185],
								[-0.56960258, 52.565223055],
								[-0.578214884, 52.560467503],
								[-0.586017056, 52.555221157],
								[-0.592934012, 52.54953471],
								[-0.598899299, 52.543463084],
								[-0.603855731, 52.537064901],
								[-0.607755924, 52.530401907],
								[-0.610562743, 52.523538376],
								[-0.612249642, 52.516540485],
								[-0.612800901, 52.509475676],
								[-0.612211758, 52.502412002],
								[-0.61048843, 52.495417474],
								[-0.607648039, 52.488559404],
								[-0.60371842, 52.481903758],
								[-0.598737838, 52.47551453],
								[-0.592754606, 52.469453122],
								[-0.5858266, 52.46377776],
								[-0.578020696, 52.458542943],
								[-0.569412123, 52.453798919],
								[-0.56008373, 52.44959121],
								[-0.550125193, 52.44596018],
								[-0.539632162, 52.44294065],
								[-0.528705342, 52.440561574],
								[-0.517449543, 52.438845755],
								[-0.505972682, 52.437809642],
								[-0.494384766, 52.437463165],
								[-0.48279685, 52.437809642],
								[-0.471319989, 52.438845755],
								[-0.46006419, 52.440561574],
								[-0.44913737, 52.44294065],
								[-0.438644339, 52.44596018],
								[-0.428685802, 52.44959121],
								[-0.419357409, 52.453798919],
								[-0.410748836, 52.458542943],
								[-0.402942932, 52.46377776],
								[-0.396014926, 52.469453122],
								[-0.390031694, 52.47551453],
								[-0.385051112, 52.481903758],
								[-0.381121493, 52.488559404],
								[-0.378281102, 52.495417474],
								[-0.376557774, 52.502412002],
								[-0.375968631, 52.509475676],
								[-0.37651989, 52.516540485],
								[-0.378206789, 52.523538376],
								[-0.381013608, 52.530401907],
								[-0.384913801, 52.537064901],
								[-0.389870233, 52.543463084],
								[-0.39583552, 52.54953471],
								[-0.402752476, 52.555221157],
								[-0.410554648, 52.560467503],
								[-0.419166952, 52.565223055],
								[-0.428506396, 52.56944185],
								[-0.438482877, 52.573083097],
								[-0.449000058, 52.576111581],
								[-0.459956304, 52.578498007],
								[-0.471245676, 52.580219286],
								[-0.482758966, 52.581258762],
								[-0.494384766, 52.581606375],
							],
						],
					},
					properties: {
						mode: "circle",
						createdAt: 1685568434891,
						updatedAt: 1685568435434,
					},
				}),
			).toEqual({
				valid: true,
			});
		});

		it("returns false for valid circle feature but with validation that returns false", () => {
			const circleMode = new TerraDrawCircleMode({
				validation: () => {
					return { valid: false };
				},
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			circleMode.register(MockModeConfig("circle"));

			expect(
				circleMode.validateFeature({
					id: "29da86c2-92e2-4095-a1b3-22103535ebfa",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.494384766, 52.581606375],
								[-0.506010566, 52.581258762],
								[-0.517523856, 52.580219286],
								[-0.528813228, 52.578498007],
								[-0.539769474, 52.576111581],
								[-0.550286655, 52.573083097],
								[-0.560263136, 52.56944185],
								[-0.56960258, 52.565223055],
								[-0.578214884, 52.560467503],
								[-0.586017056, 52.555221157],
								[-0.592934012, 52.54953471],
								[-0.598899299, 52.543463084],
								[-0.603855731, 52.537064901],
								[-0.607755924, 52.530401907],
								[-0.610562743, 52.523538376],
								[-0.612249642, 52.516540485],
								[-0.612800901, 52.509475676],
								[-0.612211758, 52.502412002],
								[-0.61048843, 52.495417474],
								[-0.607648039, 52.488559404],
								[-0.60371842, 52.481903758],
								[-0.598737838, 52.47551453],
								[-0.592754606, 52.469453122],
								[-0.5858266, 52.46377776],
								[-0.578020696, 52.458542943],
								[-0.569412123, 52.453798919],
								[-0.56008373, 52.44959121],
								[-0.550125193, 52.44596018],
								[-0.539632162, 52.44294065],
								[-0.528705342, 52.440561574],
								[-0.517449543, 52.438845755],
								[-0.505972682, 52.437809642],
								[-0.494384766, 52.437463165],
								[-0.48279685, 52.437809642],
								[-0.471319989, 52.438845755],
								[-0.46006419, 52.440561574],
								[-0.44913737, 52.44294065],
								[-0.438644339, 52.44596018],
								[-0.428685802, 52.44959121],
								[-0.419357409, 52.453798919],
								[-0.410748836, 52.458542943],
								[-0.402942932, 52.46377776],
								[-0.396014926, 52.469453122],
								[-0.390031694, 52.47551453],
								[-0.385051112, 52.481903758],
								[-0.381121493, 52.488559404],
								[-0.378281102, 52.495417474],
								[-0.376557774, 52.502412002],
								[-0.375968631, 52.509475676],
								[-0.37651989, 52.516540485],
								[-0.378206789, 52.523538376],
								[-0.381013608, 52.530401907],
								[-0.384913801, 52.537064901],
								[-0.389870233, 52.543463084],
								[-0.39583552, 52.54953471],
								[-0.402752476, 52.555221157],
								[-0.410554648, 52.560467503],
								[-0.419166952, 52.565223055],
								[-0.428506396, 52.56944185],
								[-0.438482877, 52.573083097],
								[-0.449000058, 52.576111581],
								[-0.459956304, 52.578498007],
								[-0.471245676, 52.580219286],
								[-0.482758966, 52.581258762],
								[-0.494384766, 52.581606375],
							],
						],
					},
					properties: {
						mode: "circle",
						createdAt: 1685568434891,
						updatedAt: 1685568435434,
					},
				}),
			).toEqual({
				valid: false,
			});
		});
	});

	describe("afterFeatureUpdated", () => {
		it("does nothing when update is not for the currently drawn polygon", () => {
			const circleMode = new TerraDrawCircleMode();
			const mockConfig = MockModeConfig(circleMode.mode);
			circleMode.register(mockConfig);
			circleMode.start();

			jest.spyOn(mockConfig.store, "delete");

			circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			const firstCircle = features[0];

			circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);

			// Second circle started
			circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();
			mockConfig.setDoubleClickToZoom.mockClear();

			circleMode.afterFeatureUpdated({
				...firstCircle,
			});

			expect(mockConfig.setDoubleClickToZoom).toHaveBeenCalledTimes(0);
			expect(mockConfig.store.delete).toHaveBeenCalledTimes(0);
			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("sets drawing back to started", () => {
			const circleMode = new TerraDrawCircleMode();
			const mockConfig = MockModeConfig(circleMode.mode);
			circleMode.register(mockConfig);
			circleMode.start();

			circleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			circleMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			const features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			const feature = features[0];

			// Set the onChange count to 0
			mockConfig.setDoubleClickToZoom.mockClear();

			circleMode.afterFeatureUpdated({
				...feature,
			});

			expect(mockConfig.setDoubleClickToZoom).toHaveBeenCalledTimes(1);
		});
	});
});
