import { TerraDrawArcGISMapsSDKAdapter } from "./arcgis-maps-sdk.adapter";
import MapView from "@arcgis/core/views/MapView.js";
import { getMockPointerEvent } from "../test/mock-pointer-event";
import Point from "@arcgis/core/geometry/Point";
import { TerraDrawLeafletAdapter } from "./leaflet.adapter";
import MapViewScreenPoint = __esri.MapViewScreenPoint;

jest.mock("@arcgis/core/views/MapView", () => jest.fn());
jest.mock("@arcgis/core/geometry/Point");
jest.mock("@arcgis/core/geometry/Polyline", () => jest.fn());
jest.mock("@arcgis/core/geometry/Polygon", () => jest.fn());
jest.mock("@arcgis/core/layers/GraphicsLayer");

const createMockEsriMapView = () => {
	return {
		map: {
			add: jest.fn(),
		},
		container: {
			getBoundingClientRect: jest.fn(() => ({ top: 0, left: 0 })),
			style: { removeProperty: jest.fn(), cursor: "initial" },
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		} as any,
		getViewport: jest.fn(() => ({
			setAttribute: jest.fn(),
		})),
		toScreen: jest.fn(() => ({ x: 0, y: 0 })),
		toMap: jest.fn((point) => ({ latitude: 0, longitude: 0 })),
		on: jest.fn(),
	} as unknown as MapView;
};

describe("TerraDrawArcGISMapsSDKAdapter", () => {
	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawArcGISMapsSDKAdapter({
				map: createMockEsriMapView(),
				lib: {
					GraphicsLayer: jest.fn(),
				} as any,
			});

			expect(adapter).toBeDefined();
			expect(adapter.getMapContainer).toBeDefined();
			expect(adapter.render).toBeDefined();
			expect(adapter.register).toBeDefined();
			expect(adapter.unregister).toBeDefined();
			expect(adapter.project).toBeDefined();
			expect(adapter.unproject).toBeDefined();
			expect(adapter.setCursor).toBeDefined();
		});
	});

	describe("getLngLatFromEvent", () => {
		let adapter: TerraDrawArcGISMapsSDKAdapter;
		const map = createMockEsriMapView();
		beforeEach(() => {
			adapter = new TerraDrawArcGISMapsSDKAdapter({
				map: map,
				lib: {
					GraphicsLayer: jest.fn(),
				} as any,
			});
		});
		it("getLngLatFromEvent returns correct coordinates", () => {
			map.toMap = jest.fn(() => ({
				latitude: 51.507222,
				longitude: -0.1275,
			})) as unknown as (point: MapViewScreenPoint | MouseEvent) => Point;

			const result = adapter.getLngLatFromEvent(getMockPointerEvent());
			expect(result).toEqual({ lat: 51.507222, lng: -0.1275 });
		});
	});

	describe("getMapContainer", () => {
		let adapter: TerraDrawArcGISMapsSDKAdapter;
		const map = createMockEsriMapView();
		beforeEach(() => {
			adapter = new TerraDrawArcGISMapsSDKAdapter({
				map: map,
				lib: {
					GraphicsLayer: jest.fn(),
				} as any,
			});
		});

		it("returns the container", () => {
			const container = adapter.getMapContainer();
			expect(container.getBoundingClientRect).toBeDefined();
		});
	});

	describe("draggability and zoom handling", () => {
		it("setDraggability enables and disables map dragging", () => {
			// todo: test initializers
			const map = createMockEsriMapView();
			const adapter = new TerraDrawArcGISMapsSDKAdapter({
				lib: {
					GraphicsLayer: jest.fn(),
				} as any,
				map,
				coordinatePrecision: 9,
			});

			// Test enabling dragging
			adapter.setDraggability(true);
			expect(adapter["_dragEnabled"]).toEqual(true);

			// Test disabling dragging
			adapter.setDraggability(false);
			expect(adapter["_dragEnabled"]).toEqual(false);
		});

		it("setDoubleClickToZoom enables and disables map zoom with double click", () => {
			const map = createMockEsriMapView();
			const adapter = new TerraDrawArcGISMapsSDKAdapter({
				lib: {
					GraphicsLayer: jest.fn(),
				} as any,
				map,
				coordinatePrecision: 9,
			});

			adapter.setDoubleClickToZoom(true);
			expect(adapter["_zoomEnabled"]).toEqual(true);

			adapter.setDoubleClickToZoom(false);
			expect(adapter["_zoomEnabled"]).toEqual(false);
		});
	});

	describe("projection", () => {
		it("project", () => {
			const map = createMockEsriMapView();
			const mockPointImplementation = jest.fn().mockReturnValue({ x: 0, y: 0 }); // mock a return value for point to check for correct calling
			const adapter = new TerraDrawArcGISMapsSDKAdapter({
				lib: {
					GraphicsLayer: jest.fn(),
					Point: mockPointImplementation,
				} as any,
				map,
				coordinatePrecision: 9,
			});

			adapter.project(0, 0);
			expect(mockPointImplementation).toBeCalledWith({
				latitude: 0,
				longitude: 0,
			});
			expect(map.toScreen).toHaveBeenCalledTimes(1);
			expect(map.toScreen).toBeCalledWith({ x: 0, y: 0 });
		});

		it("unproject", () => {
			const map = createMockEsriMapView();
			const adapter = new TerraDrawArcGISMapsSDKAdapter({
				lib: {
					GraphicsLayer: jest.fn(),
				} as any,
				map,
				coordinatePrecision: 9,
			});

			// Test enabling dragging
			adapter.unproject(0, 0);
			expect(map.toMap).toHaveBeenCalledTimes(1);
			expect(map.toMap).toBeCalledWith({ x: 0, y: 0 });
		});
	});

	it("setCursor", () => {
		const map = createMockEsriMapView();
		const container = {
			offsetLeft: 0,
			offsetTop: 0,
			style: { removeProperty: jest.fn(), cursor: "initial" },
		} as any;

		map.container = container;
		const adapter = new TerraDrawArcGISMapsSDKAdapter({
			lib: {
				GraphicsLayer: jest.fn(),
			} as any,
			map,
			coordinatePrecision: 9,
		});

		adapter.setCursor("unset");
		expect(container.style.removeProperty).toHaveBeenCalledTimes(1);

		adapter.setCursor("pointer");
		expect(container.style.cursor).toBe("pointer");
	});
});
