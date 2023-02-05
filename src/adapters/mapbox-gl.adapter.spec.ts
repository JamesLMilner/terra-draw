
import { TerraDrawMapboxGLAdapter } from "./mapbox-gl.adapter";

const createMapboxGLMap = () => {
    return {
        project: jest.fn(),
        unproject: jest.fn(),
        getCanvas: jest.fn(),
        getContainer: jest.fn(),
        dragPan: { enable: jest.fn(), disable: jest.fn(), isActive: jest.fn(), isEnabled: jest.fn() },
        on: jest.fn(),
        off: jest.fn(),
    } as Partial<mapboxgl.Map>;
};

describe("TerraDrawMapboxGLAdapter", () => {
    describe('constructor', () => {
        it("instantiates the adapter correctly", () => {
            const adapter = new TerraDrawMapboxGLAdapter({
                map: createMapboxGLMap() as mapboxgl.Map
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
});
