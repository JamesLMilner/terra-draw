import { InjectableOL, TerraDrawOpenLayersAdapter } from "./openlayers.adapter";
import Map from "ol/Map";
import { Pixel } from "ol/pixel";
import { Coordinate } from "ol/coordinate";
import { MockPointerEvent } from "../test/mock-pointer-event";
import VectorLayer from "ol/layer/Vector";
import { MockCallbacks } from "../test/mock-callbacks";
import { TerraDrawAdapterStyling } from "../common";

jest.mock("ol/style/Circle", () => jest.fn());
jest.mock("ol/style/Fill", () => jest.fn());
jest.mock("ol/style/Stroke", () => jest.fn());
jest.mock("ol/style/Style", () => jest.fn());
jest.mock("ol/proj", () => ({
	Projection: jest.fn(),
	toLonLat: (arr: number[]) => arr,
	fromLonLat: (arr: number[]) => arr,
}));
jest.mock("ol/geom/Geometry", () => jest.fn());

class DragPan {
	setActive = jest.fn();
}

class DoubleClickZoom {
	setActive = jest.fn();
}

const createMockOLMap = (multipleCanvases?: boolean) => {
	const canvases = [
		{
			getBoundingClientRect: jest.fn(() => ({ top: 0, left: 0 })),
			style: {
				removeProperty: jest.fn(),
			},
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		},
	];

	if (multipleCanvases) {
		canvases.push({ ...canvases[0] });
	}

	return {
		getCoordinateFromPixel: jest.fn(() => [0, 0] as Pixel),
		getPixelFromCoordinate: jest.fn(() => [0, 0] as Coordinate),
		getViewport: jest.fn(() => ({
			setAttribute: jest.fn(),
			querySelectorAll: jest.fn(() => canvases),
		})),
		addLayer: jest.fn(),
		getInteractions: jest.fn(() => [new DragPan(), new DoubleClickZoom()]),
	} as unknown as Map;
};

