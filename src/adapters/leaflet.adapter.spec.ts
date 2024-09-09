/**
 * @jest-environment jsdom
 */
import { TerraDrawLeafletAdapter } from "./leaflet.adapter";
import { getMockPointerEvent } from "../test/mock-pointer-event";
import { TerraDrawAdapterStyling, TerraDrawCallbacks } from "../common";
import { GeoJSONStoreFeatures } from "../terra-draw";

const callbacks = () =>
	({
		getState: jest.fn(() => "started"),
		onKeyUp: jest.fn(),
		onKeyDown: jest.fn(),
		onClick: jest.fn(),
		onMouseMove: jest.fn(),
		onDragStart: jest.fn(),
		onDrag: jest.fn(),
		onDragEnd: jest.fn(),
		onClear: jest.fn(),
		onReady: jest.fn(),
	}) as TerraDrawCallbacks;

const createLeafletMap = () => {
	return {
		getContainer: jest.fn(
			() =>
				({
					getBoundingClientRect: jest.fn(() => ({ top: 0, left: 0 })),
					style: { removeProperty: jest.fn(), cursor: "initial" },
					addEventListener: jest.fn(),
					removeEventListener: jest.fn(),
				}) as any,
		),
		latLngToContainerPoint: jest.fn(() => ({ x: 0, y: 0 }) as any),
		containerPointToLatLng: jest.fn(() => ({ lng: 0, lat: 0 }) as any),
		doubleClickZoom: {
			enable: jest.fn(),
			disable: jest.fn(),
			enabled: jest.fn(),
		},
		dragging: { enable: jest.fn(), disable: jest.fn(), enabled: jest.fn() },
		on: jest.fn(),
		off: jest.fn(),
		createPane: jest.fn(),
		getPane: jest.fn(),
		removeLayer: jest.fn(),
		addLayer: jest.fn(),
	} as Partial<L.Map>;
};

