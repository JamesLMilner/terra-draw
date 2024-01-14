import { getMockPointerEvent } from "../test/mock-pointer-event";
import { TerraDrawMapboxGLAdapter } from "./mapbox-gl.adapter";

const createMapboxGLMap = () => {
	return {
		project: jest.fn(() => ({ x: 0, y: 0 }) as any),
		unproject: jest.fn(() => ({ lng: 0, lat: 0 }) as any),
		getCanvas: jest.fn(
			() =>
				({
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
		on: jest.fn(),
		off: jest.fn(),
	} as Partial<mapboxgl.Map>;
};

describe("TerraDrawMapboxGLAdapter", () => {
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

	it("project", () => {
		const map = createMapboxGLMap();
		const adapter = new TerraDrawMapboxGLAdapter({
			map: map as mapboxgl.Map,
		});

		// Test enabling dragging
		adapter.project(0, 0);
		expect(map.project).toHaveBeenCalledTimes(1);
		expect(map.project).toBeCalledWith({ lat: 0, lng: 0 });
	});

	it("unproject", () => {
		const map = createMapboxGLMap();
		const adapter = new TerraDrawMapboxGLAdapter({
			map: map as mapboxgl.Map,
		});

		// Test enabling dragging
		adapter.unproject(0, 0);
		expect(map.unproject).toHaveBeenCalledTimes(1);
		expect(map.unproject).toBeCalledWith({ x: 0, y: 0 });
	});

	it("setCursor", () => {
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

	it("setDoubleClickToZoom", () => {
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
