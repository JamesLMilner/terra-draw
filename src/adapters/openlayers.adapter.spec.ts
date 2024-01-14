import { TerraDrawOpenLayersAdapter } from "./openlayers.adapter";

jest.mock("ol/style/Circle", () => jest.fn());
jest.mock("ol/style/Fill", () => jest.fn());
jest.mock("ol/style/Stroke", () => jest.fn());
jest.mock("ol/style/Style", () => jest.fn());
jest.mock("ol/proj", () => jest.fn());
jest.mock("ol/geom/Geometry", () => jest.fn());

describe("TerraDrawOpenLayersAdapter", () => {
	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawOpenLayersAdapter({
				map: {
					getViewport: jest.fn(() => ({
						setAttribute: jest.fn(),
					})),
					addLayer: jest.fn(),
				} as any,
				lib: {
					GeoJSON: jest.fn(),
					VectorSource: jest.fn(),
					VectorLayer: jest.fn(),
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
});
