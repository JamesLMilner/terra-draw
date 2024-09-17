import { TerraDrawOpenLayersAdapter } from "./openlayers.adapter";
import Map from "ol/Map";
import { Pixel } from "ol/pixel";
import { Coordinate } from "ol/coordinate";
import { getMockPointerEvent } from "../test/mock-pointer-event";

jest.mock("ol/style/Circle", () => jest.fn());
jest.mock("ol/style/Fill", () => jest.fn());
jest.mock("ol/style/Stroke", () => jest.fn());
jest.mock("ol/style/Style", () => jest.fn());
jest.mock("ol/geom/Geometry", () => jest.fn());

const createMockOLMap = () => {
	return {
		getCoordinateFromPixel: jest.fn(() => [0, 0] as Pixel),
		getPixelFromCoordinate: jest.fn(() => [0, 0] as Coordinate),
		getViewport: jest.fn(() => ({
			setAttribute: jest.fn(),
			querySelectorAll: jest.fn(() => [
				{
					getBoundingClientRect: jest.fn(() => ({ top: 0, left: 0 })),
				},
			]),
		})),
		addLayer: jest.fn(),
	} as unknown as Map;
};

describe("TerraDrawOpenLayersAdapter", () => {
	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawOpenLayersAdapter({
				map: createMockOLMap(),
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					toLonLat: jest.fn(),
					getUserProjection: jest.fn(),
				} as any,
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
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap() as Map;
		beforeEach(() => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					toLonLat: jest.fn(() => [45, 45]),
					getUserProjection: jest.fn(() => "EPSG:3857"),
				} as any,
			});
		});
		it("getLngLatFromEvent returns correct coordinates", () => {
			const result = adapter.getLngLatFromEvent(getMockPointerEvent());
			expect(result).toEqual({ lat: 45, lng: 45 });
		});
	});

	describe("project", () => {
		it("returns the correct lat lng as expected", () => {
			const map = createMockOLMap() as Map;
			const adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					toLonLat: jest.fn(() => [0, 0]),
					fromLonLat: jest.fn(() => [0, 0]),
					getUserProjection: jest.fn(() => "EPSG:3857"),
				} as any,
			});

			// Test enabling dragging
			adapter.project(0, 0);
			expect(map.getPixelFromCoordinate).toHaveBeenCalledTimes(1);
			expect(map.getPixelFromCoordinate).toHaveBeenCalledWith([0, 0]);
		});
	});

	describe("unproject", () => {
		it("returns the correct x y as expected", () => {
			const map = createMockOLMap() as Map;
			const adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					toLonLat: jest.fn(() => [45, 45]),
					getUserProjection: jest.fn(() => "EPSG:3857"),
				} as any,
			});

			// Test enabling dragging
			adapter.unproject(0, 0);
			expect(map.getCoordinateFromPixel).toHaveBeenCalledTimes(1);
			expect(map.getCoordinateFromPixel).toHaveBeenCalledWith([0, 0]);
		});
	});
});
