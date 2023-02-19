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
});
