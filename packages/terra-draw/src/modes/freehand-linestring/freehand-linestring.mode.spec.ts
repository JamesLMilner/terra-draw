import {
	GeoJSONStore,
	GeoJSONStoreFeatures,
	JSONObject,
} from "../../store/store";
import { MockModeConfig } from "../../test/mock-mode-config";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { TerraDrawFreehandLineStringMode } from "./freehand-linestring.mode";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { COMMON_PROPERTIES, TerraDrawGeoJSONStore } from "../../common";
import { DefaultPointerEvents } from "../base.mode";
import { MockLineString } from "../../test/mock-features";

describe("TerraDrawFreehandLineStringMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();
			expect(freehandMode.mode).toBe("freehand-linestring");
			expect(freehandMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode({
				styles: { lineStringColor: "#ffffff" },
				minDistance: 5,
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
			});
			expect(freehandMode.styles).toStrictEqual({
				lineStringColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawFreehandLineStringMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawFreehandLineStringMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});

		it("constructs with custom mode name", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode({
				modeName: "custom",
			});
			expect(freehandMode.mode).toBe("custom");
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();
			expect(freehandMode.state).toBe("unregistered");
			freehandMode.register(MockModeConfig(freehandMode.mode));
			expect(freehandMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			expect(() => {
				freehandMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			expect(() => {
				freehandMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			expect(() => {
				freehandMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			expect(() => {
				freehandMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			expect(() => {
				freehandMode.register(MockModeConfig(freehandMode.mode));
				freehandMode.register(MockModeConfig(freehandMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			freehandMode.register(MockModeConfig(freehandMode.mode));
			freehandMode.start();

			expect(freehandMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			freehandMode.register(MockModeConfig(freehandMode.mode));
			freehandMode.start();
			freehandMode.stop();

			expect(freehandMode.state).toBe("stopped");
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();
			freehandMode.updateOptions({
				cursors: {
					start: "pointer",
					close: "pointer",
				},
			});
			const mockConfig = MockModeConfig(freehandMode.mode);
			freehandMode.register(mockConfig);
			freehandMode.start();
			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change key events", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();
			freehandMode.updateOptions({
				keyEvents: {
					cancel: "C",
					finish: "F",
				},
			});
			const mockConfig = MockModeConfig(freehandMode.mode);
			freehandMode.register(mockConfig);
			freehandMode.start();

			freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			freehandMode.onKeyUp(MockKeyboardEvent({ key: "C" }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(0);
		});

		it("can update styles", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			const mockConfig = MockModeConfig(freehandMode.mode);

			freehandMode.register(mockConfig);
			freehandMode.start();

			freehandMode.updateOptions({
				styles: {
					lineStringColor: "#ffffff",
				},
			});
			expect(freehandMode.styles).toStrictEqual({
				lineStringColor: "#ffffff",
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
		});

		it("accepts minDistance set to 0", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode({
				minDistance: 0,
			});
			const mockConfig = MockModeConfig(freehandMode.mode);

			freehandMode.register(mockConfig);
			freehandMode.start();

			freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			freehandMode.onMouseMove(MockCursorEvent({ lng: 0.1, lat: 0.1 }));

			const lineString = mockConfig.store
				.copyAll()
				.find((feature) => feature.geometry.type === "LineString");

			expect(lineString).toBeDefined();
			expect(
				(lineString as GeoJSONStoreFeatures).geometry.coordinates,
			).toHaveLength(3);
		});
	});

	describe("onClick", () => {
		let freehandMode: TerraDrawFreehandLineStringMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			freehandMode = new TerraDrawFreehandLineStringMode();
			store = new GeoJSONStore();
		});

		it("throws an error if not registered", () => {
			expect(() => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			}).toThrow();
		});

		describe("registered", () => {
			beforeEach(() => {
				const mockConfig = MockModeConfig(freehandMode.mode);
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				store = mockConfig.store;
				freehandMode.register(mockConfig);
				freehandMode.start();
			});

			it("adds a linestring and closing point to store if registered", () => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).toHaveBeenCalledTimes(2);
				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String)],
					"create",
					undefined,
				);
				expect(onChange).toHaveBeenNthCalledWith(
					2,
					[expect.any(String)],
					"create",
					undefined,
				);

				const features = store.copyAll();
				expect(features.length).toBe(2);
				expect(features[0].geometry.type).toBe("LineString");
				expect(features[1].geometry.type).toBe("Point");
				expect(features[1].properties.closingPoint).toBe(true);
			});

			it("finishes drawing linestring on second click", () => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				freehandMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 1 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);
				expect(
					features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBe(true);

				freehandMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				// No more closing coordinate so we drop to 1 feature
				features = store.copyAll();
				expect(features.length).toBe(1);
				expect(
					features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBe(undefined);

				expect(onChange).toHaveBeenCalledTimes(6);
				expect(onFinish).toHaveBeenCalledTimes(1);
			});

			describe("with leftClick pointer event set to false", () => {
				beforeEach(() => {
					freehandMode = new TerraDrawFreehandLineStringMode({
						pointerEvents: {
							...DefaultPointerEvents,
							leftClick: false,
						},
					});
					const mockConfig = MockModeConfig(freehandMode.mode);

					store = mockConfig.store;
					freehandMode.register(mockConfig);
					freehandMode.start();
				});

				it("should not allow click", () => {
					freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					freehandMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

					freehandMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

					let features = store.copyAll();
					expect(features.length).toBe(0);
				});
			});
		});

		describe("registered with validate", () => {
			let valid = true;
			beforeEach(() => {
				freehandMode = new TerraDrawFreehandLineStringMode({
					validation: () => {
						return { valid };
					},
				});
				store = new GeoJSONStore();

				const mockConfig = MockModeConfig(freehandMode.mode);
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				store = mockConfig.store;
				freehandMode.register(mockConfig);
				freehandMode.start();
			});

			it("does not finish drawing linestring on second click because validate returns false", () => {
				valid = false;

				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				// Closing coordinate should still exist
				features = store.copyAll();
				expect(features.length).toBe(2);

				expect(onFinish).not.toHaveBeenCalled();
			});

			it("does finish drawing linestring on second click because validate returns true", () => {
				valid = true;

				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				// Closing coordinate should be removed
				features = store.copyAll();
				expect(features.length).toBe(1);
				expect(features[0].geometry.type).toBe("LineString");

				expect(onFinish).toHaveBeenCalledTimes(1);
				expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
					action: "draw",
					mode: "freehand-linestring",
				});
			});
		});
	});

	describe("onMouseMove", () => {
		let freehandMode: TerraDrawFreehandLineStringMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			freehandMode = new TerraDrawFreehandLineStringMode();

			const mockConfig = MockModeConfig(freehandMode.mode);
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			freehandMode.register(mockConfig);
			freehandMode.start();
		});

		it("updates the freehand linestring when the mouse cursor has moved a minimum amount", () => {
			freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).toHaveBeenCalledTimes(2);
			expect(onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"create",
				undefined,
			);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"create",
				undefined,
			);

			const [feature] = store.copyAll();

			for (let i = 1; i < 6; i++) {
				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: i,
						lat: i,
					}),
				);
			}

			expect(onChange).toHaveBeenCalledTimes(12);

			const updatedFeature = store.copyAll()[0];

			expect(feature.id).toBe(updatedFeature.id);
			expect(feature.geometry.coordinates).not.toStrictEqual(
				updatedFeature.geometry.coordinates,
			);
		});

		it("does nothing if no first click", () => {
			freehandMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			expect(onChange).toHaveBeenCalledTimes(0);
		});
	});

	describe("cleanUp", () => {
		let freehandMode: TerraDrawFreehandLineStringMode;
		let onChange: jest.Mock;

		beforeEach(() => {
			freehandMode = new TerraDrawFreehandLineStringMode();
			const mockConfig = MockModeConfig(freehandMode.mode);
			onChange = mockConfig.onChange;
			freehandMode.register(mockConfig);
			freehandMode.start();
		});

		it("does not delete if no freehand has been created", () => {
			freehandMode.cleanUp();
			expect(onChange).toHaveBeenCalledTimes(0);
		});

		it("does delete if a freehand has been created", () => {
			freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			freehandMode.cleanUp();

			expect(onChange).toHaveBeenCalledTimes(4);
			expect(onChange).toHaveBeenNthCalledWith(
				3,
				[expect.any(String)],
				"delete",
				undefined,
			);
			expect(onChange).toHaveBeenNthCalledWith(
				4,
				[expect.any(String)],
				"delete",
				undefined,
			);
		});
	});

	describe("onKeyUp", () => {
		let store: TerraDrawGeoJSONStore;
		let freehandMode: TerraDrawFreehandLineStringMode;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			jest.resetAllMocks();

			freehandMode = new TerraDrawFreehandLineStringMode();

			const mockConfig = MockModeConfig(freehandMode.mode);
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			freehandMode.register(mockConfig);
			freehandMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no freehand is present", () => {
				freehandMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));
			});

			it("deletes the freehand when currently editing", () => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				features = store.copyAll();
				expect(features.length).toBe(0);
			});

			it("does not delete the freehand when currently editing if cancel is null", () => {
				freehandMode = new TerraDrawFreehandLineStringMode({ keyEvents: null });

				const mockConfig = MockModeConfig(freehandMode.mode);
				store = mockConfig.store;
				onChange = mockConfig.onChange;
				freehandMode.register(mockConfig);
				freehandMode.start();

				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				features = store.copyAll();
				expect(features.length).toBe(2);
			});
		});

		describe("finish", () => {
			it("finishes drawing linestring on finish key press", () => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String)],
					"create",
					undefined,
				);
				expect(onChange).toHaveBeenNthCalledWith(
					2,
					[expect.any(String)],
					"create",
					undefined,
				);

				freehandMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 1 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);
				expect(
					features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBe(true);

				freehandMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

				features = store.copyAll();

				expect(features.length).toBe(1);
				expect(
					features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBe(undefined);

				expect(onChange).toHaveBeenCalledTimes(6);

				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
					{ target: "geometry" },
				);
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String)],
					"update",
					{ target: "geometry" },
				);
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[expect.any(String)],
					"update",
					{ target: "properties" },
				);
				expect(onChange).toHaveBeenNthCalledWith(
					6,
					[expect.any(String)],
					"delete",
					undefined,
				);
				expect(onFinish).toHaveBeenCalledTimes(1);
				expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
					action: "draw",
					mode: "freehand-linestring",
				});
			});
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			expect(() => {
				freehandMode.onDrag(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());
			}).not.toThrow();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			expect(() => {
				freehandMode.onDragStart(
					MockCursorEvent({ lng: 0, lat: 0 }),
					jest.fn(),
				);
			}).not.toThrow();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();

			expect(() => {
				freehandMode.onDragEnd(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());
			}).not.toThrow();
		});
	});

	describe("drawInteraction", () => {
		const start = MockCursorEvent({ lng: 0, lat: 0 });
		const move = MockCursorEvent({ lng: 1, lat: 1 });

		beforeEach(() => jest.useFakeTimers());
		afterEach(() => {
			jest.runOnlyPendingTimers();
			jest.useRealTimers();
		});

		it.each([undefined, "click-move", "click-move-or-drag"] as const)(
			"draws with clicks for %s",
			(drawInteraction) => {
				const mode = new TerraDrawFreehandLineStringMode({ drawInteraction });
				const config = MockModeConfig(mode.mode);
				mode.register(config);
				mode.start();
				const setMapDraggability = jest.fn();
				mode.onClick(start);
				const initial = config.store.copyAll();
				mode.onDragStart(move, setMapDraggability);
				mode.onDrag(move, setMapDraggability);
				mode.onDragEnd(move, setMapDraggability);
				expect(config.store.copyAll()).toEqual(initial);
				expect(setMapDraggability).not.toHaveBeenCalled();
				mode.onMouseMove(move);
				mode.onClick(move);
				expect(config.store.copyAll()).toHaveLength(1);
				expect(config.store.copyAll()[0].geometry.coordinates).toEqual([
					[0, 0],
					[0, 0],
					[1, 1],
				]);
				expect(config.onFinish).toHaveBeenCalledTimes(1);
				expect(mode.state).toBe("started");
			},
		);

		it.each(["click-drag", "click-move-or-drag"] as const)(
			"draws by dragging for %s and suppresses the following click",
			(drawInteraction) => {
				const mode = new TerraDrawFreehandLineStringMode({ drawInteraction });
				const config = MockModeConfig(mode.mode);
				mode.register(config);
				mode.start();
				const setMapDraggability = jest.fn();
				mode.onDragStart(start, setMapDraggability);
				expect(mode.state).toBe("drawing");
				expect(setMapDraggability).toHaveBeenLastCalledWith(false);
				const initial = config.store.copyAll();
				mode.onMouseMove(move);
				mode.onClick(move);
				mode.onDragStart(move, setMapDraggability);
				mode.onDrag(
					MockCursorEvent({ lng: 0.01, lat: 0.01 }),
					setMapDraggability,
				);
				expect(config.store.copyAll()).toEqual(initial);
				mode.onDrag(move, setMapDraggability);
				mode.onDragEnd(move, setMapDraggability);
				const [feature] = config.store.copyAll();
				expect(config.store.copyAll()).toHaveLength(1);
				expect(feature.geometry.coordinates).toEqual([
					[0, 0],
					[0, 0],
					[1, 1],
				]);
				expect(
					feature.properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBeUndefined();
				expect(config.onFinish).toHaveBeenCalledWith(feature.id, {
					mode: mode.mode,
					action: "draw",
				});
				expect(mode.state).toBe("started");
				expect(setMapDraggability).toHaveBeenLastCalledWith(true);
				mode.onClick(move);
				mode.onDragStart(move, setMapDraggability);
				expect(config.store.copyAll()).toHaveLength(1);
				jest.advanceTimersByTime(500);
				mode.onDragStart(move, setMapDraggability);
				expect(mode.state).toBe("drawing");
				expect(config.store.copyAll()).toHaveLength(3);
			},
		);

		it("can update the interaction and ignores clicks in drag-only mode", () => {
			const mode = new TerraDrawFreehandLineStringMode();
			const config = MockModeConfig(mode.mode);
			mode.register(config);
			mode.start();
			mode.updateOptions({ drawInteraction: "click-drag" });
			mode.onClick(start);
			mode.onMouseMove(move);
			expect(config.store.copyAll()).toHaveLength(0);
			mode.onDragStart(start, jest.fn());
			expect(mode.state).toBe("drawing");
		});

		it.each(["onDragStart", "onDrag", "onDragEnd"] as const)(
			"respects the %s pointer event setting",
			(pointerEvent) => {
				const mode = new TerraDrawFreehandLineStringMode({
					drawInteraction: "click-drag",
					pointerEvents: { ...DefaultPointerEvents, [pointerEvent]: false },
				});
				const config = MockModeConfig(mode.mode);
				mode.register(config);
				mode.start();
				const setMapDraggability = jest.fn();
				if (pointerEvent !== "onDragStart") {
					mode.onDragStart(start, setMapDraggability);
				}
				const initial = config.store.copyAll();
				setMapDraggability.mockClear();
				mode[pointerEvent](move, setMapDraggability);
				expect(config.store.copyAll()).toEqual(initial);
				expect(setMapDraggability).not.toHaveBeenCalled();
				expect(config.onFinish).not.toHaveBeenCalled();
			},
		);

		it.each(["cancel", "finish", "stop"] as const)(
			"resets the interaction after %s",
			(action) => {
				const mode = new TerraDrawFreehandLineStringMode({
					drawInteraction: "click-move-or-drag",
				});
				const config = MockModeConfig(mode.mode);
				mode.register(config);
				mode.start();
				mode.onDragStart(start, jest.fn());
				mode.onDrag(move, jest.fn());
				if (action === "stop") {
					mode.stop();
					mode.start();
				} else {
					mode.onKeyUp(
						MockKeyboardEvent({
							key: action === "cancel" ? "Escape" : "Enter",
						}),
					);
				}
				const initial = config.store.copyAll();
				mode.onDrag(move, jest.fn());
				mode.onDragEnd(move, jest.fn());
				expect(config.store.copyAll()).toEqual(initial);
				mode.onClick(start);
				mode.onMouseMove(move);
				mode.onClick(move);
				expect(mode.state).toBe("started");
				expect(config.store.copyAll()).toHaveLength(
					action === "finish" ? 2 : 1,
				);
			},
		);
	});

	describe("styleFeature", () => {
		it("returns the correct styles for linestring", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
					lineStringWidth: 2,
					lineStringOpacity: 0.5,
					lineStringDash: [5, 3],
				},
			});

			expect(
				freehandMode.styleFeature({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties: { mode: "freehand-linestring" },
				}),
			).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 2,
				lineStringOpacity: 0.5,
				lineStringDash: [5, 3],
			});
		});

		it("returns the correct styles for linestring using function", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode({
				styles: {
					lineStringColor: () => "#ffffff",
					lineStringWidth: () => 2,
					lineStringDash: () => [5, 3],
				},
			});

			freehandMode.register(MockModeConfig(freehandMode.mode));

			expect(
				freehandMode.styleFeature({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties: { mode: "freehand-linestring" },
				}),
			).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 2,
				lineStringDash: [5, 3],
			});
		});

		it("returns the correct styles for point", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode({
				styles: {
					closingPointColor: "#ffffff",
					closingPointOutlineWidth: 2,
					closingPointWidth: 1,
				},
			});

			expect(
				freehandMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "freehand-linestring" },
				}),
			).toMatchObject({
				pointColor: "#ffffff",
				pointOutlineWidth: 2,
				pointWidth: 1,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid freehand feature", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode({
				styles: {
					closingPointColor: "#ffffff",
					closingPointOutlineWidth: 2,
					closingPointWidth: 1,
				},
			});
			freehandMode.register(MockModeConfig("freehand-linestring"));

			expect(
				freehandMode.validateFeature({
					id: "29da86c2-92e2-4095-a1b3-22103535ebfa",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [[]],
					},
					properties: {
						mode: "circle",
						createdAt: 1685568434891,
						updatedAt: 1685568435434,
					},
				}),
			).toEqual({
				valid: false,
				reason: "Feature mode property does not match the mode being added to",
			});
		});

		it("returns true for valid freehand feature", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode({
				styles: {
					closingPointColor: "#ffffff",
					closingPointOutlineWidth: 2,
					closingPointWidth: 1,
				},
			});
			freehandMode.register(MockModeConfig("freehand-linestring"));

			expect(
				freehandMode.validateFeature({
					id: "ddfa9367-3151-48b1-a7b2-c8ed3c0222db",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[-0.120849609, 52.348763182],
							[-0.120849609, 52.348763182],
							[-0.120849609, 52.348763182],
							[-0.197753906, 52.207606673],
							[-0.197753906, 52.072753654],
							[-0.043945312, 51.951036645],
							[0.186767578, 51.957807389],
							[0.362548828, 52.066000283],
							[0.373535156, 52.214338608],
							[0.208740234, 52.308478624],
							[-0.021972656, 52.315195264],
						],
					},
					properties: {
						mode: "freehand-linestring",
						createdAt: 1685569592712,
						updatedAt: 1685569593386,
					},
				}),
			).toEqual({
				valid: true,
			});
		});

		it("returns false for valid freehand feature but the validate function returns false", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode({
				validation: () => {
					return { valid: false };
				},
				styles: {
					closingPointColor: "#ffffff",
					closingPointOutlineWidth: 2,
					closingPointWidth: 1,
				},
			});
			freehandMode.register(MockModeConfig("freehand-linestring"));

			expect(
				freehandMode.validateFeature({
					id: "ddfa9367-3151-48b1-a7b2-c8ed3c0222db",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[
								[-0.120849609, 52.348763182],
								[-0.120849609, 52.348763182],
								[-0.120849609, 52.348763182],
								[-0.197753906, 52.207606673],
								[-0.197753906, 52.072753654],
								[-0.043945312, 51.951036645],
								[0.186767578, 51.957807389],
								[0.362548828, 52.066000283],
								[0.373535156, 52.214338608],
								[0.208740234, 52.308478624],
								[-0.021972656, 52.315195264],
								[-0.120849609, 52.348763182],
							],
						],
					},
					properties: {
						mode: "freehand-linestring",
						createdAt: 1685569592712,
						updatedAt: 1685569593386,
					},
				}),
			).toEqual({
				valid: false,
			});
		});
	});

	describe("afterFeatureUpdated", () => {
		it("does nothing when update is not for the currently drawn linestring", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();
			const mockConfig = MockModeConfig(freehandMode.mode);
			freehandMode.register(mockConfig);
			freehandMode.start();

			jest.spyOn(mockConfig.store, "delete");

			// Create an initial linestring
			const mockPolygon = MockLineString();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();

			expect(mockConfig.store.has(featureId)).toBe(true);

			freehandMode.afterFeatureUpdated({
				...(mockPolygon as GeoJSONStoreFeatures),
				id: featureId,
			});

			expect(mockConfig.store.delete).toHaveBeenCalledTimes(0);
			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("removes the closing point correctly when drawing has started", () => {
			const freehandMode = new TerraDrawFreehandLineStringMode();
			const mockConfig = MockModeConfig(freehandMode.mode);
			freehandMode.register(mockConfig);
			freehandMode.start();

			freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(mockConfig.onChange).toHaveBeenCalledTimes(2);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"create",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"create",
				undefined,
			);

			const [freehandPolygonFeature, freehandClosingPointFeature] =
				mockConfig.store.copyAll();

			freehandMode.onMouseMove(
				MockCursorEvent({
					lng: 1,
					lat: 1,
				}),
			);

			mockConfig.onChange.mockClear();

			freehandMode.afterFeatureUpdated({
				...(MockLineString() as GeoJSONStoreFeatures),
				id: freehandPolygonFeature.id,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[freehandClosingPointFeature.id],
				"delete",
				undefined,
			);
		});
	});
});
