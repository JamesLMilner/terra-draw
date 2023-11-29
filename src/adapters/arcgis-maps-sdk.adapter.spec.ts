import { TerraDrawArcGISMapsSDKAdapter } from "./arcgis-maps-sdk.adapter";
import MapView from "@arcgis/core/views/MapView.js";
import { getMockPointerEvent } from "../test/mock-pointer-event";
import Point from "@arcgis/core/geometry/Point";
import { TerraDrawAdapterStyling } from "../common";
import Color from "@arcgis/core/Color";
import MapViewScreenPoint = __esri.MapViewScreenPoint;
import { createMockCallbacks } from "../test/mock-callbacks";

jest.mock("@arcgis/core/views/MapView", () => jest.fn());
jest.mock("@arcgis/core/geometry/Point");
jest.mock("@arcgis/core/geometry/Polyline", () => jest.fn());
jest.mock("@arcgis/core/geometry/Polygon", () => jest.fn());
jest.mock("@arcgis/core/layers/GraphicsLayer");

const remove = jest.fn();

const createMockEsriMapView = () => {
	return {
		map: {
			add: jest.fn(),
		},
		container: {
			querySelector: jest.fn(() => ({
				style: { removeProperty: jest.fn(), cursor: "initial" },
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
				getBoundingClientRect: jest.fn(() => ({ top: 0, left: 0 })),
			})),
		} as any,
		getViewport: jest.fn(() => ({
			setAttribute: jest.fn(),
		})),
		toScreen: jest.fn(() => ({ x: 0, y: 0 })),
		toMap: jest.fn(() => ({ latitude: 0, longitude: 0 })),
		on: jest.fn(() => ({ remove })),
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
			expect(adapter.getMapEventElement).toBeDefined();
			expect(adapter.render).toBeDefined();
			expect(adapter.register).toBeDefined();
			expect(adapter.unregister).toBeDefined();
			expect(adapter.project).toBeDefined();
			expect(adapter.unproject).toBeDefined();
			expect(adapter.setCursor).toBeDefined();
		});

		it("initializes a GraphicsLayer with the internal ID and adds it to the mapView", () => {
			const mockGraphicsLayer = { id: "xx" };
			const lib = {
				GraphicsLayer: jest.fn().mockReturnValue(mockGraphicsLayer),
			} as any;
			const mockMapView = createMockEsriMapView();
			const adapter = new TerraDrawArcGISMapsSDKAdapter({
				map: mockMapView,
				lib,
			});

			expect(lib.GraphicsLayer).toHaveBeenCalledTimes(1);
			expect(lib.GraphicsLayer).toHaveBeenCalledWith({
				id: adapter["_featureLayerName"],
			});
			expect(mockMapView.map.add).toHaveBeenCalledTimes(1);
			expect(mockMapView.map.add).toHaveBeenCalledWith(mockGraphicsLayer);
		});
	});

	describe("register", () => {
		it("adds drag and double-click event listeners", () => {
			const mockMapView = createMockEsriMapView();
			const adapter = new TerraDrawArcGISMapsSDKAdapter({
				map: mockMapView,
				lib: {
					GraphicsLayer: jest.fn(),
				} as any,
			});

			expect(adapter).toBeDefined();

			adapter.register(createMockCallbacks());

			expect(mockMapView.on).toHaveBeenCalledTimes(2);
			expect(mockMapView.on).toHaveBeenNthCalledWith(
				1,
				"drag",
				expect.any(Function),
			);
			expect(mockMapView.on).toHaveBeenNthCalledWith(
				2,
				"double-click",
				expect.any(Function),
			);
		});
	});

	describe("unregister", () => {
		it("removes drag and double-click event listeners", () => {
			const mockMapView = createMockEsriMapView();
			const removeAll = jest.fn();
			const adapter = new TerraDrawArcGISMapsSDKAdapter({
				map: mockMapView,
				lib: {
					GraphicsLayer: jest.fn(() => ({ graphics: { removeAll } })),
				} as any,
			});

			expect(adapter).toBeDefined();

			adapter.register(createMockCallbacks());
			adapter.unregister();
			expect(removeAll).toBeCalledTimes(1);
			expect(remove).toBeCalledTimes(2);
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
		};

		map.container = {
			querySelector: jest.fn(() => container),
		} as any;
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

	it("clear", () => {
		const graphicsMock = {
			removeAll: jest.fn(),
		};
		const map = createMockEsriMapView();
		const adapter = new TerraDrawArcGISMapsSDKAdapter({
			lib: {
				GraphicsLayer: jest.fn(() => ({ graphics: graphicsMock })),
			} as any,
			map,
			coordinatePrecision: 9,
		});

		adapter.clear();
		expect(graphicsMock.removeAll).toHaveBeenCalledTimes(1);
	});

	describe("render", () => {
		// set up the correct mocks such that we can later check whether the esri api has been called correctly
		let map: MapView;
		let adapter: TerraDrawArcGISMapsSDKAdapter;
		let lib: any;
		let mockedGraphicCall: any;
		let mockedFeature: any;
		let graphicsMock: any;
		let removeMock: any;
		beforeEach(() => {
			map = createMockEsriMapView();
			mockedGraphicCall = { x: 0, y: 0 };
			mockedFeature = { x: 0, y: 0 };
			graphicsMock = {
				add: jest.fn(),
				find: jest.fn().mockReturnValue(mockedFeature),
			};
			removeMock = jest.fn();
			lib = {
				GraphicsLayer: jest.fn(() => ({
					graphics: graphicsMock,
					remove: removeMock,
				})),
				Point: jest.fn(),
				Polyline: jest.fn(),
				Polygon: jest.fn(),
				SimpleMarkerSymbol: jest.fn(),
				SimpleLineSymbol: jest.fn(),
				SimpleFillSymbol: jest.fn(),
				Graphic: jest.fn().mockReturnValue(mockedGraphicCall),
				Color: { fromHex: jest.fn() },
			} as any;
			adapter = new TerraDrawArcGISMapsSDKAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});
		});

		it("does nothing if no features are passed", () => {
			adapter.render(
				{ unchanged: [], created: [], deletedIds: [], updated: [] },
				{
					test: () => ({}) as any,
				},
			);
		});

		it("handles created ids", () => {
			adapter.render(
				{
					unchanged: [],
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
					deletedIds: [],
					updated: [],
				},
				{
					test: () => ({}) as any,
				},
			);

			expect(graphicsMock.add).toBeCalledTimes(1);
			expect(graphicsMock.add).toHaveBeenLastCalledWith(mockedGraphicCall);
			expect(removeMock).not.toBeCalled();
		});

		it("handles updated ids", () => {
			adapter.render(
				{
					unchanged: [],
					created: [],
					deletedIds: [],
					updated: [
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
				},
				{
					test: () => ({}) as any,
				},
			);

			expect(graphicsMock.find).toHaveBeenCalledTimes(1);
			expect(removeMock).toHaveBeenCalledTimes(1);
			expect(removeMock).toHaveBeenLastCalledWith(mockedFeature);
			expect(graphicsMock.add).toBeCalledTimes(1);
			expect(graphicsMock.add).toHaveBeenLastCalledWith(mockedGraphicCall);
		});

		it("handles deleted ids", () => {
			adapter.render(
				{
					unchanged: [],
					created: [],
					deletedIds: ["42"],
					updated: [],
				},
				{
					test: () => ({}) as any,
				},
			);

			expect(graphicsMock.find).toHaveBeenCalledTimes(1);
			expect(removeMock).toHaveBeenCalledTimes(1);
			expect(removeMock).toHaveBeenCalledWith(mockedFeature);
			expect(graphicsMock.add).not.toBeCalled();
		});

		describe("point", () => {
			it("creates a point at the specified location with the point's id", () => {
				const testCoordinates = [1, 2];
				const testId = "1";
				adapter.render(
					{
						unchanged: [],
						created: [
							{
								id: testId,
								type: "Feature",
								geometry: {
									type: "Point",
									coordinates: testCoordinates,
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

				expect(lib.Point).toHaveBeenCalledWith({
					longitude: testCoordinates[0],
					latitude: testCoordinates[1],
				});
				expect(lib.Graphic).toHaveBeenCalledWith(
					expect.objectContaining({
						attributes: { [adapter["_featureIdAttributeName"]]: testId },
					}),
				);
			});

			it("symbolizes the point correctly", () => {
				const mockColor = { r: 0, g: 0, b: 0, a: 0 } as Color;
				lib.Color.fromHex.mockReturnValue(mockColor);
				const testStyling: TerraDrawAdapterStyling = {
					pointOutlineWidth: 2,
					pointColor: "#FFFFFF",
					pointWidth: 4,
					pointOutlineColor: "#000000",
				} as unknown as TerraDrawAdapterStyling;
				adapter.render(
					{
						unchanged: [],
						created: [
							{
								id: "2",
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
						deletedIds: [],
						updated: [],
					},
					{
						test: () => testStyling as TerraDrawAdapterStyling,
					},
				);

				const expected = {
					color: mockColor,
					outline: {
						color: mockColor,
						width: `${testStyling.pointOutlineWidth}px`,
					},
					size: `${2 * testStyling.pointWidth}px`, // since the width is doubled for Esri points
				};

				expect(lib.SimpleMarkerSymbol).toHaveBeenCalledWith(expected);
			});

			it("adds point at highest index", () => {
				adapter.render(
					{
						unchanged: [],
						created: [
							{
								id: "2",
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
						deletedIds: [],
						updated: [],
					},
					{
						test: () => ({}) as any,
					},
				);

				expect(graphicsMock.add).toHaveBeenCalledWith(mockedGraphicCall);
			});
		});

		describe("linestring", () => {
			it("creates a linestring with the specified coordinates with the linestring's id", () => {
				const testCoordinates = [
					[1, 2],
					[3, 4],
				];
				const testId = "1";
				adapter.render(
					{
						unchanged: [],
						created: [
							{
								id: testId,
								type: "Feature",
								geometry: {
									type: "LineString",
									coordinates: testCoordinates,
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

				expect(lib.Polyline).toHaveBeenCalledWith({ paths: [testCoordinates] });
				expect(lib.Graphic).toHaveBeenCalledWith(
					expect.objectContaining({
						attributes: { [adapter["_featureIdAttributeName"]]: testId },
					}),
				);
			});

			it("symbolizes the linestring correctly", () => {
				const mockColor = { r: 0, g: 0, b: 0, a: 0 } as Color;
				lib.Color.fromHex.mockReturnValue(mockColor);
				const testStyling: TerraDrawAdapterStyling = {
					lineStringWidth: 3,
					lineStringColor: "#000000",
				} as unknown as TerraDrawAdapterStyling;
				adapter.render(
					{
						unchanged: [],
						created: [
							{
								id: "2",
								type: "Feature",
								geometry: {
									type: "LineString",
									coordinates: [[0, 0]],
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
						test: () => testStyling as TerraDrawAdapterStyling,
					},
				);

				const expected = {
					color: mockColor,
					width: `${testStyling.lineStringWidth}px`,
				};

				expect(lib.SimpleLineSymbol).toHaveBeenCalledWith(expected);
			});

			it("adds linestring at index 0", () => {
				adapter.render(
					{
						unchanged: [],
						created: [
							{
								id: "2",
								type: "Feature",
								geometry: {
									type: "LineString",
									coordinates: [[0, 0]],
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

				expect(graphicsMock.add).toHaveBeenCalledWith(mockedGraphicCall, 0);
			});
		});

		describe("polygon", () => {
			it("creates a polygon with the specified coordinates with the polygon's id", () => {
				const testCoordinates = [
					[
						[1, 2],
						[3, 4],
					],
				];
				const testId = "1";
				adapter.render(
					{
						unchanged: [],
						created: [
							{
								id: testId,
								type: "Feature",
								geometry: {
									type: "Polygon",
									coordinates: testCoordinates,
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

				expect(lib.Polygon).toHaveBeenCalledWith({ rings: testCoordinates });
				expect(lib.Graphic).toHaveBeenCalledWith(
					expect.objectContaining({
						attributes: { [adapter["_featureIdAttributeName"]]: testId },
					}),
				);
			});

			it("symbolizes the polygon correctly", () => {
				const mockColor = { r: 0, g: 0, b: 0 } as Color;
				lib.Color.fromHex.mockReturnValue(mockColor);
				const testStyling: TerraDrawAdapterStyling = {
					polygonFillOpacity: 0.5,
					polygonFillColor: "#000000",
					polygonOutlineWidth: 5,
					polygonOutlineColor: "#FFFFFF",
				} as unknown as TerraDrawAdapterStyling;
				adapter.render(
					{
						unchanged: [],
						created: [
							{
								id: "2",
								type: "Feature",
								geometry: {
									type: "Polygon",
									coordinates: [[[0, 0]]],
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
						test: () => testStyling as TerraDrawAdapterStyling,
					},
				);

				const expected = {
					color: { ...mockColor, a: testStyling.polygonFillOpacity },
					outline: {
						color: mockColor,
						width: `${testStyling.polygonOutlineWidth}px`,
					},
				};

				expect(lib.SimpleFillSymbol).toHaveBeenCalledWith(expected);
				expect(lib.Color.fromHex).toHaveBeenCalledTimes(2);
			});

			it("adds polygon at index 0", () => {
				adapter.render(
					{
						unchanged: [],
						created: [
							{
								id: "2",
								type: "Feature",
								geometry: {
									type: "Polygon",
									coordinates: [[[0, 0]]],
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

				expect(graphicsMock.add).toHaveBeenCalledWith(mockedGraphicCall, 0);
			});
		});
	});
});
