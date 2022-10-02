import { mockBehaviorConfig } from "../test/mock-behavior-config";
import { mockDrawEvent } from "../test/mock-mouse-event";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";

describe("ClickBoundingBoxBehavior", () => {
    describe("constructor", () => {
        it("constructs", () => {
            new ClickBoundingBoxBehavior(mockBehaviorConfig("test"));
        });
    });

    describe("api", () => {
        it("create", () => {
            const config = mockBehaviorConfig("test");

            // Mock the unproject to return a valid set
            // of bbox coordinates
            (config.unproject as jest.Mock)
                .mockImplementationOnce(() => ({ lng: 0, lat: 1 }))
                .mockImplementationOnce(() => ({ lng: 1, lat: 1 }))
                .mockImplementationOnce(() => ({ lng: 1, lat: 0 }))
                .mockImplementationOnce(() => ({ lng: 0, lat: 0 }))
                .mockImplementationOnce(() => ({ lng: 0, lat: 1 }));

            const clickBoundingBoxBehavior = new ClickBoundingBoxBehavior(config);

            const bbox = clickBoundingBoxBehavior.create(mockDrawEvent());

            // Ensure unproject is called correctly with screen space square
            expect(config.unproject).toBeCalledTimes(5);
            expect(config.unproject).toHaveBeenNthCalledWith(1, -20, -20);
            expect(config.unproject).toHaveBeenNthCalledWith(2, 20, -20);
            expect(config.unproject).toHaveBeenNthCalledWith(3, 20, 20);
            expect(config.unproject).toHaveBeenNthCalledWith(4, -20, 20);
            expect(config.unproject).toHaveBeenNthCalledWith(5, -20, -20);

            expect(bbox).toStrictEqual({
                geometry: {
                    coordinates: [
                        [
                            [0, 1],
                            [1, 1],
                            [1, 0],
                            [0, 0],
                            [0, 1],
                        ],
                    ],
                    type: "Polygon",
                },
                properties: {},
                type: "Feature",
            });
        });
    });
});
