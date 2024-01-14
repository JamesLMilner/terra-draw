import { TerraDrawMapLibreGLAdapter } from "./maplibre-gl.adapter";

const createMapLibreGLMap = () => {
	return {
		project: jest.fn(),
		unproject: jest.fn(),
		getCanvas: jest.fn(),
		getContainer: jest.fn(),
		dragPan: {
			enable: jest.fn(),
			disable: jest.fn(),
			isActive: jest.fn(),
			isEnabled: jest.fn(),
		} as any,
		on: jest.fn(),
		off: jest.fn(),
	} as Partial<maplibregl.Map>;
};

describe("TerraDrawMapLibreGLAdapter", () => {
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
});
