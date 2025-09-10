import {
	COMMON_PROPERTIES,
	TerraDrawGeoJSONStore,
	Validation,
} from "../../common";
import {
	FeatureId,
	GeoJSONStore,
	GeoJSONStoreFeatures,
	JSONObject,
} from "../../store/store";
import { MockModeConfig } from "../../test/mock-mode-config";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { ValidateNotSelfIntersecting } from "../../validations/not-self-intersecting.validation";
import { TerraDrawPolygonMode } from "./polygon.mode";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { MockPolygonSquare } from "../../test/mock-features";
import { DefaultPointerEvents } from "../base.mode";

describe("TerraDrawPolygonMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const polygonMode = new TerraDrawPolygonMode();
			expect(polygonMode.mode).toBe("polygon");
		});

		it("constructs with options", () => {
			const polygonMode = new TerraDrawPolygonMode({
				styles: { closingPointColor: "#ffffff" },
				pointerDistance: 40,
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
				snapping: {
					toCoordinate: true,
					toLine: true,
				},
				editable: true,
			});
			expect(polygonMode.styles).toStrictEqual({
				closingPointColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawPolygonMode({
				styles: { closingPointColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawPolygonMode({
				styles: { closingPointColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const polygonMode = new TerraDrawPolygonMode();
			polygonMode.updateOptions({
				cursors: {
					start: "pointer",
					close: "pointer",
					dragStart: "pointer",
					dragEnd: "pointer",
				},
			});
			const mockConfig = MockModeConfig(polygonMode.mode);
			polygonMode.register(mockConfig);
			polygonMode.start();
			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change key events", () => {
			const polygonMode = new TerraDrawPolygonMode();
			polygonMode.updateOptions({
				keyEvents: {
					cancel: "C",
					finish: "F",
				},
			});
			const mockConfig = MockModeConfig(polygonMode.mode);
			polygonMode.register(mockConfig);
			polygonMode.start();

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			polygonMode.onKeyUp(MockKeyboardEvent({ key: "C" }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(0);
		});

		it("can set snapping", () => {
			const polygonMode = new TerraDrawPolygonMode();
			polygonMode.updateOptions({
				snapping: {
					toCoordinate: true,
				},
			});
			const mockConfig = MockModeConfig(polygonMode.mode);

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			polygonMode.register(mockConfig);
			polygonMode.start();

			// This creates the snapping point
			polygonMode.onMouseMove(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

			// This is the snapping point
			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);
			expect(features[1].geometry.coordinates).toStrictEqual([0, 0]);

			polygonMode.onClick(MockCursorEvent({ lng: -0.5, lat: 0.5 }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			expect(features[1].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[0, 0],
					[0, 0],
					[0, 0],
				],
			]);
		});

		it("can set editable", () => {
			const polygonMode = new TerraDrawPolygonMode();
			polygonMode.updateOptions({
				editable: true,
			});
			const mockConfig = MockModeConfig(polygonMode.mode);

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			polygonMode.register(mockConfig);
			polygonMode.start();

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].geometry.coordinates[0]).toStrictEqual([
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
				[0, 0],
			]);

			// Edit the coordinate to -1, -1 coordinate position from 0, 0 position
			polygonMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());
			polygonMode.onDrag(MockCursorEvent({ lng: -1, lat: -1 }), jest.fn());
			polygonMode.onDragEnd(MockCursorEvent({ lng: -1, lat: -1 }), jest.fn());

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].geometry.coordinates[0]).toStrictEqual([
				[-1, -1],
				[0, 1],
				[1, 1],
				[1, 0],
				[-1, -1],
			]);
		});

		it("can set editable which ignores non polygon mode features", () => {
			const polygonMode = new TerraDrawPolygonMode();
			polygonMode.updateOptions({
				editable: true,
			});
			const mockConfig = MockModeConfig(polygonMode.mode);

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: { mode: "square" },
				},
			]);

			polygonMode.register(mockConfig);
			polygonMode.start();

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].geometry.coordinates[0]).toStrictEqual([
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
				[0, 0],
			]);

			// Edit the coordinate to -1, -1 coordinate position from 0, 0 position
			polygonMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());
			polygonMode.onDrag(MockCursorEvent({ lng: -1, lat: -1 }), jest.fn());
			polygonMode.onDragEnd(MockCursorEvent({ lng: -1, lat: -1 }), jest.fn());

			// Geometry does not change
			features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].geometry.coordinates[0]).toStrictEqual([
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
				[0, 0],
			]);
		});

		it("can update styles", () => {
			const polygonMode = new TerraDrawPolygonMode();

			const mockConfig = MockModeConfig(polygonMode.mode);

			polygonMode.register(mockConfig);
			polygonMode.start();

			polygonMode.updateOptions({
				styles: {
					closingPointColor: "#ffffff",
				},
			});
			expect(polygonMode.styles).toStrictEqual({
				closingPointColor: "#ffffff",
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
		});

		it("can handle changes to showCoordinatePoints when there are no polygons in the mode", () => {
			const polygonMode = new TerraDrawPolygonMode({
				showCoordinatePoints: false,
			});

			const mockConfig = MockModeConfig(polygonMode.mode);

			polygonMode.register(mockConfig);
			polygonMode.start();

			polygonMode.updateOptions({
				showCoordinatePoints: true,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("can handle changes to showCoordinatePoints when there are polygons in the mode", () => {
			const polygonMode = new TerraDrawPolygonMode({
				showCoordinatePoints: false,
			});

			const mockConfig = MockModeConfig(polygonMode.mode);

			polygonMode.register(mockConfig);
			polygonMode.start();

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();

			polygonMode.updateOptions({
				showCoordinatePoints: true,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(2);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[
					expect.any(String),
					expect.any(String),
					expect.any(String),
					expect.any(String),
				],
				"create",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				2,
				[featureId],
				"update",
				undefined,
			);
		});
	});

	describe("afterFeatureAdded", () => {
		it("adds coordinate points when showCoordinatePoints is true", () => {
			const polygonMode = new TerraDrawPolygonMode({
				showCoordinatePoints: true,
			});

			const mockConfig = MockModeConfig(polygonMode.mode);

			polygonMode.register(mockConfig);
			polygonMode.start();

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();

			expect(mockConfig.store.has(featureId)).toBe(true);

			polygonMode.afterFeatureAdded({
				...(mockPolygon as GeoJSONStoreFeatures),
				id: featureId,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(2);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[
					expect.any(String),
					expect.any(String),
					expect.any(String),
					expect.any(String),
				],
				"create",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				2,
				[featureId],
				"update",
				undefined,
			);
		});

		it("does nothing if showCoordinatePoints is false", () => {
			const polygonMode = new TerraDrawPolygonMode({
				showCoordinatePoints: false,
			});

			const mockConfig = MockModeConfig(polygonMode.mode);

			polygonMode.register(mockConfig);
			polygonMode.start();

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();

			expect(mockConfig.store.has(featureId)).toBe(true);

			polygonMode.afterFeatureAdded({
				...(mockPolygon as GeoJSONStoreFeatures),
				id: featureId,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});
	});

	describe("afterFeatureUpdated", () => {
		it("adds coordinate points when showCoordinatePoints is true", () => {
			const polygonMode = new TerraDrawPolygonMode({
				showCoordinatePoints: true,
			});

			const mockConfig = MockModeConfig(polygonMode.mode);

			polygonMode.register(mockConfig);
			polygonMode.start();

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();

			expect(mockConfig.store.has(featureId)).toBe(true);

			polygonMode.afterFeatureUpdated({
				...(mockPolygon as GeoJSONStoreFeatures),
				id: featureId,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(2);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[
					expect.any(String),
					expect.any(String),
					expect.any(String),
					expect.any(String),
				],
				"create",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				2,
				[featureId],
				"update",
				undefined,
			);
		});

		it("does nothing if showCoordinatePoints is false", () => {
			const polygonMode = new TerraDrawPolygonMode({
				showCoordinatePoints: false,
			});

			const mockConfig = MockModeConfig(polygonMode.mode);

			polygonMode.register(mockConfig);
			polygonMode.start();

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();

			expect(mockConfig.store.has(featureId)).toBe(true);

			polygonMode.afterFeatureUpdated({
				...(mockPolygon as GeoJSONStoreFeatures),
				id: featureId,
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("removes edit points if a user is currently dragging the updated feature", () => {
			const polygonMode = new TerraDrawPolygonMode({ editable: true });
			const mockConfig = MockModeConfig(polygonMode.mode);
			polygonMode.register(mockConfig);
			polygonMode.start();

			// Create a polygon to edit
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			const mockPolygon = mockConfig.store.copyAll()[0];

			mockConfig.onChange.mockClear();

			polygonMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), () => {});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"create",
				undefined,
			);

			mockConfig.onChange.mockClear();

			const editPoint = mockConfig.store
				.copyAll()
				.find(
					(f) =>
						f.geometry.type === "Point" &&
						f.properties[COMMON_PROPERTIES.EDITED],
				);

			expect(editPoint).toBeDefined();

			polygonMode.afterFeatureUpdated(mockPolygon);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[editPoint!.id],
				"delete",
				undefined,
			);
		});

		it("updates the snapping point if the user is current editing and the edited polygon is snappable", () => {
			const polygonMode = new TerraDrawPolygonMode();
			polygonMode.updateOptions({
				snapping: {
					toCoordinate: true,
				},
			});
			const mockConfig = MockModeConfig(polygonMode.mode);

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			polygonMode.register(mockConfig);
			polygonMode.start();

			// This creates the snapping point
			polygonMode.onMouseMove(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

			mockConfig.onChange.mockClear();

			// This is the snapping point
			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			const snapPoint = features[1];
			expect(snapPoint.geometry.coordinates).toStrictEqual([0, 0]);

			polygonMode.afterFeatureUpdated(mockPolygon as GeoJSONStoreFeatures);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[snapPoint!.id],
				"update",
				undefined,
			);

			expect(mockConfig.store.has(snapPoint!.id as FeatureId)).toBe(true);
		});

		it("deletes the snapping point if the user is current editing and the edited polygon is not snappable", () => {
			const polygonMode = new TerraDrawPolygonMode();
			polygonMode.updateOptions({
				snapping: {
					toCoordinate: true,
				},
			});
			const mockConfig = MockModeConfig(polygonMode.mode);

			// Create an initial square to snap to
			const mockPolygon = MockPolygonSquare();
			const [id] = mockConfig.store.create([
				{
					geometry: mockPolygon.geometry,
					properties: mockPolygon.properties as JSONObject,
				},
			]);

			polygonMode.register(mockConfig);
			polygonMode.start();

			// This creates the snapping point
			polygonMode.onMouseMove(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

			mockConfig.onChange.mockClear();

			// This is the snapping point
			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			const snapPoint = features[1];
			expect(snapPoint.geometry.coordinates).toStrictEqual([0, 0]);

			mockConfig.store.updateGeometry([
				{
					id,
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-100, -100],
								[-100, -99],
								[-99, -99],
								[-99, -100],
								[-100, -100],
							],
						],
					},
				},
			]);

			mockConfig.onChange.mockClear();

			polygonMode.afterFeatureUpdated({
				...(mockPolygon as GeoJSONStoreFeatures),
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[-100, -100],
							[-100, -99],
							[-99, -99],
							[-99, -100],
							[-100, -100],
						],
					],
				},
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

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const polygonMode = new TerraDrawPolygonMode();
			expect(polygonMode.state).toBe("unregistered");
			polygonMode.register(MockModeConfig(polygonMode.mode));
			expect(polygonMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.register(MockModeConfig(polygonMode.mode));
				polygonMode.register(MockModeConfig(polygonMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const polygonMode = new TerraDrawPolygonMode();

			polygonMode.register(MockModeConfig(polygonMode.mode));
			polygonMode.start();

			expect(polygonMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const polygonMode = new TerraDrawPolygonMode();

			polygonMode.register(MockModeConfig(polygonMode.mode));
			polygonMode.start();
			polygonMode.stop();

			expect(polygonMode.state).toBe("stopped");
		});
	});

	describe("onMouseMove", () => {
		let polygonMode: TerraDrawPolygonMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			store = new GeoJSONStore();
			polygonMode = new TerraDrawPolygonMode();
			const mockConfig = MockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			onFinish = mockConfig.onFinish;
			onChange = mockConfig.onChange;
			polygonMode.register(mockConfig);
			polygonMode.start();
		});

		it("does nothing if no clicks have occurred ", () => {
			polygonMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).not.toHaveBeenCalled();
		});

		it("updates the coordinate to the mouse position after first click", () => {
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			const features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[1, 0.999999], // Small offset to keep Mapbox GL happy
					[0, 0],
				],
			]);
		});

		it("updates the coordinate to the mouse position after second click", () => {
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			const features = store.copyAll();
			expect(features.length).toBe(1);

			expect(onFinish).not.toHaveBeenCalled();

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[0, 0],
				],
			]);
		});

		it("updates the coordinate to the mouse position after third click", () => {
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			// Snapping branch
			polygonMode.onMouseMove(MockCursorEvent({ lng: 2.5, lat: 2.5 }));

			// 1 times for the polygon
			// 2 times for the closing points
			let features = store.copyAll();
			expect(features.length).toBe(3);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[0, 0],
					[0, 0],
				],
			]);

			// No snapping branch
			polygonMode.onMouseMove(MockCursorEvent({ lng: 4, lat: 4 }));

			expect(onFinish).not.toHaveBeenCalled();

			features = store.copyAll();

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[4, 4],
					[0, 0],
				],
			]);
		});
	});

	describe("onClick", () => {
		let polygonMode: TerraDrawPolygonMode;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let store: TerraDrawGeoJSONStore;

		const validation: Validation = (feature, { updateType }) => {
			if (updateType === "finish" || updateType === "commit") {
				return ValidateNotSelfIntersecting(feature);
			}
			return { valid: true };
		};

		beforeEach(() => {
			polygonMode = new TerraDrawPolygonMode({ editable: true });
			const mockConfig = MockModeConfig(polygonMode.mode);

			onFinish = mockConfig.onFinish;
			onChange = mockConfig.onChange;
			store = mockConfig.store;
			polygonMode.register(mockConfig);
			polygonMode.start();
		});

		it("can create a polygon", () => {
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING]).toBe(
				true,
			);

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			features = store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING]).toBe(
				undefined,
			);

			// Create a new polygon
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			features = store.copyAll();
			expect(features.length).toBe(2);
		});

		it("can create a polygon with toCoordinate snapping enabled", () => {
			polygonMode = new TerraDrawPolygonMode({
				snapping: {
					toCoordinate: true,
				},
			});
			const mockConfig = MockModeConfig(polygonMode.mode);
			store = mockConfig.store;
			polygonMode.register(mockConfig);
			polygonMode.start();

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2.5, lat: 2.5 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2.5, lat: 2.5 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);

			// Create a new polygon
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			features = store.copyAll();
			expect(features.length).toBe(2);
		});

		it("can create a polygon with toCustom snapping enabled", () => {
			// Make the function return a set of arbitrary coordinates
			const coordinates = [
				[5, 5],
				[5, 5],
				[10, 5],
				[10, 5],
				[10, 10],
				[10, 10],
				[5, 10],
				[5, 10],
				[5, 5],
				[5, 5],
			];

			polygonMode = new TerraDrawPolygonMode({
				snapping: {
					toCustom: () => {
						const coordinate = coordinates.shift();
						return coordinate;
					},
				},
			});
			const mockConfig = MockModeConfig(polygonMode.mode);
			store = mockConfig.store;
			polygonMode.register(mockConfig);
			polygonMode.start();

			polygonMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 0 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			// You can't close a polygon with a snapping click, so we need to do it manually
			polygonMode.onClick(MockCursorEvent({ lng: 5, lat: 5 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[5, 5],
					[10, 5],
					[10, 10],
					[5, 10],
					[5, 5],
				],
			]);
		});

		it("can update polygon past 3 coordinates, for right hand rule abiding polygon", () => {
			polygonMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));
			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));
			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			const features = store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[0, 0],
				],
			]);
		});

		it("can update polygon past 3 coordinates, correcting to ensure the right hand rule", () => {
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			// 1 times for the polygon
			// 2 times for the closing points
			let features = store.copyAll();
			expect(features.length).toBe(3);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[0, 0],
				],
			]);

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			// 1 times for the polygon
			// 2 times for the closing points
			features = store.copyAll();
			expect(features.length).toBe(3);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[3, 3],
					[0, 0],
				],
			]);

			polygonMode.onMouseMove(MockCursorEvent({ lng: 4, lat: 4 }));

			polygonMode.onClick(MockCursorEvent({ lng: 4, lat: 4 }));

			// 1 times for the polygon
			// 2 times for the closing points
			features = store.copyAll();
			expect(features.length).toBe(3);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[4, 4],
					[4, 4],
					[0, 0],
				],
			]);

			// Close off the polygon
			polygonMode.onClick(MockCursorEvent({ lng: 4, lat: 4 }));

			// No closing points as polygon is closed
			features = store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[4, 4],
					[0, 0],
				].reverse(), // Reverse to make it right hand rule valid
			]);
		});

		it("can update polygon past 3 coordinates with showCoordinatePoints, correcting to ensure the right hand rule", () => {
			polygonMode.updateOptions({
				showCoordinatePoints: true,
			});

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			// Close off the polygon
			polygonMode.onClick(MockCursorEvent({ lng: 4, lat: 4 }));
			polygonMode.onClick(MockCursorEvent({ lng: 4, lat: 4 }));

			const features = store.copyAll();

			expect(features.length).toBe(6);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[4, 4],
					[0, 0],
				].reverse(), // Reverse to make it right hand rule valid
			]);

			// Ensure the coordinate points are created in the right order
			expect(features[1].geometry.coordinates).toStrictEqual([0, 0]);
			expect(features[1].properties.index).toBe(0);
			expect(features[2].geometry.coordinates).toStrictEqual([4, 4]);
			expect(features[2].properties.index).toBe(1);
			expect(features[3].geometry.coordinates).toStrictEqual([3, 3]);
			expect(features[3].properties.index).toBe(2);
			expect(features[4].geometry.coordinates).toStrictEqual([2, 2]);
			expect(features[4].properties.index).toBe(3);
			expect(features[5].geometry.coordinates).toStrictEqual([1, 1]);
			expect(features[5].properties.index).toBe(4);
		});

		it("it early returns early if a duplicate coordinate is provided", () => {
			polygonMode = new TerraDrawPolygonMode();
			const mockConfig = MockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			polygonMode.register(mockConfig);
			polygonMode.start();

			jest.spyOn(store, "updateGeometry");
			jest.spyOn(store, "create");

			const firstPoint = MockCursorEvent({ lng: 1, lat: 1 });
			polygonMode.onMouseMove(firstPoint);
			polygonMode.onClick(firstPoint);

			expect(store.updateGeometry).toHaveBeenCalledTimes(0);
			expect(store.create).toHaveBeenCalledTimes(1);

			polygonMode.onMouseMove(firstPoint);
			expect(store.updateGeometry).toHaveBeenCalledTimes(1);

			// Nothing happens here because the coordinates
			// are identical

			polygonMode.onClick(firstPoint);
			expect(store.updateGeometry).toHaveBeenCalledTimes(1);

			const secondPoint = MockCursorEvent({ lng: 2, lat: 2 });
			polygonMode.onMouseMove(secondPoint);
			expect(store.updateGeometry).toHaveBeenCalledTimes(2);

			// This now updates because the coordinate is different

			polygonMode.onClick(secondPoint);
			expect(store.updateGeometry).toHaveBeenCalledTimes(3);

			polygonMode.onMouseMove(secondPoint);
			expect(store.updateGeometry).toHaveBeenCalledTimes(4);

			// Again nothing happens because the coordinate is identical
			polygonMode.onClick(secondPoint);
			expect(store.updateGeometry).toHaveBeenCalledTimes(4);

			const thirdPoint = MockCursorEvent({ lng: 3, lat: 3 });

			polygonMode.onMouseMove(thirdPoint);
			expect(store.updateGeometry).toHaveBeenCalledTimes(5);

			// This now updates because the coordinate is different
			polygonMode.onClick(thirdPoint);
			expect(store.updateGeometry).toHaveBeenCalledTimes(6);

			polygonMode.onMouseMove(thirdPoint);
			expect(store.updateGeometry).toHaveBeenCalledTimes(7);

			polygonMode.onClick(thirdPoint);
			// Right hand rule is not valid so extra update!
			expect(store.updateGeometry).toHaveBeenCalledTimes(9);

			// Polygon is now closed
			expect(store.updateGeometry).toHaveBeenNthCalledWith(8, [
				{
					geometry: {
						coordinates: [
							[
								[1, 1],
								[2, 2],
								[3, 3],
								[1, 1],
							],
						],
						type: "Polygon",
					},
					id: expect.any(String),
				},
			]);
		});

		it("right click can delete a point if editable is true", () => {
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);

			expect(onFinish).toHaveBeenCalledTimes(1);

			// Delete a coordinate
			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1, button: "right" }));

			const featuresAfter = store.copyAll();
			expect(featuresAfter.length).toBe(1);
			expect(featuresAfter[0].geometry.coordinates[0]).not.toEqual(
				features[0].geometry.coordinates[0],
			);

			expect(onFinish).toHaveBeenCalledTimes(2);
		});

		it("context menu click can delete a point if editable is true", () => {
			polygonMode.updateOptions({
				pointerEvents: {
					...DefaultPointerEvents,
					contextMenu: true,
					rightClick: false,
				},
			});

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);

			expect(onFinish).toHaveBeenCalledTimes(1);

			// Delete a coordinate
			polygonMode.onClick(
				MockCursorEvent({
					lng: 1,
					lat: 1,
					button: "left",
					isContextMenu: true,
				}),
			);

			const featuresAfter = store.copyAll();
			expect(featuresAfter.length).toBe(1);
			expect(featuresAfter[0].geometry.coordinates[0]).not.toEqual(
				features[0].geometry.coordinates[0],
			);

			expect(onFinish).toHaveBeenCalledTimes(2);
		});

		it("context menu click cannot delete a point whilst currently drawing if editable is true", () => {
			polygonMode.updateOptions({
				showCoordinatePoints: true,
				pointerEvents: {
					...DefaultPointerEvents,
					contextMenu: true,
					rightClick: false,
				},
			});

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			let features = store
				.copyAll()
				.find(
					(feature) => feature.properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				);
			expect(features?.geometry.coordinates[0]).toEqual([
				[0, 0],
				[1, 1],
				[2, 2],
				[3, 3],
				[3, 3],
				[0, 0],
			]);

			// Delete a coordinate
			polygonMode.onClick(
				MockCursorEvent({
					lng: 3,
					lat: 3,
					button: "right",
					isContextMenu: true,
				}),
			);

			features = store
				.copyAll()
				.find(
					(feature) => feature.properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				);

			// TODO: This probably should not mutate the coordinates when context/right clicking?
			expect(features?.geometry.coordinates[0]).toEqual([
				[0, 0],
				[1, 1],
				[2, 2],
				[3, 3],
				[0, 0],
				[0, 0],
			]);

			expect(onChange).not.toHaveBeenCalledWith(
				[expect.any(String)],
				"delete",
				undefined,
			);
			expect(onFinish).toHaveBeenCalledTimes(0);
		});

		it("creates an initial coordinate points on first click when showCoordinatePoints is true", () => {
			polygonMode.updateOptions({
				showCoordinatePoints: true,
			});

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = store.copyAll();
			expect(features.length).toBe(4);

			expect(features[0].geometry.type).toBe("Polygon");
			expect(features[0].properties.coordinatePointIds).toEqual([
				expect.any(String),
				expect.any(String),
				expect.any(String),
			]);
			expect(features[1].geometry.type).toBe("Point");
			expect(features[2].geometry.type).toBe("Point");
			expect(features[3].geometry.type).toBe("Point");
		});

		it("updates the properties for committed coordinate count and provisional coordinate counts", () => {
			polygonMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);
			expect(
				features[0].properties[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT],
			).toBe(1);
			expect(
				features[0].properties[COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT],
			).toBe(1);

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));
			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			features = store.copyAll();
			expect(features.length).toBe(1);
			expect(
				features[0].properties[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT],
			).toBe(2);
			expect(
				features[0].properties[COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT],
			).toBe(2);

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));
			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			features = store.copyAll();
			expect(features.length).toBe(3); // 2 closing points are created
			expect(
				features[0].properties[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT],
			).toBe(3);
			expect(
				features[0].properties[COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT],
			).toBe(3);

			expect(onFinish).toHaveBeenCalledTimes(0);

			// Close the polygon
			polygonMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			features = store.copyAll();
			expect(features.length).toBe(1);
			expect(
				features[0].properties[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT],
			).toBe(undefined);
			expect(
				features[0].properties[COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT],
			).toBe(undefined);

			expect(onFinish).toHaveBeenCalledTimes(1);
		});

		describe("with leftClick pointer event set to false", () => {
			beforeEach(() => {
				polygonMode = new TerraDrawPolygonMode({
					pointerEvents: {
						...DefaultPointerEvents,
						leftClick: false,
					},
				});
				const mockConfig = MockModeConfig(polygonMode.mode);

				store = mockConfig.store;
				polygonMode.register(mockConfig);
				polygonMode.start();
			});

			it("should not allow click", () => {
				polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				let features = store.copyAll();
				expect(features.length).toBe(0);
			});
		});

		describe("validate", () => {
			it("does not create a polygon if it has intersections and there is a validation that returns false", () => {
				polygonMode = new TerraDrawPolygonMode({
					validation: validation,
				});
				const mockConfig = MockModeConfig(polygonMode.mode);

				store = mockConfig.store;

				polygonMode.register(mockConfig);
				polygonMode.start();

				const coordOneEvent = MockCursorEvent({
					lng: 11.162109375,
					lat: 23.322080011,
				});
				polygonMode.onClick(coordOneEvent);

				const coordTwoEvent = MockCursorEvent({
					lng: -21.884765625,
					lat: -8.928487062,
				});
				polygonMode.onMouseMove(coordTwoEvent);
				polygonMode.onClick(coordTwoEvent);

				const coordThreeEvent = MockCursorEvent({
					lng: 26.894531249,
					lat: -20.468189222,
				});
				polygonMode.onMouseMove(coordThreeEvent);
				polygonMode.onClick(coordThreeEvent);

				// Overlapping point
				const coordFourEvent = MockCursorEvent({
					lng: -13.974609375,
					lat: 22.187404991,
				});

				polygonMode.onMouseMove(coordFourEvent);

				polygonMode.onClick(coordFourEvent);

				let features = store.copyAll();
				expect(features.length).toBe(3);

				// Here we still have the coordinate but it's not committed
				// to the finished polygon
				expect(features[0].geometry.coordinates).toStrictEqual([
					[
						[11.162109375, 23.322080011],
						[-21.884765625, -8.928487062],
						[26.894531249, -20.468189222],
						[-13.974609375, 22.187404991],
						[11.162109375, 23.322080011],
					],
				]);

				const closingCoordEvent = { ...coordOneEvent };
				polygonMode.onMouseMove(closingCoordEvent);
				polygonMode.onClick(closingCoordEvent);

				// No closing points as feature is closed
				features = store.copyAll();
				expect(features.length).toBe(1);

				// The overlapping coordinate is not included
				expect(features[0].geometry.coordinates).toStrictEqual([
					[
						[11.162109375, 23.322080011],
						[-21.884765625, -8.928487062],
						[26.894531249, -20.468189222],
						[11.162109375, 23.322080011],
					],
				]);
			});

			it("does create a polygon if it does not have intersections and there is a validation that returns true", () => {
				polygonMode = new TerraDrawPolygonMode({
					validation: (feature, { updateType }) => {
						if (updateType === "finish" || updateType === "commit") {
							return ValidateNotSelfIntersecting(feature);
						}
						return { valid: true };
					},
				});
				const mockConfig = MockModeConfig(polygonMode.mode);

				store = mockConfig.store;

				polygonMode.register(mockConfig);
				polygonMode.start();

				polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				polygonMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 1 }));

				polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 1 }));

				polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				let features = store.copyAll();

				expect(features.length).toBe(1);

				// Create a new polygon
				polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				features = store.copyAll();
				expect(features.length).toBe(2);
			});
		});
	});

	describe("onKeyUp", () => {
		let polygonMode: TerraDrawPolygonMode;
		let store: TerraDrawGeoJSONStore;
		let onFinish: jest.Mock;

		beforeEach(() => {
			polygonMode = new TerraDrawPolygonMode();
			const mockConfig = MockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			onFinish = mockConfig.onFinish;
			polygonMode.register(mockConfig);
			polygonMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no polygon is present", () => {
				polygonMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));
			});

			it("deletes the polygon when currently editing", () => {
				polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);

				polygonMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				features = store.copyAll();
				expect(features.length).toBe(0);
			});

			it("does not delete the polygon when cancel is set to null", () => {
				polygonMode = new TerraDrawPolygonMode({ keyEvents: { cancel: null } });
				const mockConfig = MockModeConfig(polygonMode.mode);

				store = mockConfig.store;
				polygonMode.register(mockConfig);
				polygonMode.start();

				polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);

				polygonMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				features = store.copyAll();
				expect(features.length).toBe(1);
			});
		});

		describe("finish", () => {
			it("can create a polygon", () => {
				polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

				polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

				polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

				polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

				polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);
				expect(
					features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBe(undefined);

				// Finish drawing the polygon
				polygonMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				expect(onFinish).toHaveBeenCalledTimes(1);
				expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
					action: "draw",
					mode: "polygon",
				});

				// Creates a new polygon
				polygonMode.onClick(MockCursorEvent({ lng: 4, lat: 4 }));

				features = store.copyAll();
				expect(features.length).toBe(2);
			});
		});

		it("does not finish drawing polygon when finish is null", () => {
			polygonMode = new TerraDrawPolygonMode({ keyEvents: { finish: null } });
			const mockConfig = MockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			polygonMode.register(mockConfig);
			polygonMode.start();

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

			polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

			polygonMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

			expect(onFinish).not.toHaveBeenCalled();

			const features = store.copyAll();

			// 2 Closing points and 1 Polygon
			// has not finished the polygon off and deleted the closing points
			expect(features.length).toBe(3);
		});
	});
});

