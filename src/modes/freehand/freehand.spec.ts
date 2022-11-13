import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { getDefaultStyling } from "../../util/styling";
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
                everyNthMouseEvent: 5,
                keyEvents: {
                    cancel: "Backspace",
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

            it("adds a polygon to store if registered", () => {
                freehandMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                expect(onChange).toBeCalledTimes(1);
                expect(onChange).toBeCalledWith([expect.any(String)], "create");
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
                expect(features.length).toBe(1);

                freehandMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                features = store.copyAll();
                expect(features.length).toBe(1);

                expect(onChange).toBeCalledTimes(1);
                expect(onChange).toBeCalledWith([expect.any(String)], "create");
            });
        });
    });

    describe("onMouseMove", () => {
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

        it("updates the freehand polygon on 10th mouse event", () => {
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
                [expect.any(String)],
                "create"
            );

            const feature = store.copyAll()[0];

            for (let i = 0; i < 12; i++) {
                freehandMode.onMouseMove({
                    lng: i,
                    lat: i,
                    containerX: i,
                    containerY: i,
                    button: "left",
                    heldKeys: [],
                });
            }

            expect(onChange).toBeCalledTimes(2);
            expect(onChange).toHaveBeenNthCalledWith(
                2,
                [expect.any(String)],
                "update"
            );

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

            expect(onChange).toBeCalledTimes(2);
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

        it("Escape - does nothing when no freehand is present", () => {
            freehandMode.onKeyUp({ key: "Escape" });
        });

        it("Escape - deletes the freehand when currently editing", () => {
            freehandMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            let features = store.copyAll();
            expect(features.length).toBe(1);

            freehandMode.onKeyUp({ key: "Escape" });

            features = store.copyAll();
            expect(features.length).toBe(0);
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
});