describe("TerraDrawLeafletAdapter", () => {
	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawLeafletAdapter({
				lib: {
					circleMarker: jest.fn(),
					geoJSON: jest.fn(),
				} as any,
				map: createLeafletMap() as L.Map,
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
		let adapter: TerraDrawLeafletAdapter;
		const map = createLeafletMap() as L.Map;
		beforeEach(() => {
			adapter = new TerraDrawLeafletAdapter({
				lib: {
					circleMarker: jest.fn(),
					geoJSON: jest.fn(),
				} as any,
				map,
			});
		});
		it("getLngLatFromEvent returns correct coordinates", () => {
			// Mock the containerPointToLatLng function
			map.containerPointToLatLng = jest.fn(() => ({
				lat: 51.507222,
				lng: -0.1275,
			})) as unknown as (point: L.PointExpression) => L.LatLng;

			const result = adapter.getLngLatFromEvent(getMockPointerEvent());
			expect(result).toEqual({ lat: 51.507222, lng: -0.1275 });
		});

		it("getLngLatFromEvent handles null returns from containerPointToLatLng correctly", () => {
			// Mock the containerPointToLatLng function
			map.containerPointToLatLng = jest.fn(() => ({
				lat: null,
				lng: -0.1275,
			})) as unknown as (point: L.PointExpression) => L.LatLng;

			const result = adapter.getLngLatFromEvent(getMockPointerEvent());
			expect(result).toEqual(null);
		});
	});

	describe("setDraggability", () => {
		it("setDraggability enables and disables map dragging", () => {
			const map = createLeafletMap() as L.Map;

			// Create the adapter instance with the mocked map
			const adapter = new TerraDrawLeafletAdapter({
				lib: {} as any,
				map,
				coordinatePrecision: 9,
			});

			// Test enabling dragging
			adapter.setDraggability(true);
			expect(map.dragging.enable).toHaveBeenCalledTimes(1);
			expect(map.dragging.disable).toHaveBeenCalledTimes(0);

			// Test disabling dragging
			adapter.setDraggability(false);
			expect(map.dragging.enable).toHaveBeenCalledTimes(1);
			expect(map.dragging.disable).toHaveBeenCalledTimes(1);
		});
	});

	it("project", () => {
		const map = createLeafletMap() as L.Map;

		// Create the adapter instance with the mocked map
		const adapter = new TerraDrawLeafletAdapter({
			lib: {} as any,
			map,
			coordinatePrecision: 9,
		});

		// Test enabling dragging
		adapter.project(0, 0);
		expect(map.latLngToContainerPoint).toHaveBeenCalledTimes(1);
		expect(map.latLngToContainerPoint).toHaveBeenCalledWith({ lat: 0, lng: 0 });
	});

	it("unproject", () => {
		const map = createLeafletMap() as L.Map;

		// Create the adapter instance with the mocked map
		const adapter = new TerraDrawLeafletAdapter({
			lib: {} as any,
			map,
			coordinatePrecision: 9,
		});

		// Test enabling dragging
		adapter.unproject(0, 0);
		expect(map.containerPointToLatLng).toHaveBeenCalledTimes(1);
		expect(map.containerPointToLatLng).toHaveBeenCalledWith({ x: 0, y: 0 });
	});

	it("setCursor", () => {
		const map = createLeafletMap() as L.Map;
		const container = {
			offsetLeft: 0,
			offsetTop: 0,
			style: { removeProperty: jest.fn(), cursor: "initial" },
		} as any;

		map.getContainer = jest.fn(() => container);

		// Create the adapter instance with the mocked map
		const adapter = new TerraDrawLeafletAdapter({
			lib: {} as any,
			map,
			coordinatePrecision: 9,
		});

		adapter.setCursor("unset");

		expect(map.getContainer).toHaveBeenCalledTimes(1);
		expect(container.style.removeProperty).toHaveBeenCalledTimes(1);

		adapter.setCursor("pointer");

		expect(map.getContainer).toHaveBeenCalledTimes(1);
		expect(container.style.cursor).toBe("pointer");
	});

	it("setDoubleClickToZoom", () => {
		const map = createLeafletMap() as L.Map;

		// Create the adapter instance with the mocked map
		const adapter = new TerraDrawLeafletAdapter({
			lib: {} as any,
			map,
			coordinatePrecision: 9,
		});

		adapter.setDoubleClickToZoom(true);

		expect(map.doubleClickZoom.enable).toHaveBeenCalledTimes(1);

		adapter.setDoubleClickToZoom(false);

		expect(map.doubleClickZoom.disable).toHaveBeenCalledTimes(1);
	});

	describe("render", () => {
		beforeEach(() => {
			jest.restoreAllMocks();
		});

		it("does nothing if no features are passed", () => {
			const map = createLeafletMap() as L.Map;

			// Create the adapter instance with the mocked map
			const adapter = new TerraDrawLeafletAdapter({
				lib: {} as any,
				map,
				coordinatePrecision: 9,
			});

			adapter.render(
				{ unchanged: [], created: [], deletedIds: [], updated: [] },
				{
					test: () => ({}) as any,
				},
			);
		});

		it("handles unchanged, created, deletedIds and updated", () => {
			const map = createLeafletMap() as L.Map;

			// Create the adapter instance with the mocked map
			const lib = {
				geoJSON: jest.fn(),
			} as any;

			const adapter = new TerraDrawLeafletAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});

			adapter.render(
				{
					unchanged: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [0, 0],
							},
							properties: {
								mode: "test",
							},
						},
					],
					created: [
						{
							id: "2",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 1],
							},
							properties: {
								mode: "test",
							},
						},
					],
					deletedIds: ["3"],
					updated: [
						{
							id: "4",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [2, 2],
							},
							properties: {
								mode: "test",
							},
						},
					],
				},
				{
					test: () => ({}) as any,
				},
			);

			expect(lib.geoJSON).toHaveBeenCalledTimes(2);
			expect(map.addLayer).toHaveBeenCalledTimes(2); // 1 for created 1 for updated
			expect(map.removeLayer).toHaveBeenCalledTimes(2); // 1 for update 1 for delete
		});

		it("handles pointToLayer", () => {
			const mockCreateElement = jest.spyOn(document, "createElement");

			const map = createLeafletMap() as L.Map;

			const marker = {};

			// Create the adapter instance with the mocked map
			const lib = {
				circleMarker: jest.fn(() => marker),
				geoJSON: jest.fn(),
			} as any;

			const adapter = new TerraDrawLeafletAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});

			const point = {
				id: "1",
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [1, 1],
				},
				properties: {
					mode: "point",
				},
			} as GeoJSONStoreFeatures;

			const styling = {
				pointWidth: 2,
				pointOutlineWidth: 1,
				pointOutlineColor: "#ffffff",
				fillOpacity: 0.8,
				pointColor: "#ffffff",
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonFillOpacity: 1,
				polygonOutlineWidth: 1,
				lineStringWidth: 1,
				lineStringColor: "#ffffff",
				zIndex: 1,
			} as TerraDrawAdapterStyling;

			adapter.render(
				{
					unchanged: [],
					created: [point],
					deletedIds: [],
					updated: [],
				},
				{
					point: () => styling,
					linestring: () => styling,
					polygon: () => styling,
				},
			);

			expect(lib.geoJSON).toHaveBeenCalledTimes(1);
			const pointToLayer = lib.geoJSON.mock.calls[0][1].pointToLayer;
			expect(pointToLayer).toBeDefined();
			const result = pointToLayer(point);
			expect(mockCreateElement).toHaveBeenCalledTimes(1);
			expect(result).toEqual(marker);
		});

		it("handles pointToLayer with no properties", () => {
			const map = createLeafletMap() as L.Map;

			const marker = {};

			// Create the adapter instance with the mocked map
			const lib = {
				circleMarker: jest.fn(() => marker),
				geoJSON: jest.fn(),
			} as any;

			const adapter = new TerraDrawLeafletAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});

			const point = {
				id: "1",
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [1, 1],
				},
			} as GeoJSONStoreFeatures;

			const styling = {
				pointWidth: 2,
				pointOutlineWidth: 1,
				pointOutlineColor: "#ffffff",
				fillOpacity: 0.8,
				pointColor: "#ffffff",
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonFillOpacity: 1,
				polygonOutlineWidth: 1,
				lineStringWidth: 1,
				lineStringColor: "#ffffff",
				zIndex: 1,
			} as TerraDrawAdapterStyling;

			adapter.render(
				{
					unchanged: [],
					created: [point],
					deletedIds: [],
					updated: [],
				},
				{
					point: () => styling,
					linestring: () => styling,
					polygon: () => styling,
				},
			);

			const pointToLayer = lib.geoJSON.mock.calls[0][1].pointToLayer;

			expect(() => pointToLayer(point)).toThrow();
		});

		it("handles pointToLayer with no mode", () => {
			const map = createLeafletMap() as L.Map;

			const marker = {};

			// Create the adapter instance with the mocked map
			const lib = {
				circleMarker: jest.fn(() => marker),
				geoJSON: jest.fn(),
			} as any;

			const adapter = new TerraDrawLeafletAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});

			const point = {
				id: "1",
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [1, 1],
				},
				properties: {},
			} as GeoJSONStoreFeatures;

			const styling = {
				pointWidth: 2,
				pointOutlineWidth: 1,
				pointOutlineColor: "#ffffff",
				fillOpacity: 0.8,
				pointColor: "#ffffff",
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonFillOpacity: 1,
				polygonOutlineWidth: 1,
				lineStringWidth: 1,
				lineStringColor: "#ffffff",
				zIndex: 1,
			} as TerraDrawAdapterStyling;

			adapter.render(
				{
					unchanged: [],
					created: [point],
					deletedIds: [],
					updated: [],
				},
				{
					point: () => styling,
					linestring: () => styling,
					polygon: () => styling,
				},
			);
			const pointToLayer = lib.geoJSON.mock.calls[0][1].pointToLayer;

			expect(() => pointToLayer(point)).toThrow();
		});

		it("handles style", () => {
			const mockCreateElement = jest.spyOn(document, "createElement");

			const map = createLeafletMap() as L.Map;

			const marker = {};

			// Create the adapter instance with the mocked map
			const lib = {
				circleMarker: jest.fn(() => marker),
				geoJSON: jest.fn(),
			} as any;

			const adapter = new TerraDrawLeafletAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});

			const linestring = {
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
			} as GeoJSONStoreFeatures;

			const polygon = {
				id: "3",
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						],
					],
				},
				properties: {
					mode: "polygon",
				},
			} as GeoJSONStoreFeatures;

			const styling = {
				pointWidth: 2,
				pointOutlineWidth: 1,
				pointOutlineColor: "#ffffff",
				fillOpacity: 0.8,
				pointColor: "#ffffff",
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonFillOpacity: 1,
				polygonOutlineWidth: 1,
				lineStringWidth: 1,
				lineStringColor: "#ffffff",
				zIndex: 1,
			} as TerraDrawAdapterStyling;

			adapter.register(callbacks());

			adapter.render(
				{
					unchanged: [],
					created: [linestring, polygon],
					deletedIds: [],
					updated: [],
				},
				{
					linestring: () => styling,
					polygon: () => styling,
				},
			);

			const styleLineString = lib.geoJSON.mock.calls[0][1].style;
			expect(styleLineString).toBeDefined();
			const styleLineStringResult = styleLineString(linestring);
			expect(mockCreateElement).toHaveBeenCalledTimes(1);
			expect(styleLineStringResult).toEqual({
				color: "#ffffff",
				interactive: false,
				pane: "1",
				weight: 1,
			});

			const stylePolygon = lib.geoJSON.mock.calls[0][1].style;
			expect(stylePolygon).toBeDefined();
			const stylePolygonResult = stylePolygon(polygon);
			expect(mockCreateElement).toHaveBeenCalledTimes(1);
			expect(stylePolygonResult).toEqual({
				color: "#ffffff",
				fillColor: "#ffffff",
				fillOpacity: 1,
				interactive: false,
				pane: "1",
				weight: 1,
				stroke: true,
			});

			adapter.clear();
		});

		it("handles style returns empty object for feature without properties", () => {
			const map = createLeafletMap() as L.Map;

			const marker = {};

			// Create the adapter instance with the mocked map
			const lib = {
				circleMarker: jest.fn(() => marker),
				geoJSON: jest.fn(),
			} as any;

			const adapter = new TerraDrawLeafletAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});

			const linestring = {
				id: "2",
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: [
						[0, 0],
						[1, 1],
					],
				},
			} as GeoJSONStoreFeatures;

			const styling = {
				pointWidth: 2,
				pointOutlineWidth: 1,
				pointOutlineColor: "#ffffff",
				fillOpacity: 0.8,
				pointColor: "#ffffff",
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonFillOpacity: 1,
				polygonOutlineWidth: 1,
				lineStringWidth: 1,
				lineStringColor: "#ffffff",
				zIndex: 1,
			} as TerraDrawAdapterStyling;

			adapter.register(callbacks());

			adapter.render(
				{
					unchanged: [],
					created: [linestring],
					deletedIds: [],
					updated: [],
				},
				{
					linestring: () => styling,
				},
			);

			const styleLineString = lib.geoJSON.mock.calls[0][1].style;

			expect(styleLineString(linestring)).toEqual({});
		});

		it("handles style returns empty object for feature geometry type which is unsupported", () => {
			const map = createLeafletMap() as L.Map;

			const marker = {};

			// Create the adapter instance with the mocked map
			const lib = {
				circleMarker: jest.fn(() => marker),
				geoJSON: jest.fn(),
			} as any;

			const adapter = new TerraDrawLeafletAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});

			const linestring = {
				id: "2",
				type: "Feature",
				geometry: {
					type: "MultiLineString",
					coordinates: [
						[0, 0],
						[1, 1],
					],
				},
				properties: {
					mode: "linestring",
				},
			} as unknown as GeoJSONStoreFeatures;

			const styling = {
				pointWidth: 2,
				pointOutlineWidth: 1,
				pointOutlineColor: "#ffffff",
				fillOpacity: 0.8,
				pointColor: "#ffffff",
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonFillOpacity: 1,
				polygonOutlineWidth: 1,
				lineStringWidth: 1,
				lineStringColor: "#ffffff",
				zIndex: 1,
			} as TerraDrawAdapterStyling;

			adapter.register(callbacks());

			adapter.render(
				{
					unchanged: [],
					created: [linestring],
					deletedIds: [],
					updated: [],
				},
				{
					linestring: () => styling,
				},
			);

			const styleLineString = lib.geoJSON.mock.calls[0][1].style;

			expect(styleLineString(linestring)).toEqual({});
		});
	});

	describe("clear", () => {
		it("removes the layers from the map correctl", () => {
			const map = createLeafletMap() as L.Map;

			// Create the adapter instance with the mocked map
			const lib = {
				geoJSON: jest.fn(),
			} as any;

			// Create the adapter instance with the mocked map
			const adapter = new TerraDrawLeafletAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});

			adapter.register(callbacks());

			adapter.render(
				{
					unchanged: [],
					created: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 1],
							},
							properties: {
								mode: "test",
							},
						},
					],
					deletedIds: [],
					updated: [],
				},
				{
					test: () => ({}) as any,
				},
			);

			adapter.clear();

			expect(map.removeLayer).toHaveBeenCalledTimes(1);
		});
	});

	describe("getCoodinatePrecision", () => {
		it("returns the default coordinate precision of 9", () => {
			const adapter = new TerraDrawLeafletAdapter({
				lib: {} as any,
				map: createLeafletMap() as L.Map,
			});

			expect(adapter.getCoordinatePrecision()).toBe(9);
		});

		it("returns the set coordinate precision of 6", () => {
			const adapter = new TerraDrawLeafletAdapter({
				lib: {} as any,
				map: createLeafletMap() as L.Map,
				coordinatePrecision: 6,
			});

			expect(adapter.getCoordinatePrecision()).toBe(6);
		});
	});

	describe("register", () => {
		it("calls onReady call back when complete", () => {
			const adapter = new TerraDrawLeafletAdapter({
				lib: {} as any,
				map: createLeafletMap() as L.Map,
				coordinatePrecision: 6,
			});

			const adapterCallbacks = callbacks();

			adapter.register(adapterCallbacks);

			expect(adapterCallbacks.onReady).toHaveBeenCalledTimes(1);
		});
	});

	describe("unregister", () => {
		it("can be called without error", () => {
			const adapter = new TerraDrawLeafletAdapter({
				lib: {} as any,
				map: createLeafletMap() as L.Map,
			});

			adapter.unregister();
		});

		it("clears the map when features have been rendered", () => {
			const map = createLeafletMap() as L.Map;
			const adapter = new TerraDrawLeafletAdapter({
				lib: {
					geoJSON: jest.fn(),
				} as any,
				map,
			});

			adapter.register(callbacks());

			adapter.render(
				{
					unchanged: [],
					created: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 1],
							},
							properties: {
								mode: "test",
							},
						},
					],
					deletedIds: [],
					updated: [],
				},
				{
					test: () => ({}) as any,
				},
			);

			adapter.clear();

			expect(map.removeLayer).toHaveBeenCalledTimes(1);
		});
	});
});