describe("cleanUp", () => {
	let store: TerraDrawGeoJSONStore;
	let polygonMode: TerraDrawPolygonMode;

	beforeEach(() => {
		jest.resetAllMocks();
		polygonMode = new TerraDrawPolygonMode();

		const mockConfig = MockModeConfig(polygonMode.mode);
		store = mockConfig.store;

		polygonMode.register(mockConfig);
		polygonMode.start();
	});

	it("does not throw error if feature has not been created ", () => {
		expect(() => {
			polygonMode.cleanUp();
		}).not.toThrow();
	});

	it("cleans up correctly if drawing has started", () => {
		polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

		expect(store.copyAll().length).toBe(1);

		polygonMode.cleanUp();

		// Removes the LineString that was being created
		expect(store.copyAll().length).toBe(0);
	});
});

describe("onDragStart", () => {
	it("does nothing if editable is not enabled", () => {
		const polygonMode = new TerraDrawPolygonMode();
		const mockConfig = MockModeConfig(polygonMode.mode);
		polygonMode.register(mockConfig);
		polygonMode.start();

		polygonMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), () => {});
		expect(mockConfig.onChange).not.toHaveBeenCalled();
		expect(mockConfig.onFinish).not.toHaveBeenCalled();
	});

	it("creates the drag point when editable is true and a coordinate is selected", () => {
		const polygonMode = new TerraDrawPolygonMode({ editable: true });
		const mockConfig = MockModeConfig(polygonMode.mode);
		polygonMode.register(mockConfig);
		polygonMode.start();

		// Create a polygon to edit
		polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

		polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

		polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

		polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

		polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

		polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

		polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

		polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

		mockConfig.onFinish.mockClear();

		// Ensure it's there
		let features = mockConfig.store.copyAll();
		expect(features.length).toBe(1);

		// Reset to make it easier to track for onDragStart
		mockConfig.onChange.mockClear();
		mockConfig.setCursor.mockClear();

		polygonMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), () => {});

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
		const polygonMode = new TerraDrawPolygonMode();
		const mockConfig = MockModeConfig(polygonMode.mode);
		polygonMode.register(mockConfig);

		polygonMode.onDrag(MockCursorEvent({ lng: 0, lat: 0 }), () => {});
		expect(mockConfig.onChange).not.toHaveBeenCalled();
	});

	it("moves the drag point correctly", () => {
		const polygonMode = new TerraDrawPolygonMode({ editable: true });
		const mockConfig = MockModeConfig(polygonMode.mode);
		polygonMode.register(mockConfig);
		polygonMode.start();

		// Create a polygon to edit
		polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

		polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

		polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

		polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

		polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

		polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

		polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

		polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

		// Ensure it's there
		let features = mockConfig.store.copyAll();
		expect(features.length).toBe(1);

		polygonMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), () => {});

		// Reset to make it easier to track for onDragStart
		mockConfig.onChange.mockClear();
		mockConfig.setCursor.mockClear();

		polygonMode.onDrag(MockCursorEvent({ lng: 1, lat: 1 }), () => {});

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

		// Edited polygon
		expect(allFeatures[0].geometry.type).toBe("Polygon");
		expect(allFeatures[0].properties.edited).toBe(true);

		// Edit point
		expect(allFeatures[1].geometry.type).toBe("Point");
		expect(allFeatures[1].properties.edited).toBe(true);
		expect(allFeatures[1].geometry.coordinates).toEqual([1, 1]);

		// We don't change the cursor in onDrag
		expect(mockConfig.setCursor).toHaveBeenCalledTimes(0);
	});
});

