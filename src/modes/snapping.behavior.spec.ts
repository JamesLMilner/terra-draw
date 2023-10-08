import { createStorePolygon } from "../test/create-store-features";
import { mockBehaviorConfig } from "../test/mock-behavior-config";
import { mockDrawEvent } from "../test/mock-mouse-event";
import { mockProject } from "../test/mock-project";
import { mockBoundingBoxUnproject } from "../test/mock-unproject";
import { BehaviorConfig } from "./base.behavior";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";
import { SnappingBehavior } from "./snapping.behavior";

describe("SnappingBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = mockBehaviorConfig("test");
			new SnappingBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});
	});

	describe("api", () => {
		let config: BehaviorConfig;
		let snappingBehavior: SnappingBehavior;

		beforeEach(() => {
			config = mockBehaviorConfig("test");
			snappingBehavior = new SnappingBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});

		describe("getSnappablePolygonCoord", () => {
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
				createStorePolygon(config);

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

				expect(snappedCoord).toStrictEqual([0, 0]);
			});
		});
	});
});
