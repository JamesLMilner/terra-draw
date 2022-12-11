import { Project } from "../../common";
import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawFreehandMode } from "./freehand.mode";

describe("TerraDrawFreehandMode", () => {

    describe("constructor", () => {
        it("constructs with no options", () => {
            const freehandMode = new TerraDrawFreehandMode();
            expect(freehandMode.mode).toBe("freehand");
            expect(freehandMode.styles).toStrictEqual({});
        });

        it("constructs with options", () => {
            const freehandMode = new TerraDrawFreehandMode({
                styles: { outlineColor: "#ffffff" },
                minDistance: 5,
                keyEvents: {
                    cancel: "Backspace",
                    finish: 'Enter'
                },
            });
            expect(freehandMode.styles).toStrictEqual({
                outlineColor: "#ffffff",
            });
        });
    });

    describe("lifecycle", () => {
        it("registers correctly", () => {
            const freehandMode = new TerraDrawFreehandMode();
            expect(freehandMode.state).toBe("unregistered");
            freehandMode.register(getMockModeConfig(freehandMode.mode));
            expect(freehandMode.state).toBe("registered");
        });

        it("setting state directly throws error", () => {
            const freehandMode = new TerraDrawFreehandMode();

            expect(() => {
                freehandMode.state = "started";
            }).toThrowError();
        });

        it("stopping before not registering throws error", () => {
            const freehandMode = new TerraDrawFreehandMode();

            expect(() => {
                freehandMode.stop();
            }).toThrowError();
        });

        it("starting before not registering throws error", () => {
            const freehandMode = new TerraDrawFreehandMode();

            expect(() => {
                freehandMode.start();
            }).toThrowError();
        });

        it("starting before not registering throws error", () => {
            const freehandMode = new TerraDrawFreehandMode();

            expect(() => {
                freehandMode.start();
            }).toThrowError();
        });

        it("registering multiple times throws an error", () => {
            const freehandMode = new TerraDrawFreehandMode();

            expect(() => {
                freehandMode.register(getMockModeConfig(freehandMode.mode));
                freehandMode.register(getMockModeConfig(freehandMode.mode));
            }).toThrowError();
        });

        it("can start correctly", () => {
            const freehandMode = new TerraDrawFreehandMode();

            freehandMode.register(getMockModeConfig(freehandMode.mode));
            freehandMode.start();

            expect(freehandMode.state).toBe("started");
        });

        it("can stop correctly", () => {
            const freehandMode = new TerraDrawFreehandMode();

            freehandMode.register(getMockModeConfig(freehandMode.mode));
            freehandMode.start();
            freehandMode.stop();

            expect(freehandMode.state).toBe("stopped");
        });
    });

    describe("onClick", () => {
        let freehandMode: TerraDrawFreehandMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        beforeEach(() => {
            freehandMode = new TerraDrawFreehandMode();
            store = new GeoJSONStore();
        });

        it("throws an error if not registered", () => {
            expect(() => {
                freehandMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });
            }).toThrowError();
        });

        describe("registered", () => {
            beforeEach(() => {
                const mockConfig = getMockModeConfig(freehandMode.mode);
                onChange = mockConfig.onChange;
                store = mockConfig.store;
                freehandMode.register(mockConfig);
            });

            it("adds a polygon and closing point to store if registered", () => {
                freehandMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                expect(onChange).toBeCalledTimes(1);
                expect(onChange).toBeCalledWith([expect.any(String), expect.any(String)], "create");
            });

            it("finishes drawing polygon on second click", () => {
                freehandMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(2);

                freehandMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                // No more closing coordinate so we drop to 1 feature
                features = store.copyAll();
                expect(features.length).toBe(1);

                expect(onChange).toBeCalledTimes(2);
                expect(onChange).toBeCalledWith([expect.any(String), expect.any(String)], "create");
            });
        });
    });

    describe("onMouseMove", () => {
        let freehandMode: TerraDrawFreehandMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;
        let project: Project;

        beforeEach(() => {
            freehandMode = new TerraDrawFreehandMode();

            const mockConfig = getMockModeConfig(freehandMode.mode);
            store = mockConfig.store;
            onChange = mockConfig.onChange;
            project = mockConfig.project;
            freehandMode.register(mockConfig);
        });

        it("updates the freehand polygon when the mouse cursor has moved a minimum amount", () => {
            freehandMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            expect(onChange).toBeCalledTimes(1);
            expect(onChange).toHaveBeenNthCalledWith(
                1,
                [expect.any(String), expect.any(String)],
                "create"
            );

            const feature = store.copyAll()[0];

            for (let i = 0; i < 5; i++) {
                (project as jest.Mock).mockReturnValueOnce({
                    x: (i * 20) - 20,
                    y: (i * 20) - 20
                });

                (project as jest.Mock).mockReturnValueOnce({
                    x: 1000,
                    y: 1000
                });

                freehandMode.onMouseMove({
                    lng: i,
                    lat: i,
                    containerX: i * 20,
                    containerY: i * 20,
                    button: "left",
                    heldKeys: [],
                });
            }

            expect(onChange).toBeCalledTimes(6);

            const updatedFeature = store.copyAll()[0];

            expect(feature.id).toBe(updatedFeature.id);
            expect(feature.geometry.coordinates).not.toStrictEqual(
                updatedFeature.geometry.coordinates
            );
        });

        it("does nothing if no first click", () => {
            freehandMode.onMouseMove({
                lng: 1,
                lat: 1,
                containerX: 1,
                containerY: 1,
                button: "left",
                heldKeys: [],
            });

            expect(onChange).toBeCalledTimes(0);
        });
    });

    describe("cleanUp", () => {
        let freehandMode: TerraDrawFreehandMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        beforeEach(() => {
            freehandMode = new TerraDrawFreehandMode();
            const mockConfig = getMockModeConfig(freehandMode.mode);
            store = mockConfig.store;
            onChange = mockConfig.onChange;
            freehandMode.register(mockConfig);
        });

        it("does not delete if no freehand has been created", () => {
            freehandMode.cleanUp();
            expect(onChange).toBeCalledTimes(0);
        });

        it("does delete if a freehand has been created", () => {
            freehandMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            freehandMode.cleanUp();

            expect(onChange).toBeCalledTimes(3);
            expect(onChange).toHaveBeenNthCalledWith(
                2,
                [expect.any(String)],
                "delete"
            );
        });
    });

    describe("onKeyUp", () => {
        let store: GeoJSONStore;
        let freehandMode: TerraDrawFreehandMode;
        let onChange: jest.Mock;
        let project: jest.Mock;

        beforeEach(() => {
            jest.resetAllMocks();

            freehandMode = new TerraDrawFreehandMode();

            const mockConfig = getMockModeConfig(freehandMode.mode);
            store = mockConfig.store;
            onChange = mockConfig.onChange;
            project = mockConfig.project;
            freehandMode.register(mockConfig);
        });

        describe('cancel', () => {
            it("does nothing when no freehand is present", () => {
                freehandMode.onKeyUp({ key: "Escape" });
            });

            it("deletes the freehand when currently editing", () => {
                freehandMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(2);

                freehandMode.onKeyUp({ key: "Escape" });

                features = store.copyAll();
                expect(features.length).toBe(0);
            });
        });

        describe('finish', () => {

            it("finishes drawing polygon on finish key press", () => {
                freehandMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(2);

                freehandMode.onKeyUp({
                    key: 'Enter'
                });

                features = store.copyAll();
                expect(features.length).toBe(1);

                expect(onChange).toBeCalledTimes(2);
                expect(onChange).toHaveBeenNthCalledWith(1, [expect.any(String), expect.any(String)], "create");
                expect(onChange).toHaveBeenNthCalledWith(2, [expect.any(String)], "delete");

            });
        });


    });

    describe("onDrag", () => {
        it("does nothing", () => {
            const freehandMode = new TerraDrawFreehandMode();

            expect(() => {
                freehandMode.onDrag();
            }).not.toThrowError();
        });
    });

    describe("onDragStart", () => {
        it("does nothing", () => {
            const freehandMode = new TerraDrawFreehandMode();

            expect(() => {
                freehandMode.onDragStart();
            }).not.toThrowError();
        });
    });

    describe("onDragEnd", () => {
        it("does nothing", () => {
            const freehandMode = new TerraDrawFreehandMode();

            expect(() => {
                freehandMode.onDragEnd();
            }).not.toThrowError();
        });
    });

    describe('styleFeature', () => {
        it("returns the correct styles for polygon", () => {
            const freehandMode = new TerraDrawFreehandMode({
                styles: {
                    fillColor: '#ffffff',
                    outlineColor: '#ffffff',
                    outlineWidth: 2,
                    fillOpacity: 0.5
                }
            });

            expect(
                freehandMode.styleFeature({
                    type: "Feature",
                    geometry: { type: "Polygon", coordinates: [] },
                    properties: { mode: "freehand" }
                })
            ).toMatchObject({
                polygonFillColor: '#ffffff',
                polygonOutlineColor: '#ffffff',
                polygonOutlineWidth: 2,
                polygonFillOpacity: 0.5
            });
        });

        it("returns the correct styles for point", () => {
            const freehandMode = new TerraDrawFreehandMode({
                styles: {
                    closingPointColor: '#ffffff',
                    closingPointOutlineWidth: 2,
                    closingPointWidth: 1,
                    closingPointOutlineColor: '#111111'
                }
            });

            expect(
                freehandMode.styleFeature({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [] },
                    properties: { mode: "freehand" }
                })
            ).toMatchObject({
                pointColor: '#ffffff',
                pointOutlineWidth: 2,
                pointWidth: 1,
                pointOutlineColor: '#111111'
            });
        });
    });
});
