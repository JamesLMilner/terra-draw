/**
 * @jest-environment jsdom
 */
import { TerraDrawAdapterStyling, TerraDrawExtend } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "./terra-draw-maplibre-gl-adapter";
import * as maplibregl from "maplibre-gl";

describe("TerraDrawMapLibreGLAdapter", () => {
	const createMapLibreGLMap = () => {
		return {
			project: jest.fn(() => ({ x: 0, y: 0 }) as any),
			unproject: jest.fn(() => ({ lng: 0, lat: 0 }) as any),
			getCanvas: jest.fn(
				() =>
					({
						addEventListener: jest.fn(),
						removeEventListener: jest.fn(),
						style: { removeProperty: jest.fn(), cursor: "initial" },
					}) as any,
			),
			getContainer: jest.fn(
				() =>
					({
						getBoundingClientRect: jest.fn().mockReturnValue({
							left: 0,
							top: 0,
						} as DOMRect),
					}) as unknown as HTMLElement,
			),
			doubleClickZoom: {
				enable: jest.fn(),
				disable: jest.fn(),
				isActive: jest.fn(),
				isEnabled: jest.fn(),
			} as unknown as maplibregl.DoubleClickZoomHandler,
			dragPan: {
				enable: jest.fn(),
				disable: jest.fn(),
				isActive: jest.fn(),
				isEnabled: jest.fn(() => true),
			} as unknown as maplibregl.DragPanHandler,
			dragRotate: {
				enable: jest.fn(),
				disable: jest.fn(),
				isActive: jest.fn(),
				isEnabled: jest.fn(() => true),
			} as unknown as maplibregl.DragRotateHandler,
			addSource: jest.fn(),
			addLayer: jest.fn(),
			moveLayer: jest.fn(),
			removeLayer: jest.fn(),
			removeSource: jest.fn(),
			getSource: jest.fn(() => ({ setData: jest.fn() })) as any,
			on: jest.fn(),
			off: jest.fn(),
		} as Partial<maplibregl.Map>;
	};

	const MockPointerEvent = () =>
		({
			bubbles: true,
			cancelable: true,
			clientX: 0,
			clientY: 0,
			button: 0,
			buttons: 1,
			pointerId: 1,
			pointerType: "mouse",
			isPrimary: true,
		}) as PointerEvent;

	const MockCallbacks = (
		overrides?: Partial<TerraDrawExtend.TerraDrawCallbacks>,
	): TerraDrawExtend.TerraDrawCallbacks => ({
		getState: jest.fn(),
		onKeyUp: jest.fn(),
		onKeyDown: jest.fn(),
		onClick: jest.fn(),
		onMouseMove: jest.fn(),
		onDragStart: jest.fn(),
		onDrag: jest.fn(),
		onDragEnd: jest.fn(),
		onClear: jest.fn(),
		onReady: jest.fn(),
		...overrides,
	});

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: createMapLibreGLMap() as maplibregl.Map,
				minPixelDragDistance: 1,
				minPixelDragDistanceSelecting: 8,
				minPixelDragDistanceDrawing: 8,
				coordinatePrecision: 9,
			});

			expect(adapter).toBeDefined();
			expect(adapter.getMapEventElement).toBeDefined();
			expect(adapter.render).toBeDefined();
			expect(adapter.register).toBeDefined();
			expect(adapter.unregister).toBeDefined();
			expect(adapter.project).toBeDefined();
			expect(adapter.unproject).toBeDefined();
			expect(adapter.setCursor).toBeDefined();
		});
	});

	describe("getLngLatFromEvent", () => {
		let adapter: TerraDrawMapLibreGLAdapter<maplibregl.Map>;
		const map = createMapLibreGLMap();
		beforeEach(() => {
			adapter = new TerraDrawMapLibreGLAdapter({
				map,
			});
		});
		it("getLngLatFromEvent returns correct coordinates", () => {
			// Mock the containerPointToLatLng function
			map.unproject = jest.fn(() => ({
				lat: 51.507222,
				lng: -0.1275,
			})) as unknown as (point: maplibregl.PointLike) => maplibregl.LngLat;

			const result = adapter.getLngLatFromEvent(MockPointerEvent());
			expect(result).toEqual({ lat: 51.507222, lng: -0.1275 });
		});
	});

	describe("setDraggability", () => {
		it("setDraggability enables and disables map dragging", () => {
			const map = createMapLibreGLMap();

			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			// Test enabling dragging
			adapter.setDraggability(true);
			expect(map.dragPan?.enable).toHaveBeenCalledTimes(1);
			expect(map.dragPan?.disable).toHaveBeenCalledTimes(0);
			expect(map.dragRotate?.enable).toHaveBeenCalledTimes(1);
			expect(map.dragRotate?.disable).toHaveBeenCalledTimes(0);

			// Test disabling dragging
			adapter.setDraggability(false);
			expect(map.dragPan?.enable).toHaveBeenCalledTimes(1);
			expect(map.dragPan?.disable).toHaveBeenCalledTimes(1);
			expect(map.dragRotate?.enable).toHaveBeenCalledTimes(1);
			expect(map.dragRotate?.disable).toHaveBeenCalledTimes(1);
		});

		it("respects original pan/rotate settings when calling setDraggability", () => {
			const map = createMapLibreGLMap();

			map.dragPan!.isEnabled = jest.fn(() => false);
			map.dragRotate!.isEnabled = jest.fn(() => false);

			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			// Test enabling dragging
			adapter.setDraggability(true);
			expect(map.dragPan?.enable).toHaveBeenCalledTimes(0);
			expect(map.dragPan?.disable).toHaveBeenCalledTimes(0);
			expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);
			expect(map.dragRotate?.disable).toHaveBeenCalledTimes(0);

			// Test disabling dragging
			adapter.setDraggability(false);
			expect(map.dragPan?.enable).toHaveBeenCalledTimes(0);
			expect(map.dragPan?.disable).toHaveBeenCalledTimes(0);
			expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);
			expect(map.dragRotate?.disable).toHaveBeenCalledTimes(0);
		});

		it("respects mixed pan/rotate settings when calling setDraggability", () => {
			const map = createMapLibreGLMap();

			map.dragPan!.isEnabled = jest.fn(() => true);
			map.dragRotate!.isEnabled = jest.fn(() => false);

			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			// Test enabling dragging
			adapter.setDraggability(true);
			expect(map.dragPan?.enable).toHaveBeenCalledTimes(1);
			expect(map.dragPan?.disable).toHaveBeenCalledTimes(0);
			expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);
			expect(map.dragRotate?.disable).toHaveBeenCalledTimes(0);

			// Test disabling dragging
			adapter.setDraggability(false);
			expect(map.dragPan?.enable).toHaveBeenCalledTimes(1);
			expect(map.dragPan?.disable).toHaveBeenCalledTimes(1);
			expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);
			expect(map.dragRotate?.disable).toHaveBeenCalledTimes(0);
		});
	});

	describe("project", () => {
		it("returns the correct lat lng as expected", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			// Test enabling dragging
			adapter.project(0, 0);
			expect(map.project).toHaveBeenCalledTimes(1);
			expect(map.project).toHaveBeenCalledWith({ lat: 0, lng: 0 });
		});
	});

	describe("unproject", () => {
		it("returns the correct x y as expected", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			// Test enabling dragging
			adapter.unproject(0, 0);
			expect(map.unproject).toHaveBeenCalledTimes(1);
			expect(map.unproject).toHaveBeenCalledWith({ x: 0, y: 0 });
		});
	});

	describe("setCursor", () => {
		it("sets the cursor correctly", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			const container = {
				offsetLeft: 0,
				offsetTop: 0,
				style: { removeProperty: jest.fn(), cursor: "initial" },
			} as unknown as HTMLCanvasElement;

			map.getCanvas = jest.fn(() => container);

			adapter.setCursor("unset");

			expect(map.getCanvas).toHaveBeenCalledTimes(1);
			expect(container.style.removeProperty).toHaveBeenCalledTimes(1);

			adapter.setCursor("pointer");

			expect(map.getCanvas).toHaveBeenCalledTimes(2);
			expect(container.style.cursor).toBe("pointer");
		});
	});

	describe("setDoubleClickToZoom", () => {
		it("enables and disables double click to zoom as expected", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.setDoubleClickToZoom(true);

			expect(map.doubleClickZoom?.enable).toHaveBeenCalledTimes(1);

			adapter.setDoubleClickToZoom(false);

			expect(map.doubleClickZoom?.disable).toHaveBeenCalledTimes(1);
		});
	});

	describe("clear", () => {
		it("removes layers and sources correctly", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as TerraDrawAdapterStyling,
				},
			);
			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];
			rAFCallback();

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(4);
			expect(map.getSource).toHaveBeenCalledTimes(3);

			adapter.clear();

			expect(map.removeLayer).toHaveBeenCalledTimes(0);
			expect(map.removeSource).toHaveBeenCalledTimes(0);
			expect(map.getSource).toHaveBeenCalledTimes(6);
		});
	});

	describe("render", () => {
		it("creates layers and sources with no data passed", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(4);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(4);
		});

		it("updates layers and sources when data is passed", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			expect(map.addSource).toHaveBeenCalledTimes(0);
			expect(map.addLayer).toHaveBeenCalledTimes(0);

			adapter.register(MockCallbacks());

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(4);

			expect(map.getSource).toHaveBeenCalledTimes(0);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			let rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			// No additional sources or layers should be added
			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(4);

			expect(map.getSource).toHaveBeenCalledTimes(3);

			adapter.render(
				{
					created: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 1],
							},
							properties: {
								mode: "point",
							},
						},
						{
							id: "2",
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
							id: "3",
							type: "Feature",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[0, 0],
										[0, 100],
										[100, 100],
										[100, 0],
										[0, 0],
									],
								],
							},
							properties: {
								mode: "polygon",
							},
						},
					],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					point: () => ({}) as TerraDrawAdapterStyling,
					linestring: () => ({}) as TerraDrawAdapterStyling,
					polygon: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[1][0];

			rAFCallback();

			expect(map.getSource).toHaveBeenCalledTimes(6);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: ["3"],
				},
				{
					point: () => ({}) as TerraDrawAdapterStyling,
					linestring: () => ({}) as TerraDrawAdapterStyling,
					polygon: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[2][0];

			rAFCallback();

			// Force update because of the deletion
			expect(map.getSource).toHaveBeenCalledTimes(9);
		});

		it("does not attempt to update after adapter is unregistered", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			expect(map.addSource).toHaveBeenCalledTimes(0);
			expect(map.addLayer).toHaveBeenCalledTimes(0);

			adapter.register(MockCallbacks());

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(4);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			let rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(4);

			adapter.render(
				{
					created: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 1],
							},
							properties: {
								mode: "point",
							},
						},
						{
							id: "2",
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
							id: "3",
							type: "Feature",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[0, 0],
										[0, 100],
										[100, 100],
										[100, 0],
										[0, 0],
									],
								],
							},
							properties: {
								mode: "polygon",
							},
						},
					],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					point: () => ({}) as TerraDrawAdapterStyling,
					linestring: () => ({}) as TerraDrawAdapterStyling,
					polygon: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[1][0];

			expect(map.getSource).toHaveBeenCalledTimes(3);

			adapter.unregister();

			expect(map.removeLayer).toHaveBeenCalledTimes(4);
			expect(map.removeSource).toHaveBeenCalledTimes(3);

			// Clear updates the sources to empty
			expect(map.getSource).toHaveBeenCalledTimes(6);

			rAFCallback();

			// No further updates should be made after unregistering
			expect(map.getSource).toHaveBeenCalledTimes(6);
		});
	});

	describe("getCoordinatePrecision", () => {
		it("returns the default coordinate precision of 9", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			expect(adapter.getCoordinatePrecision()).toBe(9);
		});

		it("returns the set coordinate precision of 6", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
				coordinatePrecision: 6,
			});

			adapter.register(MockCallbacks());

			expect(adapter.getCoordinatePrecision()).toBe(6);
		});
	});

	describe("register and unregister", () => {
		const emptyRender = {
			created: [],
			updated: [],
			unchanged: [],
			deletedIds: [],
		};

		it("can register then unregister successfully", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			adapter.render(emptyRender, {
				test: () => ({}) as TerraDrawAdapterStyling,
			});

			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			adapter.unregister();

			// Clears any set data
			expect(map.removeLayer).toHaveBeenCalledTimes(4);
			expect(map.removeSource).toHaveBeenCalledTimes(3);
		});

		it("can register -> unregister -> register successfully", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			adapter.render(emptyRender, {
				test: () => ({}) as TerraDrawAdapterStyling,
			});

			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			adapter.unregister();

			// Clears any set data
			expect(map.removeLayer).toHaveBeenCalledTimes(4);
			expect(map.removeSource).toHaveBeenCalledTimes(3);

			// Re-register
			adapter.register(MockCallbacks());
		});

		it("moves layers respecting the renderBelowLayerId properties", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
				renderPointsBelowLayerId: "101",
				renderLinesBelowLayerId: "102",
				renderPolygonsBelowLayerId: "103",
			});

			adapter.register(MockCallbacks());

			expect(map.moveLayer).toHaveBeenCalledTimes(4);
			expect(map.moveLayer).toHaveBeenCalledWith(
				"td-polygon-outline",
				"td-linestring",
			);
			expect(map.moveLayer).toHaveBeenCalledWith("td-polygon", "103");
			expect(map.moveLayer).toHaveBeenCalledWith("td-linestring", "102");
			expect(map.moveLayer).toHaveBeenCalledWith("td-point", "101");
		});
	});
});
