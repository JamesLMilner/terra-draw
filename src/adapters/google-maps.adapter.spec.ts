
import { TerraDrawGoogleMapsAdapter } from "./google-maps.adapter";

const createMockGoogleMap = () => {
    return {
        setValues: jest.fn(),
        unbind: jest.fn(),
        unbindAll: jest.fn(),
        bindTo: jest.fn(),
        get: jest.fn(),
        notify: jest.fn(),
        set: jest.fn(),
        addListener: jest.fn(),
        getBounds: jest.fn(),
        controls: [],
        data: {} as any,
        fitBounds: jest.fn(),
        getCenter: jest.fn(),
        getClickableIcons: jest.fn(),
        getDiv: jest.fn(),
        getHeading: jest.fn(),
        getMapTypeId: jest.fn(),
        getProjection: jest.fn(),
        getRenderingType: jest.fn(),
        getStreetView: jest.fn(),
        getTilt: jest.fn(),
        getZoom: jest.fn(),
        mapTypes: {} as any,
        moveCamera: jest.fn(),
        overlayMapTypes: [] as any,
        panBy: jest.fn(),
        panTo: jest.fn(),
        panToBounds: jest.fn(),
        setCenter: jest.fn(),
        setClickableIcons: jest.fn(),
        setHeading: jest.fn(),
        setMapTypeId: jest.fn(),
        setOptions: jest.fn(),
        setStreetView: jest.fn(),
        setTilt: jest.fn(),
        setZoom: jest.fn(),
    } as google.maps.Map
}

describe("TerraDrawGoogleMapsAdapter", () => {
    describe('constructor', () => {
        it("instantiates the adapter correctly", () => {
            const adapter = new TerraDrawGoogleMapsAdapter({
                lib: {
                    LatLng: jest.fn()
                } as any,
                map: createMockGoogleMap()
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
