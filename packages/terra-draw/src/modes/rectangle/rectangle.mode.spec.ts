import { GeoJSONStore, GeoJSONStoreFeatures } from "../../store/store";
import { MockModeConfig } from "../../test/mock-mode-config";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { TerraDrawRectangleMode } from "./rectangle.mode";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { Polygon } from "geojson";
import { followsRightHandRule } from "../../geometry/boolean/right-hand-rule";
import { COMMON_PROPERTIES, TerraDrawGeoJSONStore } from "../../common";
import { DefaultPointerEvents } from "../base.mode";

describe("TerraDrawRectangleMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const rectangleMode = new TerraDrawRectangleMode();
			expect(rectangleMode.mode).toBe("rectangle");
			expect(rectangleMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
			});
			expect(rectangleMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawRectangleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawRectangleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});

		it("constructs with custom mode name", () => {
			const rectangleMode = new TerraDrawRectangleMode({ modeName: "custom" });
			expect(rectangleMode.mode).toBe("custom");
		});

		it("constructs with drawInteraction option", () => {
			new TerraDrawRectangleMode({
				drawInteraction: "click-move",
			});

			new TerraDrawRectangleMode({
				drawInteraction: "click-drag",
			});

			new TerraDrawRectangleMode({
				drawInteraction: "click-move-or-drag",
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const rectangleMode = new TerraDrawRectangleMode();
			expect(rectangleMode.state).toBe("unregistered");
			rectangleMode.register(MockModeConfig(rectangleMode.mode));
			expect(rectangleMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.register(MockModeConfig(rectangleMode.mode));
				rectangleMode.register(MockModeConfig(rectangleMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			rectangleMode.register(MockModeConfig(rectangleMode.mode));
			rectangleMode.start();

			expect(rectangleMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			rectangleMode.register(MockModeConfig(rectangleMode.mode));
			rectangleMode.start();
			rectangleMode.stop();

			expect(rectangleMode.state).toBe("stopped");
		});
	});

	describe("onClick", () => {
		let rectangleMode: TerraDrawRectangleMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			rectangleMode = new TerraDrawRectangleMode();
			store = new GeoJSONStore();
			onChange = jest.fn();
		});

		it("throws an error if not registered", () => {
			expect(() => {
				rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			}).toThrow();
		});

		describe("registered", () => {
			it("adds a rectangle to store if registered", () => {
				const mockConfig = MockModeConfig(rectangleMode.mode);

				store = mockConfig.store;
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;

				rectangleMode.register(mockConfig);
				rectangleMode.start();
				rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledWith(
					[expect.any(String)],
					"create",
					undefined,
				);
				expect(onFinish).toHaveBeenCalledTimes(0);
			});

			describe.each([
				["click-move" as const, true],
				["click-move-or-drag" as const, true],
				["click-drag" as const, false],
			])("with drawInteraction %s", (drawInteraction, shouldAddRectangle) => {
				it(`${shouldAddRectangle ? "adds" : "does not add"} a rectangle to store`, () => {
					rectangleMode = new TerraDrawRectangleMode({
						drawInteraction,
					});
					const mockConfig = MockModeConfig(rectangleMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					rectangleMode.register(mockConfig);
					rectangleMode.start();

					rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onChange).toHaveBeenCalledTimes(shouldAddRectangle ? 1 : 0);
					if (shouldAddRectangle) {
						expect(onChange).toHaveBeenCalledWith(
							[expect.any(String)],
							"create",
							undefined,
						);
					}

					expect(onFinish).toHaveBeenCalledTimes(0);
				});
			});

			describe.each([["click-move" as const], ["click-move-or-drag" as const]])(
				"with drawInteraction %s",
				(drawInteraction) => {
					it("finishes drawing rectangle on second click", () => {
						rectangleMode = new TerraDrawRectangleMode({
							drawInteraction,
						});
						const mockConfig = MockModeConfig(rectangleMode.mode);

						store = mockConfig.store;
						onChange = mockConfig.onChange;
						onFinish = mockConfig.onFinish;

						rectangleMode.register(mockConfig);
						rectangleMode.start();

						rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

						let features = store.copyAll();
						expect(features.length).toBe(1);
						expect(
							features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
						).toBe(true);

						rectangleMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

						features = store.copyAll();
						expect(features.length).toBe(1);
						expect(
							features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
						).toBe(undefined);

						expect(followsRightHandRule(features[0].geometry as Polygon)).toBe(
							true,
						);

						expect(onChange).toHaveBeenCalledTimes(3);
						expect(onChange).toHaveBeenCalledWith(
							[expect.any(String)],
							"create",
							undefined,
						);
						expect(onFinish).toHaveBeenCalledTimes(1);
						expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
							action: "draw",
							mode: "rectangle",
						});
					});
				},
			);

			describe("validate", () => {
				let valid = false;

				beforeEach(() => {
					rectangleMode = new TerraDrawRectangleMode({
						validation: () => ({ valid }),
					});
					const mockConfig = MockModeConfig(rectangleMode.mode);

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;

					rectangleMode.register(mockConfig);
					rectangleMode.start();
				});

				it("does not finish drawing circle on second click if validation returns false", () => {
					valid = false;

					rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					let features = store.copyAll();
					expect(features.length).toBe(1);
					const beforeGeometry = features[0].geometry;

					rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					features = store.copyAll();
					expect(features.length).toBe(1);
					const afterGeometry = features[0].geometry;

					// The second click should not have changed the geometry
					expect(afterGeometry).toStrictEqual(beforeGeometry);

					// Create, but no properties changed
					expect(onChange).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenNthCalledWith(
						1,
						[expect.any(String)],
						"create",
						undefined,
					);

					// The second click should not have finished the drawing
					expect(onFinish).toHaveBeenCalledTimes(0);
				});

				it("does finish drawing circle on second click if validation returns true with no cursor movement", () => {
					valid = true;

					rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					let features = store.copyAll();
					expect(features.length).toBe(1);

					rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					features = store.copyAll();
					expect(features.length).toBe(1);

					expect(onChange).toHaveBeenCalledTimes(3);
					expect(onChange).toHaveBeenNthCalledWith(
						1,
						[expect.any(String)],
						"create",
						undefined,
					);
					expect(onChange).toHaveBeenNthCalledWith(
						2,
						[expect.any(String)],
						"update",
						{ target: "geometry", updateType: "finish" },
					);
					expect(onChange).toHaveBeenNthCalledWith(
						3,
						[expect.any(String)],
						"update",
						{ target: "properties", updateType: "finish" },
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
					expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
						action: "draw",
						mode: "rectangle",
					});
				});
			});

			it("with leftClick pointer event set to false should not allow click", () => {
				rectangleMode = new TerraDrawRectangleMode({
					pointerEvents: {
						...DefaultPointerEvents,
						leftClick: false,
					},
				});
				const mockConfig = MockModeConfig(rectangleMode.mode);

				store = mockConfig.store;
				rectangleMode.register(mockConfig);
				rectangleMode.start();

				rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				rectangleMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				rectangleMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				let features = store.copyAll();
				expect(features.length).toBe(0);
			});
		});
	});

	describe("onKeyUp", () => {
		let rectangleMode: TerraDrawRectangleMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		it("finishes drawing rectangle on finish key press", () => {
			rectangleMode = new TerraDrawRectangleMode();
			const mockConfig = MockModeConfig(rectangleMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			rectangleMode.register(mockConfig);
			rectangleMode.start();

			rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let [firstRectangle] = store.copyAll();
			expect(firstRectangle).toBeDefined();
			expect(
				firstRectangle.properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
			).toBe(true);

			rectangleMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

			expect(onFinish).toHaveBeenCalledTimes(1);

			rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const features = store.copyAll();

			// Two features as the rectangle has been closed via enter
			expect(features.length).toBe(2);
			const finishedFeature = features.find(
				(feature) => feature.id === firstRectangle.id,
			);
			expect(finishedFeature).toBeDefined();
			expect(
				finishedFeature!.properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
			).toBe(undefined);

			// close calls onChange an extra time because of the right hand rule fixing
			expect(onChange).toHaveBeenCalledTimes(4);
			expect(onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"create",
				undefined,
			);
		});

		it("does not finish on key press when keyEvents null", () => {
			rectangleMode = new TerraDrawRectangleMode({ keyEvents: null });
			const mockConfig = MockModeConfig(rectangleMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			rectangleMode.register(mockConfig);
			rectangleMode.start();

			rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);

			rectangleMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

			features = store.copyAll();

			// Only one as the click will close the rectangle
			expect(features.length).toBe(1);

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"create",
				undefined,
			);
			expect(onFinish).toHaveBeenCalledTimes(0);
		});
	});

	describe("onMouseMove", () => {
		let rectangleMode: TerraDrawRectangleMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			rectangleMode = new TerraDrawRectangleMode();

			const mockConfig = MockModeConfig(rectangleMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;

			rectangleMode.register(mockConfig);
			rectangleMode.start();
		});

		it("updates the rectangle size", () => {
			rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"create",
				undefined,
			);

			const feature = store.copyAll()[0];

			rectangleMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			expect(onChange).toHaveBeenCalledTimes(2);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"update",
				{ target: "geometry", updateType: "provisional" },
			);

			const updatedFeature = store.copyAll()[0];

			expect(feature.id).toBe(updatedFeature.id);
			expect(feature.geometry.coordinates).not.toStrictEqual(
				updatedFeature.geometry.coordinates,
			);

			expect(followsRightHandRule(updatedFeature.geometry as Polygon)).toBe(
				true,
			);
		});
	});

	describe("cleanUp", () => {
		let rectangleMode: TerraDrawRectangleMode;
		let onChange: jest.Mock;

		beforeEach(() => {
			rectangleMode = new TerraDrawRectangleMode();

			const mockConfig = MockModeConfig(rectangleMode.mode);

			onChange = mockConfig.onChange;

			rectangleMode.register(mockConfig);
			rectangleMode.start();
		});

		it("does not delete if no rectangle has been created", () => {
			rectangleMode.cleanUp();
			expect(onChange).toHaveBeenCalledTimes(0);
		});

		it("does delete if a rectangle has been created", () => {
			rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			rectangleMode.cleanUp();

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
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let rectangleMode: TerraDrawRectangleMode;

		beforeEach(() => {
			jest.resetAllMocks();
			rectangleMode = new TerraDrawRectangleMode();

			const mockConfig = MockModeConfig(rectangleMode.mode);
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			rectangleMode.register(mockConfig);
			rectangleMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no rectangle is present", () => {
				rectangleMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));
				const features = store.copyAll();
				expect(features.length).toBe(0);
				expect(onChange).toHaveBeenCalledTimes(0);
				expect(onFinish).toHaveBeenCalledTimes(0);
			});

			it("deletes the rectangle when currently editing", () => {
				rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);

				// Clear previous onChange calls
				onChange.mockClear();

				rectangleMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				features = store.copyAll();
				expect(features.length).toBe(0);
				expect(onChange).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String)],
					"delete",
					undefined,
				);
				expect(onFinish).toHaveBeenCalledTimes(0);
			});
		});
	});

	describe("onDrag", () => {
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let rectangleMode: TerraDrawRectangleMode;
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
				rectangleMode = new TerraDrawRectangleMode(
					drawInteraction ? { drawInteraction } : undefined,
				);

				const mockConfig = MockModeConfig(rectangleMode.mode);
				store = mockConfig.store;
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				rectangleMode.register(mockConfig);
				rectangleMode.start();

				rectangleMode.onDrag(
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
					const rectangleMode = new TerraDrawRectangleMode({
						drawInteraction,
						pointerEvents: {
							...DefaultPointerEvents,
							onDrag: false,
						},
					});

					const mockConfig = MockModeConfig(rectangleMode.mode);
					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;
					rectangleMode.register(mockConfig);
					rectangleMode.start();

					rectangleMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					onChange.mockClear();

					rectangleMode.onDrag(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					expect(onFinish).toHaveBeenCalledTimes(0);
					expect(onChange).toHaveBeenCalledTimes(0);
				});
			},
		);

		it("with drawInteraction click-move-or-drag and drawType is click it does nothing", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				drawInteraction: "click-move-or-drag",
			});

			const mockConfig = MockModeConfig(rectangleMode.mode);
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			rectangleMode.register(mockConfig);
			rectangleMode.start();

			rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			onChange.mockClear();
			onFinish.mockClear();

			rectangleMode.onDrag(
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
				it("updates the rectangle size", () => {
					const rectangleMode = new TerraDrawRectangleMode({
						drawInteraction,
					});

					const mockConfig = MockModeConfig(rectangleMode.mode);
					store = mockConfig.store;
					onChange = mockConfig.onChange;
					rectangleMode.register(mockConfig);
					rectangleMode.start();

					rectangleMode.onDragStart(
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

					rectangleMode.onDrag(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(2);
					expect(onChange).toHaveBeenNthCalledWith(
						2,
						[expect.any(String)],
						"update",
						{ target: "geometry", updateType: "provisional" },
					);

					const updatedFeature = store.copyAll()[0];

					expect(feature.id).toBe(updatedFeature.id);
					expect(feature.geometry.coordinates).not.toStrictEqual(
						updatedFeature.geometry.coordinates,
					);

					expect(followsRightHandRule(updatedFeature.geometry as Polygon)).toBe(
						true,
					);
					expect(setMapDraggability).toHaveBeenCalledTimes(1);
				});
			},
		);
	});

	describe("onDragStart", () => {
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let rectangleMode: TerraDrawRectangleMode;
		let setMapDraggability: jest.Mock;

		beforeEach(() => {
			setMapDraggability = jest.fn();
		});

		describe.each([
			["without drawInteraction option", undefined],
			["with drawInteraction click-move", "click-move" as const],
		])("%s", (_, drawInteraction) => {
			it("does nothing", () => {
				rectangleMode = new TerraDrawRectangleMode(
					drawInteraction ? { drawInteraction } : undefined,
				);
				const mockConfig = MockModeConfig(rectangleMode.mode);

				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				rectangleMode.register(mockConfig);
				rectangleMode.start();

				rectangleMode.onDragStart(
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
					rectangleMode = new TerraDrawRectangleMode({
						drawInteraction,
						pointerEvents: {
							...DefaultPointerEvents,
							onDragStart: false,
						},
					});

					const mockConfig = MockModeConfig(rectangleMode.mode);
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;
					rectangleMode.register(mockConfig);
					rectangleMode.start();

					rectangleMode.onDragStart(
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
			rectangleMode = new TerraDrawRectangleMode({
				drawInteraction: "click-move-or-drag",
			});

			const mockConfig = MockModeConfig(rectangleMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			rectangleMode.register(mockConfig);
			rectangleMode.start();

			rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			onChange.mockClear();

			rectangleMode.onDragStart(
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
					rectangleMode = new TerraDrawRectangleMode({
						drawInteraction,
					});

					const mockConfig = MockModeConfig(rectangleMode.mode);
					onChange = mockConfig.onChange;
					rectangleMode.register(mockConfig);
					rectangleMode.start();

					rectangleMode.onDragStart(
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
		let rectangleMode: TerraDrawRectangleMode;
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
				rectangleMode = new TerraDrawRectangleMode(
					drawInteraction ? { drawInteraction } : undefined,
				);
				const mockConfig = MockModeConfig(rectangleMode.mode);
				store = mockConfig.store;
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				rectangleMode.register(mockConfig);
				rectangleMode.start();

				rectangleMode.onDragEnd(
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
					rectangleMode = new TerraDrawRectangleMode({
						drawInteraction,
						pointerEvents: {
							...DefaultPointerEvents,
							onDragEnd: false,
						},
					});

					const mockConfig = MockModeConfig(rectangleMode.mode);
					store = mockConfig.store;
					onChange = mockConfig.onChange;
					onFinish = mockConfig.onFinish;
					rectangleMode.register(mockConfig);
					rectangleMode.start();

					rectangleMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					onChange.mockClear();
					setMapDraggability.mockClear();

					rectangleMode.onDragEnd(
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
				it("finishes the rectangle", () => {
					rectangleMode = new TerraDrawRectangleMode({
						drawInteraction,
					});

					const mockConfig = MockModeConfig(rectangleMode.mode);
					const setMapDraggability = jest.fn();

					store = mockConfig.store;
					onChange = mockConfig.onChange;
					const onFinish = mockConfig.onFinish;
					rectangleMode.register(mockConfig);
					rectangleMode.start();

					rectangleMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						setMapDraggability,
					);

					expect(setMapDraggability).toHaveBeenCalledTimes(1);

					let features = store.copyAll();

					rectangleMode.onDragEnd(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					features = store.copyAll();
					expect(features.length).toBe(1);

					const rectangle = features[0] as GeoJSONStoreFeatures<Polygon>;

					expect(
						rectangle.properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
					).toBe(undefined);

					expect(followsRightHandRule(rectangle.geometry)).toBe(true);

					expect(onChange).toHaveBeenCalledTimes(3);
					expect(onChange).toHaveBeenNthCalledWith(
						1,
						[expect.any(String)],
						"create",
						undefined,
					);

					expect(onFinish).toHaveBeenCalledTimes(1);
					expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
						action: "draw",
						mode: "rectangle",
					});

					expect(setMapDraggability).toHaveBeenCalledTimes(2);
					expect(setMapDraggability).toHaveBeenNthCalledWith(2, true);
				});
			},
		);
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#111111",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});

			expect(
				rectangleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "rectangle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct styles for polygon using function", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: {
					fillColor: () => "#ffffff",
					outlineColor: () => "#111111",
					outlineWidth: () => 2,
					fillOpacity: () => 0.5,
				},
			});

			rectangleMode.register(MockModeConfig(rectangleMode.mode));

			expect(
				rectangleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "rectangle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid rectangle feature", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			rectangleMode.register(MockModeConfig("rectangle"));

			expect(
				rectangleMode.validateFeature({
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
				reason: "Feature mode property does not match the mode being added to",
				valid: false,
			});
		});

		it("returns false for self intersecting polygon feature", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			rectangleMode.register(MockModeConfig("rectangle"));

			expect(
				rectangleMode.validateFeature({
					id: "66608334-7cf1-4f9e-a7f9-75e5ac135e68",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[32.444491568083606, 14.505420356577304],
							[30.307948144285064, 14.505420356577304],
							[34.06410625175073, 12.956749504791858],
							[30.307948144285064, 11.633717129582067],
							[32.444491568083606, 11.633717129582067],
							[32.444491568083606, 14.505420356577304],
						],
					},
					properties: {
						mode: "rectangle",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toEqual({
				valid: false,
				reason: "Feature has holes",
			});
		});

		it("returns true for valid rectangle feature with validation that returns true", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				validation: () => {
					return { valid: true };
				},
			});
			rectangleMode.register(MockModeConfig("rectangle"));

			expect(
				rectangleMode.validateFeature({
					id: "5c582a42-c3a7-4bfc-b686-6036f311df3c",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.127976611, 51.514237243],
								[-0.106284245, 51.514237243],
								[-0.106284245, 51.504807832],
								[-0.127976611, 51.504807832],
								[-0.127976611, 51.514237243],
							],
						],
					},
					properties: {
						mode: "rectangle",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toEqual({
				valid: true,
			});
		});

		it("returns false for valid rectangle feature but with validation that returns false", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				validation: () => {
					return { valid: false };
				},
			});
			rectangleMode.register(MockModeConfig("rectangle"));

			expect(
				rectangleMode.validateFeature({
					id: "5c582a42-c3a7-4bfc-b686-6036f311df3c",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.127976611, 51.514237243],
								[-0.106284245, 51.514237243],
								[-0.106284245, 51.504807832],
								[-0.127976611, 51.504807832],
								[-0.127976611, 51.514237243],
							],
						],
					},
					properties: {
						mode: "rectangle",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toEqual({
				valid: false,
			});
		});
	});

	describe("afterFeatureUpdated", () => {
		it("does nothing when update is not for the currently drawn polygon", () => {
			const rectangleMode = new TerraDrawRectangleMode();
			const mockConfig = MockModeConfig(rectangleMode.mode);
			rectangleMode.register(mockConfig);
			rectangleMode.start();

			rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			rectangleMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			rectangleMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);

			const feature = mockConfig.store.copyAll()[0];

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();
			mockConfig.setDoubleClickToZoom.mockClear();

			rectangleMode.afterFeatureUpdated({
				...feature,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
			expect(mockConfig.setDoubleClickToZoom).toHaveBeenCalledTimes(0);
		});

		it("sets drawing back to started", () => {
			const rectangleMode = new TerraDrawRectangleMode();
			const mockConfig = MockModeConfig(rectangleMode.mode);
			rectangleMode.register(mockConfig);
			rectangleMode.start();

			rectangleMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			rectangleMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			const features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			const feature = features[0];

			// Set the onChange count to 0
			mockConfig.setDoubleClickToZoom.mockClear();

			rectangleMode.afterFeatureUpdated({
				...feature,
			});

			expect(mockConfig.setDoubleClickToZoom).toHaveBeenCalledTimes(1);
		});
	});
});