describe("TerraDrawOpenLayersAdapter", () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawOpenLayersAdapter({
				map: createMockOLMap(),
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
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

		describe("instantiates styles", () => {
			let adapter: TerraDrawOpenLayersAdapter;
			let VectorLayer: jest.Mock<VectorLayer>;

			beforeEach(() => {
				VectorLayer = jest.fn();
				adapter = new TerraDrawOpenLayersAdapter({
					map: createMockOLMap(),
					lib: {
						GeoJSON: jest.fn(),
						VectorSource: jest.fn(),
						VectorLayer,
						Style: jest.fn(() => ({
							clone: jest.fn(),
						})),
						Stroke: jest.fn(),
						Fill: jest.fn(),
						Circle: jest.fn(),
						getUserProjection: jest.fn(),
					} as unknown as InjectableOL,
					minPixelDragDistance: 1,
					minPixelDragDistanceSelecting: 8,
					minPixelDragDistanceDrawing: 8,
					coordinatePrecision: 9,
				});
			});

			it("for Point correctly", () => {
				adapter.render(
					{
						created: [],
						updated: [],
						unchanged: [],
						deletedIds: [],
					},
					{
						point: () => ({}) as unknown as TerraDrawAdapterStyling,
					},
				);

				const styles = VectorLayer.mock.calls[0][0].style;

				expect(styles).toBeDefined();

				const getGeometry = jest.fn(() => ({ getType: () => "Point" }));
				const getProperties = jest.fn(() => ({ mode: "point" }));

				const style = styles({ getGeometry, getProperties });

				expect(style).toEqual({
					clone: expect.any(Function),
				});
			});

			it("for LineString correctly", () => {
				adapter.render(
					{
						created: [],
						updated: [],
						unchanged: [],
						deletedIds: [],
					},
					{
						linestring: () => ({}) as unknown as TerraDrawAdapterStyling,
					},
				);

				const styles = VectorLayer.mock.calls[0][0].style;

				expect(styles).toBeDefined();

				const getGeometry = jest.fn(() => ({ getType: () => "LineString" }));
				const getProperties = jest.fn(() => ({ mode: "linestring" }));

				const style = styles({ getGeometry, getProperties });

				expect(style).toEqual({
					clone: expect.any(Function),
				});
			});

			it("for Polygon correctly", () => {
				adapter.render(
					{
						created: [],
						updated: [],
						unchanged: [],
						deletedIds: [],
					},
					{
						polygon: () =>
							({
								polygonFillColor: "#ffffff",
							}) as unknown as TerraDrawAdapterStyling,
					},
				);

				const styles = VectorLayer.mock.calls[0][0].style;

				expect(styles).toBeDefined();

				const getGeometry = jest.fn(() => ({ getType: () => "Polygon" }));
				const getProperties = jest.fn(() => ({ mode: "polygon" }));

				const style = styles({ getGeometry, getProperties });

				expect(style).toEqual({
					clone: expect.any(Function),
				});
			});

			it("and handles not getting geometry", () => {
				adapter.render(
					{
						created: [],
						updated: [],
						unchanged: [],
						deletedIds: [],
					},
					{
						point: () => ({}) as unknown as TerraDrawAdapterStyling,
					},
				);

				const styles = VectorLayer.mock.calls[0][0].style;

				expect(styles).toBeDefined();

				const getGeometry = jest.fn(() => undefined);
				const getProperties = jest.fn(() => ({ mode: "point" }));

				const style = styles({ getGeometry, getProperties });

				expect(style).toEqual(undefined);
			});
		});
	});

	describe("getLngLatFromEvent", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();
		beforeEach(() => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});
		});

		it("returns correct coordinates", () => {
			// Mock the getCoordinateFromPixel function
			map.getCoordinateFromPixel = jest.fn(() => [0, 0]);

			const result = adapter.getLngLatFromEvent(MockPointerEvent());
			expect(result).toEqual({ lat: 0, lng: 0 });
		});

		it("returns null if unproject fails", () => {
			// Mock the getCoordinateFromPixel function
			map.getCoordinateFromPixel = jest.fn(() => {
				throw new Error();
			});

			const result = adapter.getLngLatFromEvent(MockPointerEvent());
			expect(result).toEqual(null);
		});
	});

	describe("getMapEventElement", () => {
		it("returns the map element correctly", () => {
			const adapter = new TerraDrawOpenLayersAdapter({
				map: createMockOLMap(false) as Map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});

			const result = adapter.getMapEventElement();
			expect(result.getBoundingClientRect).toBeDefined();
		});

		it("throws error if there are multiple canvases", () => {
			const adapter = new TerraDrawOpenLayersAdapter({
				map: createMockOLMap(true) as Map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});

			expect(() => adapter.getMapEventElement()).toThrow(
				"Terra Draw currently only supports 1 canvas with OpenLayers",
			);
		});
	});

	describe("setDraggability", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();
		beforeEach(() => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});
		});
		it("sets the draggability correctly", () => {
			// Mock the getCoordinateFromPixel function
			adapter.setDraggability(true);
			expect(map.getInteractions).toHaveBeenCalledTimes(1);
		});
	});

	describe("setDoubleClickToZoom", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();
		beforeEach(() => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});
		});
		it("sets the draggability correctly", () => {
			// Mock the getCoordinateFromPixel function
			adapter.setDoubleClickToZoom(true);
			expect(map.getInteractions).toHaveBeenCalledTimes(1);
		});
	});

	describe("project", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();
		beforeEach(() => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});
		});
		it("can project point correctly", () => {
			// Mock the getCoordinateFromPixel function
			const result = adapter.project(0, 0);
			expect(result).toEqual({ x: 0, y: 0 });
			expect(map.getPixelFromCoordinate).toHaveBeenCalledTimes(1);
		});
	});

	describe("unproject", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();
		beforeEach(() => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});
		});
		it("can unproject point correctly", () => {
			// Mock the getCoordinateFromPixel function
			const result = adapter.unproject(0, 0);
			expect(result).toEqual({ lng: 0, lat: 0 });
			expect(map.getCoordinateFromPixel).toHaveBeenCalledTimes(1);
		});
	});

	describe("setCursor", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();
		beforeEach(() => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});
		});
		it("can set a cursor correctly without error", () => {
			adapter.setCursor("crosshair");
		});

		it("can unset a cursor correctly without error", () => {
			adapter.setCursor("unset");
		});
	});

	describe("getCoordinatePrecision", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();

		it("can get the default coordinate precision of 9", () => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});

			const result = adapter.getCoordinatePrecision();
			expect(result).toBe(9);
		});

		it("can get the set coordinate precision of 6", () => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
				} as unknown as InjectableOL,
				coordinatePrecision: 6,
			});

			const result = adapter.getCoordinatePrecision();
			expect(result).toBe(6);
		});
	});

	describe("render", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();
		let addFeature: jest.Mock;
		let removeFeature: jest.Mock;
		let getFeatureById: jest.Mock;

		beforeEach(() => {
			addFeature = jest.fn();
			removeFeature = jest.fn();
			getFeatureById = jest.fn();

			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(() => ({
						readFeature: jest.fn(),
					})),
					VectorSource: jest.fn(() => ({
						addFeature,
						removeFeature,
						getFeatureById,
					})),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});
		});

		it("does nothing if no elements are passed", () => {
			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as unknown as TerraDrawAdapterStyling,
				},
			);

			expect(addFeature).not.toHaveBeenCalled();
			expect(removeFeature).not.toHaveBeenCalled();
		});

		it("renders features if they are created", () => {
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
					point: () => ({}) as unknown as TerraDrawAdapterStyling,
					linestring: () => ({}) as unknown as TerraDrawAdapterStyling,
					polygon: () => ({}) as unknown as TerraDrawAdapterStyling,
				},
			);

			expect(addFeature).toHaveBeenCalledTimes(3);
			expect(removeFeature).not.toHaveBeenCalled();
		});

		it("renders features if they are updated", () => {
			getFeatureById.mockImplementationOnce(() => ({}));

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
					],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					point: () => ({}) as unknown as TerraDrawAdapterStyling,
				},
			);

			expect(addFeature).toHaveBeenCalledTimes(1);

			adapter.render(
				{
					created: [],
					updated: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 2],
							},
							properties: {
								mode: "point",
							},
						},
					],
					unchanged: [],
					deletedIds: [],
				},
				{
					point: () => ({}) as unknown as TerraDrawAdapterStyling,
				},
			);

			expect(getFeatureById).toHaveBeenCalledTimes(1);
			expect(addFeature).toHaveBeenCalledTimes(2);
			expect(removeFeature).toHaveBeenCalledTimes(1);
		});

		it("renders features if they are updated", () => {
			getFeatureById.mockImplementationOnce(() => ({}));

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
					],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					point: () => ({}) as unknown as TerraDrawAdapterStyling,
				},
			);

			expect(addFeature).toHaveBeenCalledTimes(1);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: ["1"],
				},
				{
					point: () => ({}) as unknown as TerraDrawAdapterStyling,
				},
			);

			expect(getFeatureById).toHaveBeenCalledTimes(1);
			expect(addFeature).toHaveBeenCalledTimes(1);
			expect(removeFeature).toHaveBeenCalledTimes(1);
		});

		it("handles already removed features if they are updated", () => {
			getFeatureById.mockImplementationOnce(() => undefined);

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
					],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					point: () => ({}) as unknown as TerraDrawAdapterStyling,
				},
			);

			expect(addFeature).toHaveBeenCalledTimes(1);

			adapter.render(
				{
					created: [],
					updated: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 2],
							},
							properties: {
								mode: "point",
							},
						},
					],
					unchanged: [],
					deletedIds: [],
				},
				{
					point: () => ({}) as unknown as TerraDrawAdapterStyling,
				},
			);

			expect(getFeatureById).toHaveBeenCalledTimes(1);
			expect(addFeature).toHaveBeenCalledTimes(2);
			expect(removeFeature).toHaveBeenCalledTimes(0);
		});
	});

	describe("clear", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();
		const clear = jest.fn();

		beforeEach(() => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(() => ({
						readFeature: jest.fn(),
					})),
					VectorSource: jest.fn(() => ({
						clear,
						addFeature: jest.fn(),
					})),
					VectorLayer: jest.fn(),
					getUserProjection: jest.fn(),
				} as unknown as InjectableOL,
			});

			adapter.register(MockCallbacks());
		});

		it("removes layers correctly", () => {
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
					point: () => ({}) as unknown as TerraDrawAdapterStyling,
					linestring: () => ({}) as unknown as TerraDrawAdapterStyling,
					polygon: () => ({}) as unknown as TerraDrawAdapterStyling,
				},
			);

			adapter.clear();

			expect(clear).toHaveBeenCalledTimes(1);
		});
	});

	describe("register", () => {
		it("calls onReady call back when complete", () => {
			const map = createMockOLMap();

			const adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(() => ({
						readFeature: jest.fn(),
					})),
					VectorSource: jest.fn(() => ({})),
					VectorLayer: jest.fn(),
				} as unknown as InjectableOL,
			});

			const adapterCallbacks = MockCallbacks();
			adapter.register(adapterCallbacks);

			expect(adapterCallbacks.onReady).toHaveBeenCalledTimes(1);
		});
	});

	describe("unregister", () => {
		let adapter: TerraDrawOpenLayersAdapter;
		const map = createMockOLMap();
		const clear = jest.fn();

		beforeEach(() => {
			adapter = new TerraDrawOpenLayersAdapter({
				map,
				lib: {
					GeoJSON: jest.fn(() => ({
						readFeature: jest.fn(),
					})),
					VectorSource: jest.fn(() => ({
						clear,
						addFeature: jest.fn(),
					})),
					VectorLayer: jest.fn(),
				} as unknown as InjectableOL,
			});

			adapter.register(MockCallbacks());
		});

		it("performs clear on unregister", () => {
			adapter.register(MockCallbacks());
			adapter.unregister();

			expect(clear).toHaveBeenCalledTimes(1);
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
