import { GeoJSONStoreFeatures } from "../../../store/store";
import {
    createStoreLineString,
    createStoreMidPoint,
    createStorePoint,
    createStorePolygon,
} from "../../../test/create-store-features";
import { mockBehaviorConfig } from "../../../test/mock-behavior-config";
import { mockDrawEvent } from "../../../test/mock-mouse-event";
import {
    mockBoundingBoxUnproject,
    mockUnproject,
} from "../../../test/mock-unproject";
import { createPolygon } from "../../../util/geoms";
import { ClickBoundingBoxBehavior } from "../../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { FeaturesAtMouseEventBehavior } from "./features-at-mouse-event.behavior";

describe("FeaturesAtMouseEventBehavior", () => {
    describe("constructor", () => {
        it("constructs", () => {
            const config = mockBehaviorConfig("test");
            new FeaturesAtMouseEventBehavior(
                config,
                new ClickBoundingBoxBehavior(config),
                new PixelDistanceBehavior(config)
            );
        });
    });

    describe("api", () => {
        describe("find", () => {
            it("returns nothing if nothing in store", () => {
                const config = mockBehaviorConfig("test");
                const featuresAtMouseEventBehavior = new FeaturesAtMouseEventBehavior(
                    config,
                    new ClickBoundingBoxBehavior(config),
                    new PixelDistanceBehavior(config)
                );
                // Mock the unproject to return a valid set
                // of bbox coordinates
                mockBoundingBoxUnproject(config.unproject as jest.Mock);

                const result = featuresAtMouseEventBehavior.find(
                    mockDrawEvent(),
                    false
                );
                expect(result).toStrictEqual({
                    clickedFeature: undefined,
                    clickedMidPoint: undefined,
                });
            });

            it("ignores selection point", () => {
                const config = mockBehaviorConfig("test");
                const featuresAtMouseEventBehavior = new FeaturesAtMouseEventBehavior(
                    config,
                    new ClickBoundingBoxBehavior(config),
                    new PixelDistanceBehavior(config)
                );

                config.store.create([
                    {
                        geometry: {
                            type: "Point",
                            coordinates: [0, 0],
                        },
                        properties: {
                            selectionPoint: true,
                        },
                    },
                ]);

                // Mock the unproject to return a valid set
                // of bbox coordinates
                mockBoundingBoxUnproject(config.unproject as jest.Mock);

                const result = featuresAtMouseEventBehavior.find(
                    mockDrawEvent(),
                    false
                );

                expect(result).toStrictEqual({
                    clickedFeature: undefined,
                    clickedMidPoint: undefined,
                });
            });

            it("returns clicked feature", () => {
                const config = mockBehaviorConfig("test");
                const featuresAtMouseEventBehavior = new FeaturesAtMouseEventBehavior(
                    config,
                    new ClickBoundingBoxBehavior(config),
                    new PixelDistanceBehavior(config)
                );

                // Mock the unproject to return a valid set
                // of bbox coordinates
                mockBoundingBoxUnproject(config.unproject as jest.Mock);

                createStorePolygon(config);
                createStoreLineString(config);
                createStorePoint(config);

                (config.project as jest.Mock)
                    .mockImplementationOnce(() => ({
                        x: 0,
                        y: 0,
                    }))
                    .mockImplementationOnce(() => ({
                        x: 0,
                        y: 0,
                    }))
                    .mockImplementationOnce(() => ({
                        x: 0,
                        y: 0,
                    }));

                const result = featuresAtMouseEventBehavior.find(
                    mockDrawEvent(),
                    false
                );

                expect((result.clickedFeature as GeoJSONStoreFeatures).id).toBeUUID4();
            });

            it("returns midpoint", () => {
                const config = mockBehaviorConfig("test");
                const featuresAtMouseEventBehavior = new FeaturesAtMouseEventBehavior(
                    config,
                    new ClickBoundingBoxBehavior(config),
                    new PixelDistanceBehavior(config)
                );

                // Mock the unproject to return a valid set
                // of bbox coordinates
                mockBoundingBoxUnproject(config.unproject as jest.Mock);

                createStorePolygon(config);
                createStoreMidPoint(config);

                (config.project as jest.Mock)
                    .mockImplementationOnce(() => ({
                        x: 0,
                        y: 0,
                    }))
                    .mockImplementationOnce(() => ({
                        x: 0,
                        y: 0,
                    }))
                    .mockImplementationOnce(() => ({
                        x: 0,
                        y: 0,
                    }));

                const result = featuresAtMouseEventBehavior.find(mockDrawEvent(), true);

                expect((result.clickedMidPoint as GeoJSONStoreFeatures).id).toBeUUID4();
            });
        });
    });
});
