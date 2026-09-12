import { MockCursorEvent } from "../../test/mock-cursor-event";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { MockModeConfig } from "../../test/mock-mode-config";
import { TerraDrawPolyLineMode } from "./polyline.mode";
import { COMMON_PROPERTIES } from "../../common";
import { MockLineString } from "../../test/mock-features";
import { GeoJSONStoreFeatures } from "../../terra-draw";

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

		it("constructs with coordinate point options", () => {
			new TerraDrawPolyLineMode({
				showCoordinatePoints: true,
				styles: {
					coordinatePointColor: "#ffffff",
					coordinatePointWidth: 6,
					coordinatePointOpacity: 0.8,
					coordinatePointOutlineColor: "#000000",
					coordinatePointOutlineWidth: 2,
					coordinatePointOutlineOpacity: 0.5,
				},
			});
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

		it("ignores non-object cursors", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			polyLineMode.updateOptions({
				cursors: "pointer" as unknown as { start?: "pointer" },
			});

			const mockConfig = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(mockConfig);
			polyLineMode.start();

			expect(mockConfig.setCursor).toHaveBeenCalledWith("crosshair");
		});

		it("can enable and disable coordinate points for existing features", () => {
			const polyLineMode = new TerraDrawPolyLineMode();
			const config = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(config);
			polyLineMode.start();

			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

			polyLineMode.updateOptions({ showCoordinatePoints: true });
			expect(
				config.store.copyAllWhere(
					(properties) =>
						properties[COMMON_PROPERTIES.COORDINATE_POINT] as boolean,
				),
			).toHaveLength(2);

			polyLineMode.updateOptions({ showCoordinatePoints: false });
			expect(
				config.store.copyAllWhere(
					(properties) =>
						properties[COMMON_PROPERTIES.COORDINATE_POINT] as boolean,
				),
			).toHaveLength(0);
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

		it("updates coordinate points while drawing", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				showCoordinatePoints: true,
			});
			const config = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(config);
			polyLineMode.start();

			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 1 }));

			const coordinates = config.store
				.copyAllWhere(
					(properties) =>
						properties[COMMON_PROPERTIES.COORDINATE_POINT] as boolean,
				)
				.map((feature) => feature.geometry.coordinates);
			expect(coordinates).toStrictEqual([
				[0, 0],
				[2, 1],
			]);
		});
	});

	describe("onClick", () => {
		it("keeps coordinate points when converting to a Polygon", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				showCoordinatePoints: true,
			});
			const config = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(config);
			polyLineMode.start();

			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const parent = config.store.copyAllWhere(
				(properties) =>
					properties.mode === polyLineMode.mode &&
					!properties[COMMON_PROPERTIES.COORDINATE_POINT] &&
					!properties[COMMON_PROPERTIES.CLOSING_POINT],
			)[0];
			const coordinatePoints = config.store.copyAllWhere(
				(properties) =>
					properties[COMMON_PROPERTIES.COORDINATE_POINT] as boolean,
			);

			expect(parent.geometry.type).toBe("Polygon");
			expect(coordinatePoints).toHaveLength(3);
			expect(
				coordinatePoints.every(
					(point) =>
						point.properties[COMMON_PROPERTIES.COORDINATE_POINT_FEATURE_ID] ===
						parent.id,
				),
			).toBe(true);
		});

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
			const polyLineMode = new TerraDrawPolyLineMode({
				showCoordinatePoints: true,
			});
			const config = MockModeConfig(polyLineMode.mode);

			polyLineMode.register(config);
			polyLineMode.start();

			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 1, lat: 0 }));
			polyLineMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 0 }));
			polyLineMode.onClick(MockCursorEvent({ lng: 2, lat: 0 }));

			polyLineMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

			const features = config.store
				.copyAllWhere((properties) => properties.mode === polyLineMode.mode)
				.filter((feature) => feature.geometry.type === "LineString");
			const coordinatePoints = config.store.copyAllWhere(
				(properties) =>
					properties[COMMON_PROPERTIES.COORDINATE_POINT] as boolean,
			);

			expect(features).toHaveLength(1);
			expect(features[0].geometry.type).toBe("LineString");
			expect(features[0].geometry.coordinates).toEqual([
				[0, 0],
				[1, 0],
				[2, 0],
			]);
			expect(coordinatePoints).toHaveLength(3);
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

		it("removes coordinate points for the in-progress feature", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				showCoordinatePoints: true,
			});
			const config = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(config);
			polyLineMode.start();
			polyLineMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polyLineMode.cleanUp();

			expect(config.store.copyAll()).toHaveLength(0);
		});
	});

	describe("styleFeature", () => {
		it("styles coordinate points", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				styles: {
					coordinatePointColor: "#ffffff",
					coordinatePointWidth: 6,
					coordinatePointOpacity: 0.8,
					coordinatePointOutlineColor: "#111111",
					coordinatePointOutlineWidth: 2,
					coordinatePointOutlineOpacity: 0.5,
				},
			});
			const feature = {
				id: "test",
				type: "Feature",
				geometry: { type: "Point", coordinates: [0, 0] },
				properties: {
					mode: "polyline",
					[COMMON_PROPERTIES.COORDINATE_POINT]: true,
				},
			} as GeoJSONStoreFeatures;

			expect(polyLineMode.styleFeature(feature)).toMatchObject({
				pointColor: "#ffffff",
				pointWidth: 6,
				pointOpacity: 0.8,
				pointOutlineColor: "#111111",
				pointOutlineWidth: 2,
				pointOutlineOpacity: 0.5,
				zIndex: 20,
			});
		});

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
			} as GeoJSONStoreFeatures;

			const styles = polyLineMode.styleFeature(feature);
			expect(styles.pointOutlineColor).toBe("#ffffff");
		});

		it("styles the line with static styling values", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				styles: {
					lineStringColor: "#ffffff",
					lineStringWidth: 2,
					lineStringDash: [5, 3],
				},
			});
			const feature = {
				id: "test",
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: [
						[0, 0],
						[1, 1],
					],
				},
				properties: { mode: "polyline" },
			} as GeoJSONStoreFeatures;

			expect(polyLineMode.styleFeature(feature)).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 2,
				lineStringDash: [5, 3],
			});
		});

		it("styles the line with dynamic styling values", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				styles: {
					lineStringColor: () => "#ffffff",
					lineStringWidth: () => 2,
					lineStringDash: () => [5, 3],
				},
			});
			const feature = {
				id: "test",
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: [
						[0, 0],
						[1, 1],
					],
				},
				properties: { mode: "polyline" },
			} as GeoJSONStoreFeatures;

			expect(polyLineMode.styleFeature(feature)).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 2,
				lineStringDash: [5, 3],
			});
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

		it("adds coordinate points when enabled", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				showCoordinatePoints: true,
			});
			const config = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(config);
			const [featureId] = config.store.create([
				{
					geometry: {
						type: "LineString",
						coordinates: [
							[0, 0],
							[1, 1],
						],
					},
					properties: { mode: polyLineMode.mode },
				},
			]);

			polyLineMode.afterFeatureAdded(config.store.copy(featureId));

			expect(
				config.store.copyAllWhere(
					(properties) =>
						properties[COMMON_PROPERTIES.COORDINATE_POINT] as boolean,
				),
			).toHaveLength(2);
		});
	});

	describe("afterFeatureUpdated", () => {
		it("updates coordinate points when enabled", () => {
			const polyLineMode = new TerraDrawPolyLineMode({
				showCoordinatePoints: true,
			});
			const config = MockModeConfig(polyLineMode.mode);
			polyLineMode.register(config);
			const [featureId] = config.store.create([
				{
					geometry: {
						type: "LineString",
						coordinates: [
							[0, 0],
							[1, 1],
						],
					},
					properties: { mode: polyLineMode.mode },
				},
			]);
			const feature = config.store.copy(featureId);
			polyLineMode.afterFeatureAdded(feature);

			polyLineMode.afterFeatureUpdated({
				...feature,
				geometry: {
					type: "LineString",
					coordinates: [
						[2, 2],
						[3, 3],
					],
				},
			});

			expect(
				config.store
					.copyAllWhere(
						(properties) =>
							properties[COMMON_PROPERTIES.COORDINATE_POINT] as boolean,
					)
					.map((point) => point.geometry.coordinates),
			).toStrictEqual([
				[2, 2],
				[3, 3],
			]);
		});

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
