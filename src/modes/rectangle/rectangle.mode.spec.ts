import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawRectangleMode } from "./rectangle.mode";

describe("TerraDrawRectangleMode", () => {

    describe("constructor", () => {
        it("constructs with no options", () => {
            const circleMode = new TerraDrawRectangleMode();
            expect(circleMode.mode).toBe("rectangle");
            expect(circleMode.styles).toStrictEqual({});
        });

        it("constructs with options", () => {
            const circleMode = new TerraDrawRectangleMode({
                styles: { fillColor: "#ffffff" },
                keyEvents: {
                    cancel: "Backspace",
                    finish: 'Enter'
                },
            });
            expect(circleMode.styles).toStrictEqual({
                fillColor: "#ffffff",
            });
        });
    });

    describe("lifecycle", () => {
        it("registers correctly", () => {
            const circleMode = new TerraDrawRectangleMode();
            expect(circleMode.state).toBe("unregistered");
            circleMode.register(getMockModeConfig(circleMode.mode));
            expect(circleMode.state).toBe("registered");
        });

        it("setting state directly throws error", () => {
            const circleMode = new TerraDrawRectangleMode();

            expect(() => {
                circleMode.state = "started";
            }).toThrowError();
        });

        it("stopping before not registering throws error", () => {
            const circleMode = new TerraDrawRectangleMode();

            expect(() => {
                circleMode.stop();
            }).toThrowError();
        });

        it("starting before not registering throws error", () => {
            const circleMode = new TerraDrawRectangleMode();

            expect(() => {
                circleMode.start();
            }).toThrowError();
        });

        it("starting before not registering throws error", () => {
            const circleMode = new TerraDrawRectangleMode();

            expect(() => {
                circleMode.start();
            }).toThrowError();
        });

        it("registering multiple times throws an error", () => {
            const circleMode = new TerraDrawRectangleMode();

            expect(() => {
                circleMode.register(getMockModeConfig(circleMode.mode));
                circleMode.register(getMockModeConfig(circleMode.mode));
            }).toThrowError();
        });

        it("can start correctly", () => {
            const circleMode = new TerraDrawRectangleMode();

            circleMode.register(getMockModeConfig(circleMode.mode));
            circleMode.start();

            expect(circleMode.state).toBe("started");
        });

        it("can stop correctly", () => {
            const circleMode = new TerraDrawRectangleMode();

            circleMode.register(getMockModeConfig(circleMode.mode));
            circleMode.start();
            circleMode.stop();

            expect(circleMode.state).toBe("stopped");
        });
    });

    describe("onClick", () => {
        let circleMode: TerraDrawRectangleMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        beforeEach(() => {
            circleMode = new TerraDrawRectangleMode();
            store = new GeoJSONStore();
            onChange = jest.fn();
        });

        it("throws an error if not registered", () => {
            expect(() => {
                circleMode.onClick({
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
                const mockConfig = getMockModeConfig(circleMode.mode);

                store = mockConfig.store;
                onChange = mockConfig.onChange;

                circleMode.register(mockConfig);
            });
            it("adds a circle to store if registered", () => {
                circleMode.onClick({
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

            it("finishes drawing circle on second click", () => {
                circleMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(1);

                circleMode.onClick({
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

    describe("onKeyUp", () => {

        let circleMode: TerraDrawRectangleMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        beforeEach(() => {
            circleMode = new TerraDrawRectangleMode();

            const mockConfig = getMockModeConfig(circleMode.mode);
            store = new GeoJSONStore();
            store = mockConfig.store;
            onChange = mockConfig.onChange;
            circleMode.register(mockConfig);
        });

        it("finishes drawing circle on finish key press", () => {
            circleMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            let features = store.copyAll();
            expect(features.length).toBe(1);

            circleMode.onKeyUp({
                key: 'Enter'
            });

            features = store.copyAll();
            expect(features.length).toBe(1);

            expect(onChange).toBeCalledTimes(1);
            expect(onChange).toBeCalledWith([expect.any(String)], "create");
        });
    });

    describe("onMouseMove", () => {
        let circleMode: TerraDrawRectangleMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        beforeEach(() => {
            circleMode = new TerraDrawRectangleMode();

            const mockConfig = getMockModeConfig(circleMode.mode);

            store = mockConfig.store;
            onChange = mockConfig.onChange;

            circleMode.register(mockConfig);
        });

        it("updates the circle size", () => {
            circleMode.onClick({
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

            circleMode.onMouseMove({
                lng: 1,
                lat: 1,
                containerX: 1,
                containerY: 1,
                button: "left",
                heldKeys: [],
            });
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
    });

    describe("cleanUp", () => {
        let circleMode: TerraDrawRectangleMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        beforeEach(() => {
            circleMode = new TerraDrawRectangleMode();

            const mockConfig = getMockModeConfig(circleMode.mode);

            store = mockConfig.store;
            onChange = mockConfig.onChange;

            circleMode.register(mockConfig);
        });

        it("does not delete if no circle has been created", () => {
            circleMode.cleanUp();
            expect(onChange).toBeCalledTimes(0);
        });

        it("does delete if a circle has been created", () => {
            circleMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            circleMode.cleanUp();

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
        let circleMode: TerraDrawRectangleMode;
        let onChange: jest.Mock;
        let project: jest.Mock;

        beforeEach(() => {
            jest.resetAllMocks();
            circleMode = new TerraDrawRectangleMode();

            const mockConfig = getMockModeConfig(circleMode.mode);
            store = mockConfig.store;
            onChange = mockConfig.onChange;
            project = mockConfig.project;
            circleMode.register(mockConfig);
        });

        describe('cancel', () => {
            it("does nothing when no circle is present", () => {
                circleMode.onKeyUp({ key: "Escape" });
            });

            it("deletes the circle when currently editing", () => {
                circleMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(1);

                circleMode.onKeyUp({ key: "Escape" });

                features = store.copyAll();
                expect(features.length).toBe(0);
            });
        });

    });

    describe("onDrag", () => {
        it("does nothing", () => {
            const circleMode = new TerraDrawRectangleMode();

            expect(() => {
                circleMode.onDrag();
            }).not.toThrowError();
        });
    });

    describe("onDragStart", () => {
        it("does nothing", () => {
            const circleMode = new TerraDrawRectangleMode();

            expect(() => {
                circleMode.onDragStart();
            }).not.toThrowError();
        });
    });

    describe("onDragEnd", () => {
        it("does nothing", () => {
            const circleMode = new TerraDrawRectangleMode();

            expect(() => {
                circleMode.onDragEnd();
            }).not.toThrowError();
        });
    });
});
