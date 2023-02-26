import { Position } from "geojson";
import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawGreatCircleMode } from "./great-circle.mode";

describe("TerraDrawGreatCircleMode", () => {
    describe("constructor", () => {
        it("constructs with no options", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();
            expect(greatCircleMode.mode).toBe("greatcircle");
            expect(greatCircleMode.styles).toStrictEqual({});
        });

        it("constructs with options", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode({
                styles: { lineStringColor: "#ffffff" },
                keyEvents: { cancel: "Backspace", finish: 'Enter' },
            });
            expect(greatCircleMode.styles).toStrictEqual({ lineStringColor: "#ffffff" });
        });

        it("constructs with null key events", () => {
            new TerraDrawGreatCircleMode({
                styles: { lineStringColor: "#ffffff" },
                keyEvents: null
            });

            new TerraDrawGreatCircleMode({
                styles: { lineStringColor: "#ffffff" },
                keyEvents: { cancel: null, finish: null }
            });

        });

    });

    describe("lifecycle", () => {
        it("registers correctly", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();
            expect(greatCircleMode.state).toBe("unregistered");
            greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
            expect(greatCircleMode.state).toBe("registered");
        });

        it("setting state directly throws error", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();

            expect(() => {
                greatCircleMode.state = "started";
            }).toThrowError();
        });

        it("stopping before not registering throws error", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();

            expect(() => {
                greatCircleMode.stop();
            }).toThrowError();
        });

        it("starting before not registering throws error", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();

            expect(() => {
                greatCircleMode.start();
            }).toThrowError();
        });

        it("starting before not registering throws error", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();

            expect(() => {
                greatCircleMode.start();
            }).toThrowError();
        });

        it("registering multiple times throws an error", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();

            expect(() => {
                greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
                greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
            }).toThrowError();
        });

        it("can start correctly", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();

            greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
            greatCircleMode.start();

            expect(greatCircleMode.state).toBe("started");
        });

        it("can stop correctly", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();

            greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
            greatCircleMode.start();
            greatCircleMode.stop();

            expect(greatCircleMode.state).toBe("stopped");
        });
    });

    describe("onMouseMove", () => {
        let greatCircleMode: TerraDrawGreatCircleMode;
        let onChange: jest.Mock;
        let store: GeoJSONStore;
        let project: jest.Mock;

        beforeEach(() => {
            greatCircleMode = new TerraDrawGreatCircleMode();
            const mockConfig = getMockModeConfig(greatCircleMode.mode);
            onChange = mockConfig.onChange;
            store = mockConfig.store;
            project = mockConfig.project;
            greatCircleMode.register(mockConfig);
        });

        it('does nothing if no click has been performed', () => {
            greatCircleMode.onMouseMove({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            expect(onChange).toBeCalledTimes(0);
        });

        it('moves the ending point of great circle on move', () => {
            project.mockReturnValueOnce({ x: 0, y: 0 });
            project.mockReturnValueOnce({ x: 0, y: 0 });
            project.mockReturnValueOnce({ x: 50, y: 50 });
            project.mockReturnValueOnce({ x: 50, y: 50 });

            greatCircleMode.onClick({
                lng: 1,
                lat: 1,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            let features = store.copyAll();
            expect(features.length).toBe(2);

            greatCircleMode.onMouseMove({
                lng: 20,
                lat: 20,
                containerX: 100,
                containerY: 100,
                button: "left",
                heldKeys: [],
            });

            features = store.copyAll();
            expect(features.length).toBe(2);

            const before = JSON.stringify(features[0].geometry.coordinates);

            expect(features[0].geometry.coordinates.length).toBe(100);

            greatCircleMode.onMouseMove({
                lng: 50,
                lat: 50,
                containerX: 200,
                containerY: 200,
                button: "left",
                heldKeys: [],
            });

            features = store.copyAll();
            expect(features.length).toBe(2);

            const after = JSON.stringify(features[0].geometry.coordinates);

            expect(features[0].geometry.coordinates.length).toBe(100);

            expect(before).not.toBe(after);

        });
    });

    describe("onClick", () => {
        let greatCircleMode: TerraDrawGreatCircleMode;
        let onChange: jest.Mock;
        let store: GeoJSONStore;
        let project: jest.Mock;

        beforeEach(() => {
            greatCircleMode = new TerraDrawGreatCircleMode();
            const mockConfig = getMockModeConfig(greatCircleMode.mode);
            onChange = mockConfig.onChange;
            store = mockConfig.store;
            project = mockConfig.project;
            greatCircleMode.register(mockConfig);
        });

        it("creates two identical coordinates on click, and also creates the ending point", () => {
            greatCircleMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            expect(onChange).toBeCalledTimes(2);

            const features = store.copyAll();
            expect(features.length).toBe(2);

            expect(features[0].geometry.coordinates).toStrictEqual([
                [0, 0],
                [0, 0],
            ]);

            expect(features[1].geometry.coordinates).toStrictEqual(
                [0, 0],
            );
        });

        it("creates line on second click", () => {
            project.mockReturnValueOnce({ x: 0, y: 0 });
            project.mockReturnValueOnce({ x: 0, y: 0 });
            project.mockReturnValueOnce({ x: 50, y: 50 });
            project.mockReturnValueOnce({ x: 50, y: 50 });

            greatCircleMode.onClick({
                lng: 1,
                lat: 1,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            let features = store.copyAll();
            expect(features.length).toBe(2);

            greatCircleMode.onMouseMove({
                lng: 20,
                lat: 20,
                containerX: 100,
                containerY: 100,
                button: "left",
                heldKeys: [],
            });

            features = store.copyAll();
            expect(features.length).toBe(2);

            expect(features[0].geometry.coordinates.length).toBe(100);

            greatCircleMode.onClick({
                lng: 20,
                lat: 20,
                containerX: 100,
                containerY: 100,
                button: "left",
                heldKeys: [],
            });

            expect(onChange).toBeCalledTimes(5);
            features = store.copyAll();

            expect(features.length).toBe(1);
            expect(features[0].geometry.coordinates.length).toBe(100);
            features[0].geometry.coordinates.forEach((coordinate) => {
                expect(typeof (coordinate as Position)[0]).toBe('number');
                expect(typeof (coordinate as Position)[1]).toBe('number');
            });
        });
    });

    describe("onKeyUp", () => {
        let greatCircleMode: TerraDrawGreatCircleMode;
        let onChange: jest.Mock;
        let store: GeoJSONStore;
        let project: jest.Mock;

        beforeEach(() => {
            greatCircleMode = new TerraDrawGreatCircleMode();
            const mockConfig = getMockModeConfig(greatCircleMode.mode);
            onChange = mockConfig.onChange;
            store = mockConfig.store;
            project = mockConfig.project;
            greatCircleMode.register(mockConfig);
        });

        describe('cancel', () => {
            it("does nothing when no line is present", () => {
                greatCircleMode.onKeyUp({ key: "Escape" });
                expect(onChange).toBeCalledTimes(0);
            });

            it("deletes the line when currently editing", () => {
                greatCircleMode.onClick({
                    lng: 0,
                    lat: 0,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(2);

                greatCircleMode.onKeyUp({ key: "Escape" });

                features = store.copyAll();
                expect(features.length).toBe(0);
            });
        });


        describe('finish', () => {

            it("does nothing if no drawing is happening", () => {
                greatCircleMode.onKeyUp({ key: "Enter" });

                expect(onChange).toBeCalledTimes(0);
            });

            it("finishes the great circle on finish key press", () => {
                project.mockReturnValueOnce({ x: 0, y: 0 });
                project.mockReturnValueOnce({ x: 0, y: 0 });
                project.mockReturnValueOnce({ x: 50, y: 50 });
                project.mockReturnValueOnce({ x: 50, y: 50 });

                greatCircleMode.onClick({
                    lng: 1,
                    lat: 1,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(2);

                greatCircleMode.onMouseMove({
                    lng: 20,
                    lat: 20,
                    containerX: 100,
                    containerY: 100,
                    button: "left",
                    heldKeys: [],
                });

                features = store.copyAll();
                expect(features.length).toBe(2);

                expect(features[0].geometry.coordinates.length).toBe(100);

                greatCircleMode.onKeyUp({ key: "Enter" });

                expect(onChange).toBeCalledTimes(5);
                features = store.copyAll();

                expect(features.length).toBe(1);
                expect(features[0].geometry.coordinates.length).toBe(100);
                features[0].geometry.coordinates.forEach((coordinate) => {
                    expect(typeof (coordinate as Position)[0]).toBe('number');
                    expect(typeof (coordinate as Position)[1]).toBe('number');
                });
            });

            it("does not finish great circle when finish is set to null", () => {
                greatCircleMode = new TerraDrawGreatCircleMode({ keyEvents: null });
                const mockConfig = getMockModeConfig(greatCircleMode.mode);
                onChange = mockConfig.onChange;
                store = mockConfig.store;
                project = mockConfig.project;
                greatCircleMode.register(mockConfig);

                project.mockReturnValueOnce({ x: 0, y: 0 });
                project.mockReturnValueOnce({ x: 0, y: 0 });
                project.mockReturnValueOnce({ x: 50, y: 50 });
                project.mockReturnValueOnce({ x: 50, y: 50 });

                greatCircleMode.onClick({
                    lng: 1,
                    lat: 1,
                    containerX: 0,
                    containerY: 0,
                    button: "left",
                    heldKeys: [],
                });

                let features = store.copyAll();
                expect(features.length).toBe(2);

                greatCircleMode.onMouseMove({
                    lng: 20,
                    lat: 20,
                    containerX: 100,
                    containerY: 100,
                    button: "left",
                    heldKeys: [],
                });

                features = store.copyAll();
                expect(features.length).toBe(2);

                expect(features[0].geometry.coordinates.length).toBe(100);

                greatCircleMode.onKeyUp({ key: "Enter" });

                expect(onChange).toBeCalledTimes(4);
            });
        });
    });

    describe("cleanUp", () => {
        let greatCircleMode: TerraDrawGreatCircleMode;
        let store: GeoJSONStore;

        beforeEach(() => {
            greatCircleMode = new TerraDrawGreatCircleMode();
            const mockConfig = getMockModeConfig(greatCircleMode.mode);
            store = mockConfig.store;
            greatCircleMode.register(mockConfig);
        });

        it("does not throw error if feature has not been created ", () => {
            expect(() => {
                greatCircleMode.cleanUp();
            }).not.toThrowError();
        });

        it("cleans up correctly if drawing has started", () => {
            greatCircleMode.onClick({
                lng: 0,
                lat: 0,
                containerX: 0,
                containerY: 0,
                button: "left",
                heldKeys: [],
            });

            expect(store.copyAll().length).toBe(2);

            greatCircleMode.cleanUp();

            // Removes the LineString that was being created
            expect(store.copyAll().length).toBe(0);
        });
    });

    describe("styling", () => {
        it("gets", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();
            greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
            expect(greatCircleMode.styles).toStrictEqual({});
        });

        it("set fails if non valid styling", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();
            greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));

            expect(() => {
                (greatCircleMode.styles as unknown) = "test";
            }).toThrowError();

            expect(greatCircleMode.styles).toStrictEqual({});
        });

        it("sets", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode();
            greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));

            greatCircleMode.styles = {
                lineStringColor: "#ffffff",
            };

            expect(greatCircleMode.styles).toStrictEqual({
                lineStringColor: "#ffffff",
            });
        });
    });


    describe('styleFeature', () => {
        it("can default styles", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode({
                styles: {
                    lineStringWidth: 2,
                    lineStringColor: '#ffffff',
                }
            });

            expect(
                greatCircleMode.styleFeature({
                    type: "Feature",
                    geometry: { type: "Polygon", coordinates: [] },
                    properties: { mode: "greatcircle" }
                })
            ).toMatchObject({
                lineStringColor: "#3f97e0",
                lineStringWidth: 4,
            });
        });

        it("returns the correct styles for polygon", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode({
                styles: {
                    lineStringWidth: 2,
                    lineStringColor: '#ffffff',

                }
            });

            expect(
                greatCircleMode.styleFeature({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: [] },
                    properties: { mode: "greatcircle" }
                })
            ).toMatchObject({
                lineStringColor: "#ffffff",
                lineStringWidth: 2,

            });
        });

        it("returns the correct styles for point", () => {
            const greatCircleMode = new TerraDrawGreatCircleMode({
                styles: {
                    closingPointColor: '#1111111',
                    closingPointWidth: 3,
                    closingPointOutlineColor: '#333333',
                    closingPointOutlineWidth: 2
                }
            });

            expect(
                greatCircleMode.styleFeature({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [] },
                    properties: { mode: "greatcircle" }
                })
            ).toMatchObject({
                pointColor: "#1111111",
                pointOutlineColor: "#333333",
                pointOutlineWidth: 2,
                pointWidth: 3,
                zIndex: 0,
            });
        });
    });
});