describe("onDragEnd", () => {
	it("does nothing if editable is not enabled", () => {
		const polygonMode = new TerraDrawPolygonMode();
		const mockConfig = MockModeConfig(polygonMode.mode);
		polygonMode.register(mockConfig);

		polygonMode.onDragEnd(MockCursorEvent({ lng: 0, lat: 0 }), () => {});
		expect(mockConfig.onChange).not.toHaveBeenCalled();
	});

	it("removes the drag point after it's finished", () => {
		const polygonMode = new TerraDrawPolygonMode({ editable: true });
		const mockConfig = MockModeConfig(polygonMode.mode);
		polygonMode.register(mockConfig);
		polygonMode.start();

		// Create a polygon to edit
		polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

		polygonMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

		polygonMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

		polygonMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

		polygonMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

		polygonMode.onMouseMove(MockCursorEvent({ lng: 3, lat: 3 }));

		polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

		polygonMode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));

		mockConfig.onFinish.mockClear();

		// Ensure it's there
		let features = mockConfig.store.copyAll();
		expect(features.length).toBe(1);

		polygonMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), () => {});

		polygonMode.onDrag(MockCursorEvent({ lng: 1, lat: 1 }), () => {});

		// Reset to make it easier to track for onDragStart
		mockConfig.onChange.mockClear();
		mockConfig.setCursor.mockClear();

		polygonMode.onDragEnd(MockCursorEvent({ lng: 1, lat: 1 }), () => {});

		expect(mockConfig.onChange).toHaveBeenCalledTimes(2);

		// Remove the edit drag point
		expect(mockConfig.onChange).toHaveBeenNthCalledWith(
			1,
			[expect.any(String)],
			"delete",
			undefined,
		);

		// Remove the edited property from the polygonux
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
		const polygonMode = new TerraDrawPolygonMode();
		polygonMode.register(MockModeConfig(polygonMode.mode));
		expect(polygonMode.styles).toStrictEqual({});
	});

	it("set fails if non valid styling", () => {
		const polygonMode = new TerraDrawPolygonMode();
		polygonMode.register(MockModeConfig(polygonMode.mode));

		expect(() => {
			(polygonMode.styles as unknown) = "test";
		}).toThrow();

		expect(polygonMode.styles).toStrictEqual({});
	});

	it("sets", () => {
		const polygonMode = new TerraDrawPolygonMode();
		polygonMode.register(MockModeConfig(polygonMode.mode));

		polygonMode.styles = {
			closingPointColor: "#ffffff",
		};

		expect(polygonMode.styles).toStrictEqual({
			closingPointColor: "#ffffff",
		});
	});
});

