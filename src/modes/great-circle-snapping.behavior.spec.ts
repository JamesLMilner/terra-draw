import { createStoreLineString } from "../test/create-store-features";
import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { BehaviorConfig } from "./base.behavior";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { GreatCircleSnappingBehavior } from "./great-circle-snapping.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";

describe("GreatCircleSnappingBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
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
			config = MockBehaviorConfig("test");
			snappingBehavior = new GreatCircleSnappingBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});

		describe("getSnappableCoordinate", () => {
			it("returns undefined if not snappable", () => {
				const snappedCoord = snappingBehavior.getSnappableCoordinate(
					MockCursorEvent({ lng: 0, lat: 0 }),
					"mockId",
				);

				expect(snappedCoord).toBe(undefined);
			});

			it("returns a snappable coordinate if one exists", () => {
				// Ensure there is something to snap too by
				// creating an existing polygon
				createStoreLineString(config);

				const snappedCoord = snappingBehavior.getSnappableCoordinate(
					MockCursorEvent({ lng: 0, lat: 0 }),
					"currentId",
				);

				expect(snappedCoord).toStrictEqual([0, 0]);

				const snappedCoordTwo = snappingBehavior.getSnappableCoordinate(
					MockCursorEvent({ lng: 0, lat: 1 }),
					"currentId",
				);

				expect(snappedCoordTwo).toStrictEqual([0, 1]);
			});
		});
	});
});
