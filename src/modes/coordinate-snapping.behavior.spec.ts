import { createStorePolygon } from "../test/create-store-features";
import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { BehaviorConfig } from "./base.behavior";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";
import { CoordinateSnappingBehavior } from "./coordinate-snapping.behavior";

describe("CoordinateSnappingBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			new CoordinateSnappingBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});
	});

	describe("api", () => {
		let config: BehaviorConfig;
		let coordinateSnappingBehavior: CoordinateSnappingBehavior;

		beforeEach(() => {
			config = MockBehaviorConfig("test");
			coordinateSnappingBehavior = new CoordinateSnappingBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});

		describe("getSnappableCoordinate", () => {
			it("returns undefined if not snappable", () => {
				const snappedCoord = coordinateSnappingBehavior.getSnappableCoordinate(
					MockCursorEvent({ lng: 0, lat: 0 }),
					"mockId",
				);

				expect(snappedCoord).toBe(undefined);
			});

			it("returns a snappable coordinate if one exists", () => {
				// Ensure there is something to snap too by
				// creating an existing polygon
				createStorePolygon(config);

				const snappedCoord = coordinateSnappingBehavior.getSnappableCoordinate(
					MockCursorEvent({ lng: 0, lat: 0 }),
					"currentId",
				);

				expect(snappedCoord).toStrictEqual([0, 0]);
			});
		});
	});
});