describe("styleFeature", () => {
	it("returns the correct styles for polygon", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: "#ffffff",
				outlineColor: "#111111",
				outlineWidth: 2,
				fillOpacity: 0.5,
				closingPointWidth: 2,
				closingPointColor: "#dddddd",
				closingPointOutlineWidth: 1,
				closingPointOutlineColor: "#222222",
				zIndex: 42,
			},
		});

		expect(
			polygonMode.styleFeature({
				type: "Feature",
				geometry: { type: "Polygon", coordinates: [] },
				properties: { mode: "polygon" },
			}),
		).toMatchObject({
			polygonFillColor: "#ffffff",
			polygonOutlineColor: "#111111",
			polygonOutlineWidth: 2,
			polygonFillOpacity: 0.5,
			zIndex: 42,
		});
	});

	it("returns the correct styles for polygon using function", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: () => "#ffffff",
				outlineColor: () => "#111111",
				outlineWidth: () => 2,
				fillOpacity: () => 0.5,
				closingPointWidth: () => 2,
				closingPointColor: () => "#dddddd",
				closingPointOutlineWidth: () => 1,
				closingPointOutlineColor: () => "#222222",
				zIndex: () => 42,
			},
		});

		polygonMode.register(MockModeConfig(polygonMode.mode));

		expect(
			polygonMode.styleFeature({
				type: "Feature",
				geometry: { type: "Polygon", coordinates: [] },
				properties: { mode: "polygon" },
			}),
		).toMatchObject({
			polygonFillColor: "#ffffff",
			polygonOutlineColor: "#111111",
			polygonOutlineWidth: 2,
			polygonFillOpacity: 0.5,
			zIndex: 42,
		});
	});

	it("returns the correct styles for closing point", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: "#ffffff",
				outlineColor: "#111111",
				outlineWidth: 2,
				fillOpacity: 0.5,
				closingPointWidth: 2,
				closingPointColor: "#dddddd",
				closingPointOutlineWidth: 1,
				closingPointOutlineColor: "#222222",
			},
		});

		expect(
			polygonMode.styleFeature({
				type: "Feature",
				geometry: { type: "Point", coordinates: [] },
				properties: { mode: "polygon", closingPoint: true },
			}),
		).toMatchObject({
			pointWidth: 2,
			pointColor: "#dddddd",
			pointOutlineColor: "#222222",
			pointOutlineWidth: 1,
			zIndex: 30,
		});
	});

	it("returns the correct styles for snapping point", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: "#ffffff",
				outlineColor: "#111111",
				outlineWidth: 2,
				fillOpacity: 0.5,
				snappingPointWidth: 2,
				snappingPointColor: "#dddddd",
				snappingPointOutlineWidth: 1,
				snappingPointOutlineColor: "#222222",
			},
		});

		expect(
			polygonMode.styleFeature({
				type: "Feature",
				geometry: { type: "Point", coordinates: [] },
				properties: { mode: "polygon", snappingPoint: true },
			}),
		).toMatchObject({
			pointWidth: 2,
			pointColor: "#dddddd",
			pointOutlineColor: "#222222",
			pointOutlineWidth: 1,
			zIndex: 30,
		});
	});
});

