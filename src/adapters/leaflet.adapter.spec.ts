
import { TerraDrawLeafletAdapter } from "./leaflet.adapter";

const createLeafletMap = () => {
    return {
        getContainer: jest.fn(),
        latLngToContainerPoint: jest.fn(),
        containerPointToLatLng: jest.fn(),
        doubleClickZoom: { enable: jest.fn(), disable: jest.fn(), enabled: jest.fn() },
        dragging: { enable: jest.fn(), disable: jest.fn(), enabled: jest.fn() },
        on: jest.fn(),
        off: jest.fn(),
        createPane: jest.fn(),
        getPane: jest.fn(),
        removeLayer: jest.fn(),
        addLayer: jest.fn()
    } as Partial<L.Map>
}

describe("TerraDrawLeafletAdapter", () => {
    describe('constructor', () => {
        it("instantiates the adapter correctly", () => {
            const adapter = new TerraDrawLeafletAdapter({
                lib: {
                    circleMarker: jest.fn(),
                    geoJSON: jest.fn()
                } as any,
                map: createLeafletMap() as L.Map
            })

            expect(adapter).toBeDefined()
            expect(adapter.getMapContainer).toBeDefined()
            expect(adapter.render).toBeDefined()
            expect(adapter.register).toBeDefined()
            expect(adapter.unregister).toBeDefined()
            expect(adapter.project).toBeDefined()
            expect(adapter.unproject).toBeDefined()
            expect(adapter.setCursor).toBeDefined()
        });
    });
})
