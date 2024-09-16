/**
 * @jest-environment jsdom
 */
import { createMockCallbacks } from "../test/mock-callbacks";
import { getMockPointerEvent } from "../test/mock-pointer-event";
import { TerraDrawMapboxGLAdapter } from "./mapbox-gl.adapter";

const createMapboxGLMap = () => {
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
		},
		dragPan: {
			enable: jest.fn(),
			disable: jest.fn(),
			isActive: jest.fn(),
			isEnabled: jest.fn(),
		},
		dragRotate: {
			enable: jest.fn(),
			disable: jest.fn(),
			isActive: jest.fn(),
			isEnabled: jest.fn(),
		},
		addSource: jest.fn(),
		addLayer: jest.fn(),
		moveLayer: jest.fn(),
		removeLayer: jest.fn(),
		removeSource: jest.fn(),
		getSource: jest.fn(() => ({ setData: jest.fn() })) as any,
		on: jest.fn(),
		off: jest.fn(),
	} as Partial<mapboxgl.Map>;
};

describe("TerraDrawMapboxGLAdapter", () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawMapboxGLAdapter({
				map: createMapboxGLMap() as mapboxgl.Map,
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
		let adapter: TerraDrawMapboxGLAdapter;
		const map = createMapboxGLMap();
		beforeEach(() => {
			adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});
		});
		it("getLngLatFromEvent returns correct coordinates", () => {
			// Mock the containerPointToLatLng function
			map.unproject = jest.fn(() => ({
				lat: 51.507222,
				lng: -0.1275,
			})) as unknown as (point: mapboxgl.PointLike) => mapboxgl.LngLat;

			const result = adapter.getLngLatFromEvent(getMockPointerEvent());
			expect(result).toEqual({ lat: 51.507222, lng: -0.1275 });
		});
	});

	describe("setDraggability", () => {
		it("setDraggability enables and disables map dragging", () => {
			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			// Test enabling dragging
			adapter.setDraggability(true);
			expect((map.dragPan as any).enable).toHaveBeenCalledTimes(1);
			expect((map.dragPan as any).disable).toHaveBeenCalledTimes(0);
			expect((map.dragRotate as any).enable).toHaveBeenCalledTimes(1);
			expect((map.dragRotate as any).disable).toHaveBeenCalledTimes(0);

			// Test disabling dragging
			adapter.setDraggability(false);
			expect((map.dragPan as any).enable).toHaveBeenCalledTimes(1);
			expect((map.dragPan as any).disable).toHaveBeenCalledTimes(1);
			expect((map.dragPan as any).enable).toHaveBeenCalledTimes(1);
			expect((map.dragPan as any).disable).toHaveBeenCalledTimes(1);
		});
	});

	describe("project", () => {
		it("returns the correct lat lng as expected", () => {
			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			// Test enabling dragging
			adapter.project(0, 0);
			expect(map.project).toHaveBeenCalledTimes(1);
			expect(map.project).toHaveBeenCalledWith({ lat: 0, lng: 0 });
		});
	});

	describe("unproject", () => {
		it("returns the correct x y as expected", () => {
			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			// Test enabling dragging
			adapter.unproject(0, 0);
			expect(map.unproject).toHaveBeenCalledTimes(1);
			expect(map.unproject).toHaveBeenCalledWith({ x: 0, y: 0 });
		});
	});

	describe("setCursor", () => {
		it("sets the cursor correctly", () => {
			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			const container = {
				offsetLeft: 0,
				offsetTop: 0,
				style: { removeProperty: jest.fn(), cursor: "initial" },
			} as any;

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
			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			adapter.setDoubleClickToZoom(true);

			expect((map.doubleClickZoom as any).enable).toHaveBeenCalledTimes(1);

			adapter.setDoubleClickToZoom(false);

			expect((map.doubleClickZoom as any).disable).toHaveBeenCalledTimes(1);
		});
	});

	describe("clear", () => {
		it("removes layers and sources correctly", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			adapter.register(createMockCallbacks());

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as any,
				},
			);
			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];
			rAFCallback();

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(4);

			adapter.clear();

			expect(map.removeLayer).toHaveBeenCalledTimes(4);
			expect(map.removeSource).toHaveBeenCalledTimes(3);
		});
	});

	describe("render", () => {
		it("creates layers and sources with no data passed", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			adapter.register(createMockCallbacks());

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as any,
				},
			);

			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(4);
		});

		it("updates layers and sources when data is passed", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			adapter.register(createMockCallbacks());

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as any,
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
					point: () => ({}) as any,
					linestring: () => ({}) as any,
					polygon: () => ({}) as any,
				},
			);

			rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[1][0];

			rAFCallback();

			expect(map.getSource).toHaveBeenCalledTimes(3);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: ["3"],
				},
				{
					point: () => ({}) as any,
					linestring: () => ({}) as any,
					polygon: () => ({}) as any,
				},
			);

			rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[2][0];

			rAFCallback();

			// Force update because of the deletion
			expect(map.getSource).toHaveBeenCalledTimes(6);
		});
	});

	describe("getCoordinatePrecision", () => {
		it("returns the default coordinate precision of 9", () => {
			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			adapter.register(createMockCallbacks());

			expect(adapter.getCoordinatePrecision()).toBe(9);
		});

		it("returns the set coordinate precision of 6", () => {
			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
				coordinatePrecision: 6,
			});

			adapter.register(createMockCallbacks());

			expect(adapter.getCoordinatePrecision()).toBe(6);
		});
	});

	describe("register and unregister", () => {
		it("can register then unregister successfully", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapboxGLMap();
			const adapter = new TerraDrawMapboxGLAdapter({
				map: map as mapboxgl.Map,
			});

			adapter.register(createMockCallbacks());

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as any,
				},
			);

			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			adapter.unregister();

			// Clears any set data
			expect(map.removeLayer).toHaveBeenCalledTimes(4);
			expect(map.removeSource).toHaveBeenCalledTimes(3);
		});
	});
});
