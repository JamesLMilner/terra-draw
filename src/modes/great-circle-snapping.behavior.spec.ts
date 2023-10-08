import { createStoreLineString } from "../test/create-store-features";
import { mockBehaviorConfig } from "../test/mock-behavior-config";
import { mockDrawEvent } from "../test/mock-mouse-event";
import { mockProject } from "../test/mock-project";
import { mockBoundingBoxUnproject } from "../test/mock-unproject";
import { BehaviorConfig } from "./base.behavior";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { GreatCircleSnappingBehavior } from "./great-circle-snapping.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";

describe("GreatCircleSnappingBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = mockBehaviorConfig("test");
			new GreatCircleSnappingBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});
	});

	describe("api", () => {
		let config: BehaviorConfig;
		let snappingBehavior: GreatCircleSnappingBehavior;

		beforeEach(() => {
			config = mockBehaviorConfig("test");
			snappingBehavior = new GreatCircleSnappingBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});

		describe("getSnappableCoordinate", () => {
			it("returns undefined if not snappable", () => {
				// Mock the unproject to return a valid set
				// of bbox coordinates
				mockBoundingBoxUnproject(config.unproject as jest.Mock);

				const snappedCoord = snappingBehavior.getSnappableCoordinate(
					mockDrawEvent(),
					"mockId",
				);

				expect(snappedCoord).toBe(undefined);
			});

			it("returns a snappable coordinate if one exists", () => {
				// Ensure there is something to snap too by
				// creating an existing polygon
				createStoreLineString(config);

				// Mock the unproject to return a valid set
				// of bbox coordinates
				mockBoundingBoxUnproject(config.unproject as jest.Mock);

				// Pixel distance will project each point to check the distance
				// for snapping
				mockProject(config.project as jest.Mock);

				const snappedCoord = snappingBehavior.getSnappableCoordinate(
					mockDrawEvent(),
					"currentId",
				);

				expect(snappedCoord).toStrictEqual([0, 1]);
			});
		});
	});
});
