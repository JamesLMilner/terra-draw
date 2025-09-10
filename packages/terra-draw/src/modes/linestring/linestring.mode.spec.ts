import {
	FeatureId,
	GeoJSONStore,
	GeoJSONStoreFeatures,
	JSONObject,
} from "../../store/store";
import { MockModeConfig } from "../../test/mock-mode-config";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { ValidateNotSelfIntersecting } from "../../validations/not-self-intersecting.validation";
import { TerraDrawLineStringMode } from "./linestring.mode";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { COMMON_PROPERTIES, TerraDrawGeoJSONStore } from "../../common";
import { DefaultPointerEvents } from "../base.mode";
import { MockLineString } from "../../test/mock-features";
import { LineString } from "geojson";

describe("TerraDrawLineStringMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			expect(lineStringMode.mode).toBe("linestring");
			expect(lineStringMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: { cancel: "Backspace", finish: "Enter" },
			});
			expect(lineStringMode.styles).toStrictEqual({
				lineStringColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawLineStringMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawLineStringMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			expect(lineStringMode.state).toBe("unregistered");
			lineStringMode.register(MockModeConfig(lineStringMode.mode));
			expect(lineStringMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.register(MockModeConfig(lineStringMode.mode));
				lineStringMode.register(MockModeConfig(lineStringMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			lineStringMode.register(MockModeConfig(lineStringMode.mode));
			lineStringMode.start();

			expect(lineStringMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			lineStringMode.register(MockModeConfig(lineStringMode.mode));
			lineStringMode.start();
			lineStringMode.stop();

			expect(lineStringMode.state).toBe("stopped");
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			lineStringMode.updateOptions({
				cursors: {
					start: "pointer",
					close: "pointer",
				},
			});
			const mockConfig = MockModeConfig(lineStringMode.mode);
			lineStringMode.register(mockConfig);
			lineStringMode.start();
			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change key events", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			lineStringMode.updateOptions({
				keyEvents: {
					cancel: "C",
					finish: "F",
				},
			});
			const mockConfig = MockModeConfig(lineStringMode.mode);
			lineStringMode.register(mockConfig);
			lineStringMode.start();

			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			lineStringMode.onKeyUp(MockKeyboardEvent({ key: "C" }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(0);
		});

		it("can update styles", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			const mockConfig = MockModeConfig(lineStringMode.mode);

			lineStringMode.register(mockConfig);
			lineStringMode.start();

			lineStringMode.updateOptions({
				styles: {
					lineStringColor: "#ffffff",
				},
			});
			expect(lineStringMode.styles).toStrictEqual({
				lineStringColor: "#ffffff",
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
		});
	});

	describe("onMouseMove", () => {
		let lineStringMode: TerraDrawLineStringMode;
		let onChange: jest.Mock;
		let store: TerraDrawGeoJSONStore;

		beforeEach(() => {
			lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = MockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			store = mockConfig.store;

			lineStringMode.register(mockConfig);
			lineStringMode.start();
		});

		it("does nothing if no clicks have occurred ", () => {
			lineStringMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).not.toHaveBeenCalled();
		});

		it("updates the coordinate to the mouse position if a coordinate has been created", () => {
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			expect(onChange).toHaveBeenCalledTimes(2);

			const features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
			]);
		});
	});

	describe("onClick", () => {
		let lineStringMode: TerraDrawLineStringMode;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let store: TerraDrawGeoJSONStore;

		beforeEach(() => {
			lineStringMode = new TerraDrawLineStringMode({ editable: true });
			const mockConfig = MockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			store = mockConfig.store;

			lineStringMode.register(mockConfig);
			lineStringMode.start();
		});

		it("creates two identical coordinates on click", () => {
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).toHaveBeenCalledTimes(1);

			const features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[0, 0],
			]);
		});

		it("creates two additional identical coordinates on second click", () => {
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			expect(onChange).toHaveBeenCalledTimes(4);

			const features = store.copyAll();

			// Drawn LineString and Closing point
			expect(features.length).toBe(2);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[1, 1],
			]);
		});

		it("finishes the line on the the third click", () => {
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			let features = store.copyAll();

			// Drawn LineString and Closing point
			expect(features.length).toBe(2);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[1, 1],
			]);

			expect(features[1].geometry.coordinates).toStrictEqual([1, 1]);
			expect(features[1].properties[COMMON_PROPERTIES.CLOSING_POINT]).toBe(
				true,
			);

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			expect(onChange).not.toHaveBeenCalledWith([expect.any(String)], "delete");

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			expect(onChange).toHaveBeenCalledTimes(10);

			expect(onChange).toHaveBeenNthCalledWith(
				10,
				[expect.any(String)],
				"delete",
				undefined,
			);

			expect(onFinish).toHaveBeenCalledTimes(1);

			features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[2, 2],
			]);
		});

		it("finishes the line on the the third click with snapping toCoordinate enabled", () => {
			lineStringMode = new TerraDrawLineStringMode({
				snapping: { toCoordinate: true },
			});
			const mockConfig = MockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			store = mockConfig.store;

			lineStringMode.register(mockConfig);
			lineStringMode.start();

			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			let features = store.copyAll();

			// Drawn LineString and Closing point
			expect(features.length).toBe(2);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[1, 1],
			]);

			expect(features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING]).toBe(
				true,
			);

			expect(features[1].geometry.coordinates).toStrictEqual([1, 1]);

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			expect(onChange).not.toHaveBeenCalledWith([expect.any(String)], "delete");

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			expect(onChange).toHaveBeenCalledTimes(10);

			expect(onChange).toHaveBeenNthCalledWith(
				10,
				[expect.any(String)],
				"delete",
				undefined,
			);

			expect(onFinish).toHaveBeenCalledTimes(1);

			features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING]).toBe(
				undefined,
			);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[2, 2],
			]);
		});

		it("can snap from existing line once finished with snapping toCoordinate enabled", () => {
			lineStringMode = new TerraDrawLineStringMode({
				snapping: { toCoordinate: true },
			});
			const mockConfig = MockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			store = mockConfig.store;

			lineStringMode.register(mockConfig);
			lineStringMode.start();

			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			expect(onFinish).toHaveBeenCalledTimes(1);

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2.1, lat: 2.1 }));

			const features = store.copyAll();
			expect(features.length).toBe(2);

			expect(features[1].geometry.type).toBe("Point");
			expect(features[1].properties.snappingPoint).toBe(true);
			expect(features[1].geometry.coordinates).toStrictEqual([2, 2]);
		});

		it("can snap from existing line once finished with snapping toLine enabled", () => {
			lineStringMode = new TerraDrawLineStringMode({
				snapping: { toLine: true },
			});
			const mockConfig = MockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			store = mockConfig.store;

			lineStringMode.register(mockConfig);
			lineStringMode.start();

			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			expect(onFinish).toHaveBeenCalledTimes(1);

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2.1, lat: 2.1 }));

			const features = store.copyAll();
			expect(features.length).toBe(2);

			expect(features[1].geometry.type).toBe("Point");
			expect(features[1].properties.snappingPoint).toBe(true);
			expect(features[1].geometry.coordinates).toStrictEqual([2, 2]);
		});

		it("can snap from existing line once finished with snapping toCustom enabled", () => {
			const coordinates = [
				[5, 5],
				[5, 5],
				[5, 10],
				[5, 10],
				[10, 10],
			];

			lineStringMode = new TerraDrawLineStringMode({
				snapping: {
					toCustom: () => {
						return coordinates.shift();
					},
				},
			});

			const mockConfig = MockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			store = mockConfig.store;

			lineStringMode.register(mockConfig);
			lineStringMode.start();

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));
			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			expect(onFinish).toHaveBeenCalledTimes(1);
			const features = store.copyAll();

			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[5, 5],
				[5, 10],
				[10, 10],
			]);
		});

		it("right click can delete a point if editable is true", () => {
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			let features = store.copyAll();

			// Drawn LineString and Closing point
			expect(features.length).toBe(2);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[1, 1],
			]);

			expect(features[1].geometry.coordinates).toStrictEqual([1, 1]);

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			expect(onChange).not.toHaveBeenCalledWith([expect.any(String)], "delete");

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			expect(onChange).toHaveBeenCalledTimes(10);

			expect(onChange).toHaveBeenNthCalledWith(
				10,
				[expect.any(String)],
				"delete",
				undefined,
			);

			expect(onFinish).toHaveBeenCalledTimes(1);

			features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[2, 2],
			]);

			expect(onChange).toHaveBeenCalledTimes(10);

			// Delete a coordinate
			lineStringMode.onClick(
				MockCursorEvent({ lng: 1, lat: 1, button: "right" }),
			);

			expect(onChange).toHaveBeenCalledTimes(11);
			expect(onChange).toHaveBeenNthCalledWith(
				11,
				[expect.any(String)],
				"update",
				undefined,
			);

			const featuresAfter = store.copyAll();
			expect(featuresAfter.length).toBe(1);
			expect(featuresAfter[0].geometry.coordinates).not.toEqual(
				features[0].geometry.coordinates,
			);
		});

		describe("with leftClick pointer event set to false", () => {
			beforeEach(() => {
				lineStringMode = new TerraDrawLineStringMode({
					pointerEvents: {
						...DefaultPointerEvents,
						leftClick: false,
					},
				});
				const mockConfig = MockModeConfig(lineStringMode.mode);

				store = mockConfig.store;
				lineStringMode.register(mockConfig);
				lineStringMode.start();
			});

			it("should not allow click", () => {
				lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				let features = store.copyAll();
				expect(features.length).toBe(0);
			});
		});

		describe("validations", () => {
			it("does create a line if it has intersections and no validation provided", () => {
				lineStringMode = new TerraDrawLineStringMode();

				const mockConfig = MockModeConfig(lineStringMode.mode);
				onChange = mockConfig.onChange;
				store = mockConfig.store;

				lineStringMode.register(mockConfig);
				lineStringMode.start();

				lineStringMode.onClick(
					MockCursorEvent({
						lng: 6.50390625,
						lat: 32.99023555965106,
					}),
				);

				lineStringMode.onMouseMove(
					MockCursorEvent({
						lng: -9.931640625,
						lat: 5.090944175033399,
					}),
				);

				lineStringMode.onClick(
					MockCursorEvent({
						lng: -9.931640625,
						lat: 5.090944175033399,
					}),
				);

				lineStringMode.onMouseMove(
					MockCursorEvent({
						lng: 19.86328125,
						lat: 2.0210651187669897,
					}),
				);

				lineStringMode.onClick(
					MockCursorEvent({
						lng: 19.86328125,
						lat: 2.0210651187669897,
					}),
				);

				// This point is causing self intersection
				lineStringMode.onMouseMove(
					MockCursorEvent({
						lng: -8.173828125,
						lat: 24.367113562651262,
					}),
				);

				expect(onChange).toHaveBeenCalledTimes(7);

				lineStringMode.onClick(
					MockCursorEvent({
						lng: -8.173828125,
						lat: 24.367113562651262,
					}),
				);

				// Update geometry IS called because
				// we are not validating for self intersections
				expect(onChange).toHaveBeenCalledTimes(8);
			});

			it("does not create a line if it has intersections and validate returns false", () => {
				lineStringMode = new TerraDrawLineStringMode({
					validation: (feature, { updateType }) => {
						if (updateType === "finish" || updateType === "commit") {
							return ValidateNotSelfIntersecting(feature);
						}
						return { valid: true };
					},
				});

				const mockConfig = MockModeConfig(lineStringMode.mode);
				onChange = mockConfig.onChange;
				store = mockConfig.store;

				lineStringMode.register(mockConfig);
				lineStringMode.start();

				lineStringMode.onClick(
					MockCursorEvent({
						lng: 6.50390625,
						lat: 32.99023555965106,
					}),
				);

				lineStringMode.onMouseMove(
					MockCursorEvent({
						lng: -9.931640625,
						lat: 5.090944175033399,
					}),
				);

				lineStringMode.onClick(
					MockCursorEvent({
						lng: -9.931640625,
						lat: 5.090944175033399,
					}),
				);

				lineStringMode.onMouseMove(
					MockCursorEvent({
						lng: 19.86328125,
						lat: 2.0210651187669897,
					}),
				);

				lineStringMode.onClick(
					MockCursorEvent({
						lng: 19.86328125,
						lat: 2.0210651187669897,
					}),
				);

				// This point is causing self intersection
				lineStringMode.onMouseMove(
					MockCursorEvent({
						lng: -8.173828125,
						lat: 24.367113562651262,
					}),
				);

				expect(onChange).toHaveBeenCalledTimes(7);

				lineStringMode.onClick(
					MockCursorEvent({
						lng: -8.173828125,
						lat: 24.367113562651262,
					}),
				);

				// Update geometry is NOT called because
				// there is a self intersection
				expect(onChange).toHaveBeenCalledTimes(7);
			});

			it("does create a line if no intersections and validate returns true", () => {
				lineStringMode = new TerraDrawLineStringMode({
					validation: (feature, { updateType }) => {
						if (updateType === "finish" || updateType === "commit") {
							return ValidateNotSelfIntersecting(feature);
						}
						return { valid: true };
					},
				});

				const mockConfig = MockModeConfig(lineStringMode.mode);
				onChange = mockConfig.onChange;
				store = mockConfig.store;

				lineStringMode.register(mockConfig);
				lineStringMode.start();

				lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				let features = store.copyAll();

				// Drawn LineString and Closing point
				expect(features.length).toBe(2);

				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[1, 1],
				]);

				expect(features[1].geometry.coordinates).toStrictEqual([1, 1]);

				lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

				lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

				expect(onChange).not.toHaveBeenCalledWith(
					[expect.any(String)],
					"delete",
					undefined,
				);

				lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

				expect(onChange).toHaveBeenCalledTimes(10);

				expect(onChange).toHaveBeenNthCalledWith(
					10,
					[expect.any(String)],
					"delete",
					undefined,
				);

				features = store.copyAll();
				expect(features.length).toBe(1);

				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[2, 2],
				]);
			});
		});
	});

	describe("onKeyUp", () => {
		let lineStringMode: TerraDrawLineStringMode;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let store: TerraDrawGeoJSONStore;

		beforeEach(() => {
			lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = MockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			store = mockConfig.store;
			lineStringMode.register(mockConfig);
			lineStringMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no line is present", () => {
				lineStringMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));
			});

			it("deletes the line when currently editing", () => {
				lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);

				lineStringMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				features = store.copyAll();
				expect(features.length).toBe(0);
			});
		});

		describe("finish", () => {
			it("finishes the line on finish key press", () => {
				lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				let features = store.copyAll();

				// Drawn LineString and Closing point
				expect(features.length).toBe(2);
				expect(
					features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBe(true);

				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[1, 1],
				]);

				expect(features[1].geometry.coordinates).toStrictEqual([1, 1]);

				lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

				lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

				expect(onChange).not.toHaveBeenCalledWith(
					[expect.any(String)],
					"delete",
					undefined,
				);

				lineStringMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

				expect(onChange).toHaveBeenCalledTimes(9);

				expect(onChange).toHaveBeenNthCalledWith(
					9,
					[expect.any(String)],
					"delete",
					undefined,
				);

				features = store.copyAll();
				expect(features.length).toBe(1);
				expect(
					features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBe(undefined);

				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[2, 2],
				]);

				expect(onFinish).toHaveBeenCalledTimes(1);
				expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
					action: "draw",
					mode: "linestring",
				});
			});

			it("does not finish linestring when finish is set to null", () => {
				lineStringMode = new TerraDrawLineStringMode({ keyEvents: null });
				const mockConfig = MockModeConfig(lineStringMode.mode);
				onChange = mockConfig.onChange;
				store = mockConfig.store;

				lineStringMode.register(mockConfig);
				lineStringMode.start();

				lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				let features = store.copyAll();

				// Drawn LineString and Closing point
				expect(features.length).toBe(2);

				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[1, 1],
				]);

				expect(features[1].geometry.coordinates).toStrictEqual([1, 1]);

				lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

				lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

				expect(onChange).not.toHaveBeenCalledWith(
					[expect.any(String)],
					"delete",
					undefined,
				);

				lineStringMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				expect(onChange).toHaveBeenCalledTimes(6);

				features = store.copyAll();
				expect(features.length).toBe(2);

				expect(features[1].geometry.type).toStrictEqual("Point");
				expect(features[1].geometry.coordinates).toStrictEqual([2, 2]);
				expect(features[0].geometry.type).toStrictEqual("LineString");
				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[2, 2],
					[2, 2],
				]);
			});
		});
	});

	describe("cleanUp", () => {
		let lineStringMode: TerraDrawLineStringMode;
		let store: TerraDrawGeoJSONStore;

		beforeEach(() => {
			lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = MockModeConfig(lineStringMode.mode);
			store = mockConfig.store;
			lineStringMode.register(mockConfig);
			lineStringMode.start();
		});

		it("does not throw error if feature has not been created ", () => {
			expect(() => {
				lineStringMode.cleanUp();
			}).not.toThrow();
		});

		it("cleans up correctly if drawing has started and there is no closing point", () => {
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(store.copyAll().length).toBe(1);

			lineStringMode.cleanUp();

			// Removes the LineString that was being created
			expect(store.copyAll().length).toBe(0);
		});

		it("cleans up correctly if drawing has started and there is a closing point", () => {
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			expect(store.copyAll().length).toBe(2);

			lineStringMode.cleanUp();

			// Removes the LineString that was being created
			expect(store.copyAll().length).toBe(0);
		});
	});

	describe("onDragStart", () => {
		it("does nothing if editable is not enabled", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = MockModeConfig(lineStringMode.mode);
			lineStringMode.register(mockConfig);
			lineStringMode.start();

			lineStringMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), () => {});
			expect(mockConfig.onChange).not.toHaveBeenCalled();
		});

		it("creates the drag point when editable is true and a coordinate is selected", () => {
			const lineStringMode = new TerraDrawLineStringMode({ editable: true });
			const mockConfig = MockModeConfig(lineStringMode.mode);
			lineStringMode.register(mockConfig);
			lineStringMode.start();

			// Create a linestring to edit
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			mockConfig.onFinish.mockClear();

			// Ensure it's there
			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			// Reset to make it easier to track for onDragStart
			mockConfig.onChange.mockClear();
			mockConfig.setCursor.mockClear();

			lineStringMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), () => {});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"create",
				undefined,
			);
			expect(mockConfig.setCursor).toHaveBeenCalledTimes(1);
			expect(mockConfig.setCursor).toHaveBeenNthCalledWith(1, "grabbing");

			// We don't call onFinish in onDragStart but in onDragEnd
			expect(mockConfig.onFinish).toHaveBeenCalledTimes(0);
		});
	});

	describe("onDrag", () => {
		it("does nothing if editable is not enabled", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = MockModeConfig(lineStringMode.mode);
			lineStringMode.register(mockConfig);

			lineStringMode.onDrag(MockCursorEvent({ lng: 0, lat: 0 }), () => {});
			expect(mockConfig.onChange).not.toHaveBeenCalled();
		});

		it("moves the drag point correctly", () => {
			const lineStringMode = new TerraDrawLineStringMode({ editable: true });
			const mockConfig = MockModeConfig(lineStringMode.mode);
			lineStringMode.register(mockConfig);
			lineStringMode.start();

			// Create a linestring to edit
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			mockConfig.onFinish.mockClear();

			// Ensure it's there
			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			lineStringMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), () => {});

			// Reset to make it easier to track for onDragStart
			mockConfig.onChange.mockClear();
			mockConfig.setCursor.mockClear();

			lineStringMode.onDrag(MockCursorEvent({ lng: 1, lat: 1 }), () => {});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(3);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"update",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"update",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				3,
				[expect.any(String)],
				"update",
				undefined,
			);

			const allFeatures = mockConfig.store.copyAll();

			expect(allFeatures.length).toBe(2);

			// Edited linestring
			expect(allFeatures[0].geometry.type).toBe("LineString");
			expect(allFeatures[0].properties.edited).toBe(true);

			// Edit point
			expect(allFeatures[1].geometry.type).toBe("Point");
			expect(allFeatures[1].properties.edited).toBe(true);
			expect(allFeatures[1].geometry.coordinates).toEqual([1, 1]);

			// We don't change the cursor in onDrag
			expect(mockConfig.setCursor).toHaveBeenCalledTimes(0);

			// We don't call onFinish in onDrag but in onDragEnd
			expect(mockConfig.onFinish).toHaveBeenCalledTimes(0);
		});
	});

	describe("onDragEnd", () => {
		it("does nothing if editable is not enabled", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = MockModeConfig(lineStringMode.mode);
			lineStringMode.register(mockConfig);

			lineStringMode.onDragEnd(MockCursorEvent({ lng: 0, lat: 0 }), () => {});
			expect(mockConfig.onChange).not.toHaveBeenCalled();
		});

		it("removes the drag point after it's finished", () => {
			const lineStringMode = new TerraDrawLineStringMode({ editable: true });
			const mockConfig = MockModeConfig(lineStringMode.mode);
			lineStringMode.register(mockConfig);
			lineStringMode.start();

			// Create a linestring to edit
			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			mockConfig.onFinish.mockClear();

			// Ensure it's there
			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			lineStringMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), () => {});

			lineStringMode.onDrag(MockCursorEvent({ lng: 1, lat: 1 }), () => {});

			// Reset to make it easier to track for onDragStart
			mockConfig.onChange.mockClear();
			mockConfig.setCursor.mockClear();

			lineStringMode.onDragEnd(MockCursorEvent({ lng: 1, lat: 1 }), () => {});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(2);

			// Remove the edit drag point
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"delete",
				undefined,
			);

			// Remove the edited property from the linestring
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"update",
				undefined,
			);

			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);
		});
	});

	describe("styling", () => {
		it("gets", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			lineStringMode.register(MockModeConfig(lineStringMode.mode));
			expect(lineStringMode.styles).toStrictEqual({});
		});

		it("set fails if non valid styling", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			lineStringMode.register(MockModeConfig(lineStringMode.mode));

			expect(() => {
				(lineStringMode.styles as unknown) = "test";
			}).toThrow();

			expect(lineStringMode.styles).toStrictEqual({});
		});

		it("sets", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			lineStringMode.register(MockModeConfig(lineStringMode.mode));

			lineStringMode.styles = {
				lineStringColor: "#ffffff",
			};

			expect(lineStringMode.styles).toStrictEqual({
				lineStringColor: "#ffffff",
			});
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for closing point", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
					lineStringWidth: 4,
					closingPointColor: "#111111",
					closingPointWidth: 3,
					closingPointOutlineColor: "#222222",
					closingPointOutlineWidth: 2,
					zIndex: 42,
				},
			});

			expect(
				lineStringMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "linestring", closingPoint: true },
				}),
			).toMatchObject({
				pointColor: "#111111",
				pointWidth: 3,
				pointOutlineColor: "#222222",
				pointOutlineWidth: 2,
				zIndex: 42,
			});
		});

		it("returns the correct styles for snapping point", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
					lineStringWidth: 4,
					snappingPointColor: "#111111",
					snappingPointWidth: 3,
					snappingPointOutlineColor: "#222222",
					snappingPointOutlineWidth: 2,
					zIndex: 42,
				},
			});

			expect(
				lineStringMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "linestring", snappingPoint: true },
				}),
			).toMatchObject({
				pointColor: "#111111",
				pointWidth: 3,
				pointOutlineColor: "#222222",
				pointOutlineWidth: 2,
				zIndex: 42,
			});
		});

		it("returns the correct styles for point using functions", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: () => "#ffffff",
					lineStringWidth: () => 4,
					closingPointColor: () => "#111111",
					closingPointWidth: () => 3,
					closingPointOutlineColor: () => "#222222",
					closingPointOutlineWidth: () => 2,
					zIndex: () => 42,
				},
			});

			expect(
				lineStringMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "linestring", closingPoint: true },
				}),
			).toMatchObject({
				pointColor: "#111111",
				pointWidth: 3,
				pointOutlineColor: "#222222",
				pointOutlineWidth: 2,
				zIndex: 42,
			});
		});

		it("returns the correct styles for linestring", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
					lineStringWidth: 4,
					closingPointColor: "#111111",
					closingPointWidth: 3,
					closingPointOutlineColor: "#222222",
					closingPointOutlineWidth: 2,
					zIndex: 42,
				},
			});

			expect(
				lineStringMode.styleFeature({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties: { mode: "linestring" },
				}),
			).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 4,
				zIndex: 42,
			});
		});

		it("returns the correct styles for linestring using functions", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: () => "#ffffff",
					lineStringWidth: () => 4,
					closingPointColor: () => "#111111",
					closingPointWidth: () => 3,
					closingPointOutlineColor: () => "#222222",
					closingPointOutlineWidth: () => 2,
					zIndex: () => 42,
				},
			});

			expect(
				lineStringMode.styleFeature({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties: { mode: "linestring" },
				}),
			).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 4,
				zIndex: 42,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid linestring feature", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
				},
			});
			lineStringMode.register(MockModeConfig("linestring"));

			expect(
				lineStringMode.validateFeature({
					id: "ed030248-d7ee-45a2-b8e8-37ad2f622509",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [],
					},
					properties: {
						mode: "linestring",
						createdAt: 1685654949450,
						updatedAt: 1685654950609,
					},
				}),
			).toEqual({
				reason: "Feature has less than 2 coordinates",
				valid: false,
			});
		});

		it("returns true for valid linestring feature", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
				},
			});
			lineStringMode.register(MockModeConfig("linestring"));

			expect(
				lineStringMode.validateFeature({
					id: "ed030248-d7ee-45a2-b8e8-37ad2f622509",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[-2.329101563, 51.392350875],
							[-0.439453125, 52.52290594],
						],
					},
					properties: {
						mode: "linestring",
						createdAt: 1685654949450,
						updatedAt: 1685654950609,
					},
				}),
			).toEqual({
				valid: true,
			});
		});

		it("returns false for valid linestring feature with validate function that returns false", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				validation: () => {
					return { valid: false };
				},
				styles: {
					lineStringColor: "#ffffff",
				},
			});
			lineStringMode.register(MockModeConfig("linestring"));

			expect(
				lineStringMode.validateFeature({
					id: "ed030248-d7ee-45a2-b8e8-37ad2f622509",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[-2.329101563, 51.392350875],
							[-0.439453125, 52.52290594],
						],
					},
					properties: {
						mode: "linestring",
						createdAt: 1685654949450,
						updatedAt: 1685654950609,
					},
				}),
			).toEqual({
				valid: false,
			});
		});
	});

	describe("afterFeatureUpdated", () => {
		it("does nothing if the updated feature is not currently being drawn", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			const mockConfig = MockModeConfig(lineStringMode.mode);

			lineStringMode.register(mockConfig);
			lineStringMode.start();

			// Create an initial square to snap to
			const mockLineString = MockLineString();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockLineString.geometry,
					properties: mockLineString.properties as JSONObject,
				},
			]);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();

			expect(mockConfig.store.has(featureId)).toBe(true);

			lineStringMode.afterFeatureUpdated({
				...(mockLineString as GeoJSONStoreFeatures),
				id: featureId,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("ends the current drawing session if the updated feature is the current drawn linestring", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			const mockConfig = MockModeConfig(lineStringMode.mode);

			lineStringMode.register(mockConfig);
			lineStringMode.start();

			lineStringMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			lineStringMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			lineStringMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			const features = mockConfig.store.copyAll();

			// Drawn LineString and Closing point
			expect(features.length).toBe(2);

			const lineString = features[0];
			const closingPoint = features[1];

			expect(lineString.geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[1, 1],
			]);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();

			lineStringMode.afterFeatureUpdated({
				...lineString,
				geometry: {
					type: "LineString",
					coordinates: [
						[0, 0],
						[1, 1],
						[2, 2],
					],
				},
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[closingPoint.id],
				"delete",
				undefined,
			);
		});

		it("updates the snapping point if the user is current editing and the edited linestring is snappable", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				snapping: {
					toCoordinate: true,
				},
			});

			const mockConfig = MockModeConfig(lineStringMode.mode);

			lineStringMode.register(mockConfig);
			lineStringMode.start();

			// Create an initial square to snap to
			const mockLineString = MockLineString();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockLineString.geometry,
					properties: mockLineString.properties as JSONObject,
				},
			]);

			// This creates the snapping point
			lineStringMode.onMouseMove(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

			mockConfig.onChange.mockClear();

			// This is the snapping point
			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			const snapPoint = features[1];
			expect(snapPoint.geometry.coordinates).toStrictEqual([0, 0]);

			lineStringMode.afterFeatureUpdated(
				mockLineString as GeoJSONStoreFeatures,
			);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[snapPoint!.id],
				"update",
				undefined,
			);

			expect(mockConfig.store.has(snapPoint!.id as FeatureId)).toBe(true);
		});

		it("deletes the snapping point if the user is current editing and the edited linestring is not snappable", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				snapping: {
					toCoordinate: true,
				},
			});

			const mockConfig = MockModeConfig(lineStringMode.mode);

			lineStringMode.register(mockConfig);
			lineStringMode.start();

			// Create an initial square to snap to
			const mockLineString = MockLineString();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockLineString.geometry,
					properties: mockLineString.properties as JSONObject,
				},
			]);

			// This creates the snapping point
			lineStringMode.onMouseMove(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

			mockConfig.onChange.mockClear();

			// This is the snapping point
			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			const snapPoint = features[1];
			expect(snapPoint.geometry.coordinates).toStrictEqual([0, 0]);

			// Points will be too far away to snap
			const updatedGeometry = {
				type: "LineString",
				coordinates: [
					[50, 50],
					[51, 51],
				],
			} as LineString;

			mockConfig.store.updateGeometry([
				{
					id: featureId,
					geometry: updatedGeometry,
				},
			]);

			mockConfig.onChange.mockClear();

			lineStringMode.afterFeatureUpdated({
				...(mockLineString as GeoJSONStoreFeatures),
				geometry: updatedGeometry,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[snapPoint!.id],
				"delete",
				undefined,
			);

			expect(mockConfig.store.has(snapPoint!.id as FeatureId)).toBe(false);
		});
	});
});