describe("validateFeature", () => {
	it("returns false for invalid polygon feature", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: "#ffffff",
				outlineColor: "#ffffff",
				outlineWidth: 2,
				fillOpacity: 0.5,
			},
		});
		polygonMode.register(MockModeConfig("polygon"));

		expect(
			polygonMode.validateFeature({
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
			valid: false,
			reason: "Feature mode property does not match the mode being added to",
		});
	});

	it("returns true for valid polygon feature", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: "#ffffff",
				outlineColor: "#ffffff",
				outlineWidth: 2,
				fillOpacity: 0.5,
			},
		});
		polygonMode.register(MockModeConfig("polygon"));

		expect(
			polygonMode.validateFeature({
				id: "66608334-7cf1-4f9e-a7f9-75e5ac135e68",
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[-1.812744141, 52.429222278],
							[-1.889648438, 51.652110862],
							[0.505371094, 52.052490476],
							[-0.417480469, 52.476089041],
							[-1.812744141, 52.429222278],
						],
					],
				},
				properties: {
					mode: "polygon",
					createdAt: 1685655516297,
					updatedAt: 1685655518118,
				},
			}),
		).toEqual({
			reason: undefined,
			valid: true,
		});
	});

	it("returns false for valid polygon feature but validate function returns false", () => {
		const polygonMode = new TerraDrawPolygonMode({
			validation: () => ({ valid: false }),
		});
		polygonMode.register(MockModeConfig("polygon"));

		expect(
			polygonMode.validateFeature({
				id: "66608334-7cf1-4f9e-a7f9-75e5ac135e68",
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[-1.812744141, 52.429222278],
							[-1.889648438, 51.652110862],
							[0.505371094, 52.052490476],
							[-0.417480469, 52.476089041],
							[-1.812744141, 52.429222278],
						],
					],
				},
				properties: {
					mode: "polygon",
					createdAt: 1685655516297,
					updatedAt: 1685655518118,
				},
			}),
		).toEqual({
			reason: undefined,
			valid: false,
		});
	});
});
