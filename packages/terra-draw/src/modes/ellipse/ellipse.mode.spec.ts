import { GeoJSONStore, GeoJSONStoreFeatures } from "../../store/store";
import { MockModeConfig } from "../../test/mock-mode-config";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { TerraDrawEllipseMode } from "./ellipse.mode";
import { Polygon } from "geojson";
import { followsRightHandRule } from "../../geometry/boolean/right-hand-rule";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { COMMON_PROPERTIES, TerraDrawGeoJSONStore } from "../../common";
import { DefaultPointerEvents } from "../base.mode";

describe("TerraDrawEllipseMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const ellipseMode = new TerraDrawEllipseMode();
			expect(ellipseMode.mode).toBe("ellipse");
			expect(ellipseMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const ellipseMode = new TerraDrawEllipseMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
			});
			expect(ellipseMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawEllipseMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawEllipseMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});

		it("constructs startingRadiusKilometers", () => {
			new TerraDrawEllipseMode({
				startingRadiusKilometers: 0.00001,
			});
		});

		it("constructs with custom mode name", () => {
			const ellipseMode = new TerraDrawEllipseMode({
				modeName: "custom",
			});
			expect(ellipseMode.mode).toBe("custom");
		});

		it("constructs with drawInteraction option", () => {
			new TerraDrawEllipseMode({
				drawInteraction: "click-move",
			});

			new TerraDrawEllipseMode({
				drawInteraction: "click-drag",
			});

			new TerraDrawEllipseMode({
				drawInteraction: "click-move-or-drag",
			});
		});

		it("constructs with projection option", () => {
			new TerraDrawEllipseMode({ projection: "web-mercator" });
			new TerraDrawEllipseMode({ projection: "globe" });
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const ellipseMode = new TerraDrawEllipseMode();
			expect(ellipseMode.state).toBe("unregistered");
			ellipseMode.register(MockModeConfig(ellipseMode.mode));
			expect(ellipseMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const ellipseMode = new TerraDrawEllipseMode();

			expect(() => {
				ellipseMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const ellipseMode = new TerraDrawEllipseMode();

			expect(() => {
				ellipseMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const ellipseMode = new TerraDrawEllipseMode();

			expect(() => {
				ellipseMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const ellipseMode = new TerraDrawEllipseMode();

			expect(() => {
				ellipseMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const ellipseMode = new TerraDrawEllipseMode();

			expect(() => {
				ellipseMode.register(MockModeConfig(ellipseMode.mode));
				ellipseMode.register(MockModeConfig(ellipseMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const ellipseMode = new TerraDrawEllipseMode();

			ellipseMode.register(MockModeConfig(ellipseMode.mode));
			ellipseMode.start();

			expect(ellipseMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const ellipseMode = new TerraDrawEllipseMode();

			ellipseMode.register(MockModeConfig(ellipseMode.mode));
			ellipseMode.start();
			ellipseMode.stop();

			expect(ellipseMode.state).toBe("stopped");
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const ellipseMode = new TerraDrawEllipseMode();
			ellipseMode.updateOptions({
				cursors: {
					start: "pointer",
				},
			});
			const mockConfig = MockModeConfig(ellipseMode.mode);
			ellipseMode.register(mockConfig);
			ellipseMode.start();
			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change key events", () => {
			const ellipseMode = new TerraDrawEllipseMode();
			ellipseMode.updateOptions({
				keyEvents: {
					cancel: "C",
					finish: "F",
				},
			});
			const mockConfig = MockModeConfig(ellipseMode.mode);
			ellipseMode.register(mockConfig);
			ellipseMode.start();

			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			ellipseMode.onKeyUp(MockKeyboardEvent({ key: "C" }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(0);
		});

		it("can update styles", () => {
			const ellipseMode = new TerraDrawEllipseMode();

			const mockConfig = MockModeConfig(ellipseMode.mode);

			ellipseMode.register(mockConfig);
			ellipseMode.start();

			ellipseMode.updateOptions({
				styles: {
					fillColor: "#ffffff",
				},
			});
			expect(ellipseMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
		});

		it("allows setting startingRadiusKilometers to 0", () => {
			const ellipseMode = new TerraDrawEllipseMode({
				startingRadiusKilometers: 10,
			});

			const mockConfig = MockModeConfig(ellipseMode.mode);
			ellipseMode.register(mockConfig);
			ellipseMode.start();

			ellipseMode.updateOptions({ startingRadiusKilometers: 0 });
			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].properties.xRadiusKilometers).toStrictEqual(0);
			expect(features[0].properties.yRadiusKilometers).toStrictEqual(0);
		});

		it("allows setting segments to 0 and clamps to minimum", () => {
			const ellipseMode = new TerraDrawEllipseMode({
				segments: 8,
			});

			const mockConfig = MockModeConfig(ellipseMode.mode);
			ellipseMode.register(mockConfig);
			ellipseMode.start();

			ellipseMode.updateOptions({ segments: 0 });
			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			ellipseMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			const features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			expect((features[0].geometry as Polygon).coordinates[0].length).toBe(4);
		});
	});

	describe("onClick", () => {
		let ellipseMode: TerraDrawEllipseMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			ellipseMode = new TerraDrawEllipseMode();
			store = new GeoJSONStore();
			onChange = jest.fn();
		});

		it("throws an error if not registered", () => {
			expect(() => {
				ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			}).toThrow();
		});

		describe("registered", () => {
			describe("default startingRadiusKilometers", () => {
				beforeEach(() => {
					const mockConfig = MockModeConfig(ellipseMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					ellipseMode.register(mockConfig);
					ellipseMode.start();
				});

				it("adds an ellipse to store if registered", () => {
					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onChange).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledWith(
						[expect.any(String)],
						"create",
						undefined,
					);
				});

				describe.each([
					["click-move" as const, true],
					["click-move-or-drag" as const, true],
					["click-drag" as const, false],
				])("with drawInteraction %s", (drawInteraction, shouldAddEllipse) => {
					it(`${shouldAddEllipse ? "adds" : "does not add"} a ellipse to store`, () => {
						ellipseMode = new TerraDrawEllipseMode({
							drawInteraction,
						});
						const mockConfig = MockModeConfig(ellipseMode.mode);

						store = mockConfig.store;
						onChange = mockConfig.onChange;
						onFinish = mockConfig.onFinish;

						ellipseMode.register(mockConfig);
						ellipseMode.start();

						ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

						expect(onChange).toHaveBeenCalledTimes(shouldAddEllipse ? 1 : 0);
						if (shouldAddEllipse) {
							expect(onChange).toHaveBeenCalledWith(
								[expect.any(String)],
								"create",
								undefined,
							);
						}

						expect(onFinish).toHaveBeenCalledTimes(0);
					});
				});

				describe.each([
					["click-move" as const],
					["click-move-or-drag" as const],
				])("with drawInteraction %s", (drawInteraction) => {
					it("finishes drawing ellipse on second click with no cursor movement", () => {
						ellipseMode = new TerraDrawEllipseMode({
							drawInteraction,
						});

						const mockConfig = MockModeConfig(ellipseMode.mode);

						store = mockConfig.store;
						onChange = mockConfig.onChange;
						onFinish = mockConfig.onFinish;

						ellipseMode.register(mockConfig);
						ellipseMode.start();

						ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

						let features = store.copyAll();
						expect(features.length).toBe(1);
						expect(
							features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
						).toBe(true);

						ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

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

					it("finishes drawing ellipse on second click with cursor movement", () => {
						ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

						let features = store.copyAll();
						expect(features.length).toBe(1);

						ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

						ellipseMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

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
			});

			describe("set startingRadiusKilometers", () => {
				beforeEach(() => {
					ellipseMode = new TerraDrawEllipseMode({
						startingRadiusKilometers: 1000,
					});
					const mockConfig = MockModeConfig(ellipseMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					ellipseMode.register(mockConfig);
					ellipseMode.start();
				});

				it("adds an ellipse to store if registered with the minimum radius", () => {
					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onChange).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledWith(
						[expect.any(String)],
						"create",
						undefined,
					);
					expect(store.copyAll()[0].properties.xRadiusKilometers).toStrictEqual(
						1000,
					);
					expect(store.copyAll()[0].properties.yRadiusKilometers).toStrictEqual(
						1000,
					);
				});

				it("accepts a startingRadiusKilometers value of 0", () => {
					ellipseMode = new TerraDrawEllipseMode({
						startingRadiusKilometers: 0,
					});
					const mockConfig = MockModeConfig(ellipseMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onChange).toHaveBeenCalledTimes(1);
					expect(store.copyAll()[0].properties.xRadiusKilometers).toStrictEqual(
						0,
					);
					expect(store.copyAll()[0].properties.yRadiusKilometers).toStrictEqual(
						0,
					);
				});
			});

			describe("segments option", () => {
				beforeEach(() => {
					ellipseMode = new TerraDrawEllipseMode({
						segments: 8,
					});
					const mockConfig = MockModeConfig(ellipseMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					ellipseMode.register(mockConfig);
					ellipseMode.start();
				});

				it("uses segments value for polygon ring coordinate count", () => {
					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
					ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
					ellipseMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

					const features = store.copyAll();
					expect(features.length).toBe(1);

					// An ellipse polygon is closed, so it will be steps + 1 coordinates
					expect((features[0].geometry as Polygon).coordinates[0].length).toBe(
						9,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
				});

				it("keeps the starting geometry when finishing with no cursor movement", () => {
					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					const features = store.copyAll();
					expect(features.length).toBe(1);

					// beginDrawing creates the initial ellipse with the helper default of 64 steps.
					expect((features[0].geometry as Polygon).coordinates[0].length).toBe(
						65,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
				});

				it("defaults to 64 segments", () => {
					ellipseMode = new TerraDrawEllipseMode();
					const mockConfig = MockModeConfig(ellipseMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
					ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
					ellipseMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

					const features = store.copyAll();
					expect(features.length).toBe(1);

					// 64 steps plus the closing coordinate
					expect((features[0].geometry as Polygon).coordinates[0].length).toBe(
						65,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
				});

				it("clamps segments lower than 3", () => {
					ellipseMode = new TerraDrawEllipseMode({
						segments: 1,
					});
					const mockConfig = MockModeConfig(ellipseMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
					ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
					ellipseMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

					const features = store.copyAll();
					expect(features.length).toBe(1);

					// Minimum of 3 steps, plus the closing coordinate
					expect((features[0].geometry as Polygon).coordinates[0].length).toBe(
						4,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
				});

				it("ignores Infinity segments and keeps previous finite value", () => {
					ellipseMode.updateOptions({ segments: Infinity });

					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
					ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
					ellipseMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

					const features = store.copyAll();
					expect(features.length).toBe(1);

					// Initial finite value remains 8, so ring has 8 steps + closing coordinate
					expect((features[0].geometry as Polygon).coordinates[0].length).toBe(
						9,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
				});

				it("parses decimal segments as an integer", () => {
					ellipseMode.updateOptions({ segments: 8.9 });

					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
					ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
					ellipseMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

					const features = store.copyAll();
					expect(features.length).toBe(1);

					// 8.9 is truncated to 8 steps, plus the closing coordinate
					expect((features[0].geometry as Polygon).coordinates[0].length).toBe(
						9,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
				});
			});

			describe("validate", () => {
				let valid = false;

				beforeEach(() => {
					ellipseMode = new TerraDrawEllipseMode({
						validation: () => ({ valid }),
					});
					const mockConfig = MockModeConfig(ellipseMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					ellipseMode.register(mockConfig);
					ellipseMode.start();
				});

				it("does not finish drawing ellipse on second click if validation returns false", () => {
					valid = false;

					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					let features = store.copyAll();
					expect(features.length).toBe(1);
					const beforeGeometry = features[0].geometry;

					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					features = store.copyAll();
					expect(features.length).toBe(1);
					const afterGeometry = features[0].geometry;

					// The second click should not have changed the geometry
					expect(afterGeometry).toStrictEqual(beforeGeometry);

					// Create, but no properties changed
					expect(onChange).toHaveBeenNthCalledWith(
						1,
						[expect.any(String)],
						"create",
						undefined,
					);

					// The second click should not have finished the drawing
					expect(onFinish).toHaveBeenCalledTimes(0);
				});

				it("does finish drawing ellipse on second click if validation returns true with no cursor movement", () => {
					valid = true;

					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					let features = store.copyAll();
					expect(features.length).toBe(1);

					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

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
						mode: "ellipse",
					});
				});
			});

			describe("with leftClick pointer event set to false", () => {
				beforeEach(() => {
					ellipseMode = new TerraDrawEllipseMode({
						pointerEvents: {
							...DefaultPointerEvents,
							leftClick: false,
						},
					});
					const mockConfig = MockModeConfig(ellipseMode.mode);

					store = mockConfig.store;
					ellipseMode.register(mockConfig);
					ellipseMode.start();
				});

				it("should not allow click", () => {
					ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

					ellipseMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

					let features = store.copyAll();
					expect(features.length).toBe(0);
				});
			});
		});
	});

	describe("onKeyUp", () => {
		let ellipseMode: TerraDrawEllipseMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			ellipseMode = new TerraDrawEllipseMode();

			const mockConfig = MockModeConfig(ellipseMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			ellipseMode.register(mockConfig);
			ellipseMode.start();
		});

		it("finishes drawing ellipse on finish key press", () => {
			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);

			ellipseMode.onKeyUp({
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
				mode: "ellipse",
			});
		});
	});

	describe("onMouseMove", () => {
		let ellipseMode: TerraDrawEllipseMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			ellipseMode = new TerraDrawEllipseMode();

			const mockConfig = MockModeConfig(ellipseMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;

			ellipseMode.register(mockConfig);
			ellipseMode.start();
		});

		it("updates the ellipse size", () => {
			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"create",
				undefined,
			);

			const feature = store.copyAll()[0];

			ellipseMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 1 }));
			expect(onChange).toHaveBeenCalledTimes(3);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"update",
				{ target: "geometry" },
			);
			expect(onChange).toHaveBeenNthCalledWith(
				3,
				[expect.any(String)],
				"update",
				{ target: "properties" },
			);

			const updatedFeature = store.copyAll()[0];

			expect(feature.id).toBe(updatedFeature.id);
			expect(feature.geometry.coordinates).not.toStrictEqual(
				updatedFeature.geometry.coordinates,
			);
			expect(updatedFeature.properties.xRadiusKilometers).toBeGreaterThan(0);
			expect(updatedFeature.properties.yRadiusKilometers).toBeGreaterThan(0);
			expect(updatedFeature.properties.xRadiusKilometers).not.toBe(
				updatedFeature.properties.yRadiusKilometers,
			);
		});
	});

	describe("cleanUp", () => {
		let ellipseMode: TerraDrawEllipseMode;
		let onChange: jest.Mock;

		beforeEach(() => {
			ellipseMode = new TerraDrawEllipseMode();

			const mockConfig = MockModeConfig(ellipseMode.mode);

			onChange = mockConfig.onChange;

			ellipseMode.register(mockConfig);
			ellipseMode.start();
		});

		it("does not delete if no ellipse has been created", () => {
			ellipseMode.cleanUp();
			expect(onChange).toHaveBeenCalledTimes(0);
		});

		it("does delete if an ellipse has been created", () => {
			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			ellipseMode.cleanUp();

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
		let ellipseMode: TerraDrawEllipseMode;

		beforeEach(() => {
			jest.resetAllMocks();
			ellipseMode = new TerraDrawEllipseMode();

			const mockConfig = MockModeConfig(ellipseMode.mode);
			store = mockConfig.store;
			ellipseMode.register(mockConfig);
			ellipseMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no ellipse is present", () => {
				ellipseMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});
			});

			it("deletes the ellipse when currently editing", () => {
				ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);

				ellipseMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});

				features = store.copyAll();
				expect(features.length).toBe(0);
			});

			it("does not delete the ellipse when currently editing if keyEvents is null", () => {
				jest.resetAllMocks();
				ellipseMode = new TerraDrawEllipseMode({ keyEvents: null });

				const mockConfig = MockModeConfig(ellipseMode.mode);
				store = mockConfig.store;
				ellipseMode.register(mockConfig);
				ellipseMode.start();

				ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);

				ellipseMode.onKeyUp({
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
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let ellipseMode: TerraDrawEllipseMode;
		let setMapDraggability: jest.Mock;
		let store: TerraDrawGeoJSONStore;

		beforeEach(() => {
			setMapDraggability = jest.fn();
		});

		describe.each([
			["without drawInteraction option", undefined],
			["with drawInteraction click-move", "click-move" as const],
		])("%s", (_, drawInteraction) => {
			it("does nothing", () => {
				ellipseMode = new TerraDrawEllipseMode(
					drawInteraction ? { drawInteraction } : undefined,
				);

				const mockConfig = MockModeConfig(ellipseMode.mode);
				store = mockConfig.store;
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				ellipseMode.register(mockConfig);
				ellipseMode.start();

				ellipseMode.onDrag(
					MockCursorEvent({ lng: 0, lat: 0 }),
					setMapDraggability,
				);

				expect(onFinish).toHaveBeenCalledTimes(0);
				expect(onChange).toHaveBeenCalledTimes(0);
				expect(setMapDraggability).toHaveBeenCalledTimes(0);
			});
		});

		describe.each([["click-drag" as const], ["click-move-or-drag" as const]])(
			"with drawInteraction %s and onDrag pointer event set to false",
			(drawInteraction) => {
				it("does nothing", () => {
					const ellipseMode = new TerraDrawEllipseMode({
						drawInteraction,
						pointerEvents: {
							...DefaultPointerEvents,
							onDrag: false,
						},
					});

					const mockConfig = MockModeConfig(ellipseMode.mode);
					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;
					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					onChange.mockClear();

					ellipseMode.onDrag(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					expect(onFinish).toHaveBeenCalledTimes(0);
					expect(onChange).toHaveBeenCalledTimes(0);
				});
			},
		);

		it("with drawInteraction click-move-or-drag and drawType is click it does nothing", () => {
			const ellipseMode = new TerraDrawEllipseMode({
				drawInteraction: "click-move-or-drag",
			});

			const mockConfig = MockModeConfig(ellipseMode.mode);
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			ellipseMode.register(mockConfig);
			ellipseMode.start();

			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			onChange.mockClear();
			onFinish.mockClear();

			ellipseMode.onDrag(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(onChange).toHaveBeenCalledTimes(0);
			expect(onFinish).toHaveBeenCalledTimes(0);
			expect(setMapDraggability).toHaveBeenCalledTimes(0);
		});

		describe.each([["click-drag" as const], ["click-move-or-drag" as const]])(
			"with drawInteraction %s",
			(drawInteraction) => {
				it("updates the ellipse size", () => {
					const ellipseMode = new TerraDrawEllipseMode({
						drawInteraction,
					});

					const mockConfig = MockModeConfig(ellipseMode.mode);
					store = mockConfig.store;
					onChange = mockConfig.onChange;
					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenNthCalledWith(
						1,
						[expect.any(String)],
						"create",
						undefined,
					);
					expect(setMapDraggability).toHaveBeenCalledTimes(1);

					const feature = store.copyAll()[0];

					ellipseMode.onDrag(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(3);
					expect(onChange).toHaveBeenNthCalledWith(
						2,
						[expect.any(String)],
						"update",
						{ target: "geometry" },
					);

					expect(onChange).toHaveBeenNthCalledWith(
						3,
						[expect.any(String)],
						"update",
						{ target: "properties" },
					);

					const updatedFeature = store.copyAll()[0];

					expect(feature.id).toBe(updatedFeature.id);
					expect(feature.geometry.coordinates).not.toStrictEqual(
						updatedFeature.geometry.coordinates,
					);

					expect(setMapDraggability).toHaveBeenCalledTimes(1);
				});
			},
		);
	});

	describe("onDragStart", () => {
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let ellipseMode: TerraDrawEllipseMode;
		let setMapDraggability: jest.Mock;

		beforeEach(() => {
			setMapDraggability = jest.fn();
		});

		describe.each([
			["without drawInteraction option", undefined],
			["with drawInteraction click-move", "click-move" as const],
		])("%s", (_, drawInteraction) => {
			it("does nothing", () => {
				ellipseMode = new TerraDrawEllipseMode(
					drawInteraction ? { drawInteraction } : undefined,
				);
				const mockConfig = MockModeConfig(ellipseMode.mode);

				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				ellipseMode.register(mockConfig);
				ellipseMode.start();

				ellipseMode.onDragStart(
					MockCursorEvent({ lng: 0, lat: 0 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(0);
				expect(onFinish).toHaveBeenCalledTimes(0);
				expect(setMapDraggability).toHaveBeenCalledTimes(0);
			});
		});

		describe.each([["click-drag" as const], ["click-move-or-drag" as const]])(
			"with drawInteraction %s and onDragStart pointer event false",
			(drawInteraction) => {
				it("does nothing", () => {
					ellipseMode = new TerraDrawEllipseMode({
						drawInteraction,
						pointerEvents: {
							...DefaultPointerEvents,
							onDragStart: false,
						},
					});

					const mockConfig = MockModeConfig(ellipseMode.mode);
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;
					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					expect(onFinish).toHaveBeenCalledTimes(0);
					expect(onChange).toHaveBeenCalledTimes(0);
					expect(setMapDraggability).toHaveBeenCalledTimes(0);
				});
			},
		);

		it("with drawInteraction click-move-or-drag and drawType is click it does nothing", () => {
			ellipseMode = new TerraDrawEllipseMode({
				drawInteraction: "click-move-or-drag",
			});

			const mockConfig = MockModeConfig(ellipseMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			ellipseMode.register(mockConfig);
			ellipseMode.start();

			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			onChange.mockClear();

			ellipseMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(onChange).toHaveBeenCalledTimes(0);
			expect(onFinish).toHaveBeenCalledTimes(0);
			expect(setMapDraggability).toHaveBeenCalledTimes(0);
		});

		describe.each([["click-drag" as const], ["click-move-or-drag" as const]])(
			"with drawInteraction %s and drag true",
			(drawInteraction) => {
				it("begins drawing", () => {
					ellipseMode = new TerraDrawEllipseMode({
						drawInteraction,
					});

					const mockConfig = MockModeConfig(ellipseMode.mode);
					onChange = mockConfig.onChange;
					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledWith(
						[expect.any(String)],
						"create",
						undefined,
					);
					expect(onFinish).not.toHaveBeenCalled();
					expect(setMapDraggability).toHaveBeenCalledTimes(1);
					expect(setMapDraggability).toHaveBeenCalledWith(false);
				});
			},
		);
	});

	describe("onDragEnd", () => {
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let ellipseMode: TerraDrawEllipseMode;
		let setMapDraggability: jest.Mock;
		let store: TerraDrawGeoJSONStore;

		beforeEach(() => {
			setMapDraggability = jest.fn();
		});

		describe.each([
			["without drawInteraction option", undefined],
			["with drawInteraction click-move", "click-move" as const],
		])("%s", (_, drawInteraction) => {
			it("does nothing", () => {
				ellipseMode = new TerraDrawEllipseMode(
					drawInteraction ? { drawInteraction } : undefined,
				);
				const mockConfig = MockModeConfig(ellipseMode.mode);
				store = mockConfig.store;
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				ellipseMode.register(mockConfig);
				ellipseMode.start();

				ellipseMode.onDragEnd(
					MockCursorEvent({ lng: 0, lat: 0 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(0);
				expect(onFinish).toHaveBeenCalledTimes(0);
				expect(setMapDraggability).toHaveBeenCalledTimes(0);
			});
		});

		describe.each([["click-drag" as const], ["click-move-or-drag" as const]])(
			"with drawInteraction %s and onDragEnd pointer event false",
			(drawInteraction) => {
				it("does nothing", () => {
					ellipseMode = new TerraDrawEllipseMode({
						drawInteraction,
						pointerEvents: {
							...DefaultPointerEvents,
							onDragEnd: false,
						},
					});

					const mockConfig = MockModeConfig(ellipseMode.mode);
					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;
					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					onChange.mockClear();
					setMapDraggability.mockClear();

					ellipseMode.onDragEnd(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(0);
					expect(onFinish).toHaveBeenCalledTimes(0);
					expect(setMapDraggability).toHaveBeenCalledTimes(0);
				});
			},
		);

		describe.each([["click-drag" as const], ["click-move-or-drag" as const]])(
			"with drawInteraction %s",
			(drawInteraction) => {
				it("restores map draggability after Escape cancel during drag", () => {
					ellipseMode = new TerraDrawEllipseMode({
						drawInteraction,
					});

					const mockConfig = MockModeConfig(ellipseMode.mode);
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;
					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					setMapDraggability.mockClear();

					ellipseMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

					ellipseMode.onDragEnd(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					expect(onFinish).toHaveBeenCalledTimes(0);
					expect(setMapDraggability).toHaveBeenCalledTimes(1);
					expect(setMapDraggability).toHaveBeenCalledWith(true);
				});

				it("finishes the ellipse", () => {
					ellipseMode = new TerraDrawEllipseMode({
						drawInteraction,
					});

					const mockConfig = MockModeConfig(ellipseMode.mode);
					const setMapDraggability = jest.fn();

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					const onFinish = mockConfig.onFinish;
					ellipseMode.register(mockConfig);
					ellipseMode.start();

					ellipseMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					expect(setMapDraggability).toHaveBeenCalledTimes(1);

					let features = store.copyAll();

					ellipseMode.onDragEnd(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					features = store.copyAll();
					expect(features.length).toBe(1);

					const ellipse = features[0] as GeoJSONStoreFeatures<Polygon>;

					expect(ellipse.properties[COMMON_PROPERTIES.CURRENTLY_DRAWING]).toBe(
						undefined,
					);

					expect(onChange).toHaveBeenCalledTimes(2);
					expect(onChange).toHaveBeenNthCalledWith(
						1,
						[expect.any(String)],
						"create",
						undefined,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
					expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
						action: "draw",
						mode: "ellipse",
					});

					expect(setMapDraggability).toHaveBeenCalledTimes(2);
					expect(setMapDraggability).toHaveBeenNthCalledWith(2, true);
				});
			},
		);
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const ellipseMode = new TerraDrawEllipseMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					outlineOpacity: 0.75,
					fillOpacity: 0.5,
				},
			});

			expect(
				ellipseMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "ellipse" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonOutlineWidth: 2,
				polygonOutlineOpacity: 0.75,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct callback styles for polygon", () => {
			const ellipseMode = new TerraDrawEllipseMode({
				styles: {
					fillColor: () => "#ffffff",
					outlineColor: () => "#ffffff",
					outlineWidth: () => 2,
					outlineOpacity: () => 0.75,
					fillOpacity: () => 0.5,
				},
			});

			expect(
				ellipseMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "ellipse" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonOutlineWidth: 2,
				polygonOutlineOpacity: 0.75,
				polygonFillOpacity: 0.5,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid ellipse feature", () => {
			const ellipseMode = new TerraDrawEllipseMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			ellipseMode.register(MockModeConfig("ellipse"));

			expect(
				ellipseMode.validateFeature({
					id: "29da86c2-92e2-4095-a1b3-22103535ebfa",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [[]],
					},
					properties: {
						mode: "ellipse",
						createdAt: 1685568434891,
						updatedAt: 1685568435434,
					},
				}),
			).toEqual({
				reason: "Feature has less than 4 coordinates",
				valid: false,
			});
		});

		it("returns true for valid ellipse feature", () => {
			const ellipseMode = new TerraDrawEllipseMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			ellipseMode.register(MockModeConfig("ellipse"));

			expect(
				ellipseMode.validateFeature({
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
						mode: "ellipse",
						createdAt: 1685568434891,
						updatedAt: 1685568435434,
					},
				}),
			).toEqual({
				valid: true,
			});
		});

		it("returns false for valid ellipse feature but with validation that returns false", () => {
			const ellipseMode = new TerraDrawEllipseMode({
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
			ellipseMode.register(MockModeConfig("ellipse"));

			expect(
				ellipseMode.validateFeature({
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
						mode: "ellipse",
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
			const ellipseMode = new TerraDrawEllipseMode();
			const mockConfig = MockModeConfig(ellipseMode.mode);
			ellipseMode.register(mockConfig);
			ellipseMode.start();

			jest.spyOn(mockConfig.store, "delete");

			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			const firstEllipse = features[0];

			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);

			// Second ellipse started
			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();
			mockConfig.setDoubleClickToZoom.mockClear();

			ellipseMode.afterFeatureUpdated({
				...firstEllipse,
			});

			expect(mockConfig.setDoubleClickToZoom).toHaveBeenCalledTimes(0);
			expect(mockConfig.store.delete).toHaveBeenCalledTimes(0);
			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("sets drawing back to started", () => {
			const ellipseMode = new TerraDrawEllipseMode();
			const mockConfig = MockModeConfig(ellipseMode.mode);
			ellipseMode.register(mockConfig);
			ellipseMode.start();

			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			const features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			const feature = features[0];

			// Set the onChange count to 0
			mockConfig.setDoubleClickToZoom.mockClear();

			ellipseMode.afterFeatureUpdated({
				...feature,
			});

			expect(mockConfig.setDoubleClickToZoom).toHaveBeenCalledTimes(1);
		});
	});
});
