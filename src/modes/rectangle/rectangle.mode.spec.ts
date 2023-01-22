import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawRectangleMode } from "./rectangle.mode";

describe("TerraDrawRectangleMode", () => {

    describe("constructor", () => {
        it("constructs with no options", () => {
            const rectangleMode = new TerraDrawRectangleMode();
            expect(rectangleMode.mode).toBe("rectangle");
            expect(rectangleMode.styles).toStrictEqual({});
        });

        it("constructs with options", () => {
            const rectangleMode = new TerraDrawRectangleMode({
                styles: { fillColor: "#ffffff" },
                keyEvents: {
                    cancel: "Backspace",
                    finish: 'Enter'
                },
            });
            expect(rectangleMode.styles).toStrictEqual({
                fillColor: "#ffffff",
            });
        });

        it("constructs with null key events", () => {
            new TerraDrawRectangleMode({
                styles: { fillColor: "#ffffff" },
                keyEvents: null
            });

            new TerraDrawRectangleMode({
                styles: { fillColor: "#ffffff" },
                keyEvents: { cancel: null, finish: null }
            });

        });
    });

    describe("lifecycle", () => {
        it("registers correctly", () => {
            const rectangleMode = new TerraDrawRectangleMode();
            expect(rectangleMode.state).toBe("unregistered");
            rectangleMode.register(getMockModeConfig(rectangleMode.mode));
            expect(rectangleMode.state).toBe("registered");
        });

        it("setting state directly throws error", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            expect(() => {
                rectangleMode.state = "started";
            }).toThrowError();
        });

        it("stopping before not registering throws error", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            expect(() => {
                rectangleMode.stop();
            }).toThrowError();
        });

        it("starting before not registering throws error", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            expect(() => {
                rectangleMode.start();
            }).toThrowError();
        });

        it("starting before not registering throws error", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            expect(() => {
                rectangleMode.start();
            }).toThrowError();
        });

        it("registering multiple times throws an error", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            expect(() => {
                rectangleMode.register(getMockModeConfig(rectangleMode.mode));
                rectangleMode.register(getMockModeConfig(rectangleMode.mode));
            }).toThrowError();
        });

        it("can start correctly", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            rectangleMode.register(getMockModeConfig(rectangleMode.mode));
            rectangleMode.start();

            expect(rectangleMode.state).toBe("started");
        });

        it("can stop correctly", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            rectangleMode.register(getMockModeConfig(rectangleMode.mode));
            rectangleMode.start();
            rectangleMode.stop();

            expect(rectangleMode.state).toBe("stopped");
        });
    });

    describe("onClick", () => {
        let rectangleMode: TerraDrawRectangleMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        beforeEach(() => {
            rectangleMode = new TerraDrawRectangleMode();
            store = new GeoJSONStore();
            onChange = jest.fn();
        });

        it("throws an error if not registered", () => {
            expect(() => {
                rectangleMode.onClick({
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
                const mockConfig = getMockModeConfig(rectangleMode.mode);

                store = mockConfig.store;
                onChange = mockConfig.onChange;

                rectangleMode.register(mockConfig);
            });
            it("adds a circle to store if registered", () => {
                rectangleMode.onClick({
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
                rectangleMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(1);

                rectangleMode.onClick({
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


        let rectangleMode: TerraDrawRectangleMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        it("finishes drawing circle on finish key press", () => {
            rectangleMode = new TerraDrawRectangleMode();
            const mockConfig = getMockModeConfig(rectangleMode.mode);
            store = new GeoJSONStore();
            store = mockConfig.store;
            onChange = mockConfig.onChange;
            rectangleMode.register(mockConfig);

            rectangleMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            let features = store.copyAll();
            expect(features.length).toBe(1);

            rectangleMode.onKeyUp({
                key: 'Enter'
            });

            rectangleMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            features = store.copyAll();
            // Two as the rectangle has been closed via enter
            expect(features.length).toBe(2);

            expect(onChange).toBeCalledTimes(2);
            expect(onChange).toBeCalledWith([expect.any(String)], "create");

        });

        it("does not finish on key press when keyEvents null", () => {
            rectangleMode = new TerraDrawRectangleMode({ keyEvents: null });
            const mockConfig = getMockModeConfig(rectangleMode.mode);
            store = new GeoJSONStore();
            store = mockConfig.store;
            onChange = mockConfig.onChange;
            rectangleMode.register(mockConfig);

            rectangleMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            let features = store.copyAll();
            expect(features.length).toBe(1);

            rectangleMode.onKeyUp({
                key: 'Enter'
            });

            rectangleMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            features = store.copyAll();

            // Only one as the click will close the rectangle
            expect(features.length).toBe(1);

            expect(onChange).toBeCalledTimes(1);
            expect(onChange).toBeCalledWith([expect.any(String)], "create");
        });
    });

    describe("onMouseMove", () => {
        let rectangleMode: TerraDrawRectangleMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        beforeEach(() => {
            rectangleMode = new TerraDrawRectangleMode();

            const mockConfig = getMockModeConfig(rectangleMode.mode);

            store = mockConfig.store;
            onChange = mockConfig.onChange;

            rectangleMode.register(mockConfig);
        });

        it("updates the circle size", () => {
            rectangleMode.onClick({
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

            rectangleMode.onMouseMove({
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
        let rectangleMode: TerraDrawRectangleMode;
        let store: GeoJSONStore;
        let onChange: jest.Mock;

        beforeEach(() => {
            rectangleMode = new TerraDrawRectangleMode();

            const mockConfig = getMockModeConfig(rectangleMode.mode);

            store = mockConfig.store;
            onChange = mockConfig.onChange;

            rectangleMode.register(mockConfig);
        });

        it("does not delete if no circle has been created", () => {
            rectangleMode.cleanUp();
            expect(onChange).toBeCalledTimes(0);
        });

        it("does delete if a circle has been created", () => {
            rectangleMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            rectangleMode.cleanUp();

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
        let rectangleMode: TerraDrawRectangleMode;
        let onChange: jest.Mock;
        let project: jest.Mock;

        beforeEach(() => {
            jest.resetAllMocks();
            rectangleMode = new TerraDrawRectangleMode();

            const mockConfig = getMockModeConfig(rectangleMode.mode);
            store = mockConfig.store;
            onChange = mockConfig.onChange;
            project = mockConfig.project;
            rectangleMode.register(mockConfig);
        });

        describe('cancel', () => {
            it("does nothing when no circle is present", () => {
                rectangleMode.onKeyUp({ key: "Escape" });
            });

            it("deletes the circle when currently editing", () => {
                rectangleMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(1);

                rectangleMode.onKeyUp({ key: "Escape" });

                features = store.copyAll();
                expect(features.length).toBe(0);
            });
        });

    });

    describe("onDrag", () => {
        it("does nothing", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            expect(() => {
                rectangleMode.onDrag();
            }).not.toThrowError();
        });
    });

    describe("onDragStart", () => {
        it("does nothing", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            expect(() => {
                rectangleMode.onDragStart();
            }).not.toThrowError();
        });
    });

    describe("onDragEnd", () => {
        it("does nothing", () => {
            const rectangleMode = new TerraDrawRectangleMode();

            expect(() => {
                rectangleMode.onDragEnd();
            }).not.toThrowError();
        });
    });
});
