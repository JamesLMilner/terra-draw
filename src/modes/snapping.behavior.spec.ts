import { createStorePolygon } from "../test/create-store-features";
import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { BehaviorConfig } from "./base.behavior";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";
import { SnappingBehavior } from "./snapping.behavior";

describe("SnappingBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
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
			config = MockBehaviorConfig("test");
			snappingBehavior = new SnappingBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});

		describe("getSnappablePolygonCoord", () => {
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
				createStorePolygon(config);

				const snappedCoord = snappingBehavior.getSnappableCoordinate(
					MockCursorEvent({ lng: 0, lat: 0 }),
					"currentId",
				);

				expect(snappedCoord).toStrictEqual([0, 0]);
			});
		});
	});
});
