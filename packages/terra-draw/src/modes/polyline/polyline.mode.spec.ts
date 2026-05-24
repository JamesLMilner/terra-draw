import { MockCursorEvent } from "../../test/mock-cursor-event";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { MockModeConfig } from "../../test/mock-mode-config";
import { TerraDrawPolyLineMode } from "./polyline.mode";
import { COMMON_PROPERTIES } from "../../common";
import { MockLineString } from "../../test/mock-features";

describe("TerraDrawPolyLineMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			expect(polyLineMode.mode).toBe("polyline");
			expect(polyLineMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				styles: { lineStringColor: "#ffffff" },
				snapping: { toCoordinate: true, toLine: true },
				keyEvents: { cancel: "Backspace", finish: "Enter" },
			});
			expect(polyLineMode.styles).toStrictEqual({ lineStringColor: "#ffffff" });
		});

		it("constructs with null key events", () => {
			new TerraDrawPolyLineMode({ keyEvents: null });
			new TerraDrawPolyLineMode({
				keyEvents: { cancel: null, finish: null },
			});
		});

		it("supports mode name override", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				modeName: "custom-polyline",
			});
			expect(polyLineMode.mode).toBe("custom-polyline");
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			expect(polyLineMode.state).toBe("unregistered");
			polyLineMode.register(MockModeConfig(polyLineMode.mode));
			expect(polyLineMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const polyLineMode = new TerraDrawPolyLineMode();

			expect(() => {
				polyLineMode.state = "started";
			}).toThrow();
		});

		it("stopping before registering throws error", () => {
			const polyLineMode = new TerraDrawPolyLineMode();

			expect(() => {
				polyLineMode.stop();
			}).toThrow();
		});

		it("starting before registering throws error", () => {
			const polyLineMode = new TerraDrawPolyLineMode();

			expect(() => {
				polyLineMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const polyLineMode = new TerraDrawPolyLineMode();

			expect(() => {
				polyLineMode.register(MockModeConfig(polyLineMode.mode));
				polyLineMode.register(MockModeConfig(polyLineMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			polyLineMode.register(MockModeConfig(polyLineMode.mode));
			polyLineMode.start();

			expect(polyLineMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			polyLineMode.register(MockModeConfig(polyLineMode.mode));
			polyLineMode.start();
			polyLineMode.stop();

			expect(polyLineMode.state).toBe("stopped");
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			polyLineMode.updateOptions({
				cursors: { start: "pointer", close: "pointer" },
			});

			const mockConfig = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(mockConfig);
			polyLineMode.start();

			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change key events", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			polyLineMode.updateOptions({
				keyEvents: { cancel: "C", finish: "F" },
			});

			const mockConfig = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(mockConfig);
			polyLineMode.start();
			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			polyLineMode.onKeyUp(MockKeyboardEvent({ key: "C" }));
			features = mockConfig.store.copyAll();
			expect(features.length).toBe(0);
		});

		it("can update styles", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			const mockConfig = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(mockConfig);
			polyLineMode.start();

			polyLineMode.updateOptions({
				styles: { lineStringColor: "#ffffff" },
			});

			expect(polyLineMode.styles).toStrictEqual({ lineStringColor: "#ffffff" });
			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
		});

		it("can set snapping", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			polyLineMode.updateOptions({
				snapping: {
					toCustom: (_event, context) =>
						context.currentCoordinate === 0 ? [10, 10] : [20, 20],
				},
			});

			const config = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(config);
			polyLineMode.start();

			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			polyLineMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

			const features = config.store.copyAllWhere(
				(properties) => properties.mode === polyLineMode.mode,
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.type).toBe("LineString");
			expect(features[0].geometry.coordinates).toEqual([
				[10, 10],
				[20, 20],
			]);
		});
	});

	describe("onMouseMove", () => {
		it("updates the live coordinate while drawing", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			const config = MockModeConfig(polyLineMode.mode);

			polyLineMode.register(config);
			polyLineMode.start();

			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 0 }));

			const features = config.store.copyAllWhere(
				(properties) => properties.mode === polyLineMode.mode,
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.type).toBe("LineString");
			expect(features[0].geometry.coordinates).toEqual([
				[0, 0],
				[2, 0],
			]);
		});
	});

	describe("onClick", () => {
		it("converts to a Polygon when closing on the starting point", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			const config = MockModeConfig(polyLineMode.mode);

			polyLineMode.register(config);
			polyLineMode.start();

			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			// Move onto the start point and click to close.
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const features = config.store.copyAllWhere(
				(properties) => properties.mode === polyLineMode.mode,
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.type).toBe("Polygon");
			expect(features[0].geometry.coordinates).toEqual([
				[
					[0, 0],
					[1, 0],
					[1, 1],
					[0, 0],
				],
			]);
			expect(config.onFinish).toHaveBeenCalledTimes(1);
		});

		it("finishes as a LineString when closing on the final point", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			const config = MockModeConfig(polyLineMode.mode);

			polyLineMode.register(config);
			polyLineMode.start();

			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			// Move onto the final committed point and click to finish as a line.
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			const features = config.store.copyAllWhere(
				(properties) => properties.mode === polyLineMode.mode,
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.type).toBe("LineString");
			expect(features[0].geometry.coordinates).toEqual([
				[0, 0],
				[1, 0],
				[1, 1],
			]);
			expect(config.onFinish).toHaveBeenCalledTimes(1);
		});
	});

	describe("onKeyUp", () => {
		it("finishes as a LineString when finish key is used", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			const config = MockModeConfig(polyLineMode.mode);

			polyLineMode.register(config);
			polyLineMode.start();

			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 2, lat: 0 }));

			polyLineMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

			const features = config.store.copyAllWhere(
				(properties) => properties.mode === polyLineMode.mode,
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.type).toBe("LineString");
			expect(features[0].geometry.coordinates).toEqual([
				[0, 0],
				[1, 0],
				[2, 0],
			]);
			expect(config.onFinish).toHaveBeenCalledTimes(1);
		});
	});

	describe("cleanUp", () => {
		it("removes in-progress features", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			const config = MockModeConfig(polyLineMode.mode);

			polyLineMode.register(config);
			polyLineMode.start();
			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = config.store.copyAllWhere(
				(properties) => properties.mode === polyLineMode.mode,
			);
			expect(features).toHaveLength(1);

			polyLineMode.cleanUp();

			features = config.store.copyAllWhere(
				(properties) => properties.mode === polyLineMode.mode,
			);
			expect(features).toHaveLength(0);
		});
	});

	describe("styleFeature", () => {
		it("styles a closing point with a white default outline", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			const feature = {
				id: "test",
				type: "Feature",
				geometry: { type: "Point", coordinates: [0, 0] },
				properties: {
					mode: "polyline",
					[COMMON_PROPERTIES.CLOSING_POINT]: true,
				},
			} as any;

			const styles = polyLineMode.styleFeature(feature);
			expect(styles.pointOutlineColor).toBe("#ffffff");
		});
	});

	describe("afterFeatureAdded", () => {
		it("does not throw when called", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			polyLineMode.register(MockModeConfig(polyLineMode.mode));

			expect(() => {
				polyLineMode.afterFeatureAdded(MockLineString() as any);
			}).not.toThrow();
		});
	});

	describe("afterFeatureUpdated", () => {
		it("resets drawing state when the current drawing feature is externally updated", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			const config = MockModeConfig(polyLineMode.mode);

			polyLineMode.register(config);
			polyLineMode.start();
			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(polyLineMode.state).toBe("drawing");

			const currentFeature = config.store.copyAllWhere(
				(properties) => properties.mode === polyLineMode.mode,
			)[0];

			polyLineMode.afterFeatureUpdated(currentFeature as any);

			expect(polyLineMode.state).toBe("started");
		});

		it("clears snapped guidance point when a feature is externally updated", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				snapping: {
					toCustom: () => [10, 10],
				},
			});
			const config = MockModeConfig(polyLineMode.mode);

			polyLineMode.register(config);
			polyLineMode.start();
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));

			const snappingPointsBefore = config.store.copyAllWhere((properties) =>
				Boolean(properties[COMMON_PROPERTIES.SNAPPING_POINT] as boolean),
			);
			expect(snappingPointsBefore).toHaveLength(1);

			polyLineMode.afterFeatureUpdated(MockLineString() as any);

			const snappingPointsAfter = config.store.copyAllWhere((properties) =>
				Boolean(properties[COMMON_PROPERTIES.SNAPPING_POINT] as boolean),
			);
			expect(snappingPointsAfter).toHaveLength(0);
		});
	});

	describe("validateFeature", () => {
		it("returns invalid for unsupported geometry type", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			polyLineMode.register(MockModeConfig(polyLineMode.mode));

			const validation = polyLineMode.validateFeature({
				type: "Feature",
				geometry: { type: "Point", coordinates: [0, 0] },
				properties: { mode: "polyline" },
			});

			expect(validation.valid).toBe(false);
		});
	});
});
