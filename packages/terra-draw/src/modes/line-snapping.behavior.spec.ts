import { createStorePolygon } from "../test/create-store-features";
import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { BehaviorConfig } from "./base.behavior";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";
import { LineSnappingBehavior } from "./line-snapping.behavior";

describe("LineSnappingBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			new LineSnappingBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});
	});

	describe("api", () => {
		let config: BehaviorConfig;
		let lineSnappingBehavior: LineSnappingBehavior;

		describe.each(["globe", "web-mercator"] as const)(
			"getSnappableCoordinateFirstClick (%s)",
			(projection) => {
				beforeEach(() => {
					config = MockBehaviorConfig("test", projection);
					lineSnappingBehavior = new LineSnappingBehavior(
						config,
						new PixelDistanceBehavior(config),
						new ClickBoundingBoxBehavior(config),
					);
				});

				describe("getSnappableCoordinate", () => {
					it("returns undefined if not snappable", () => {
						const snappedCoord = lineSnappingBehavior.getSnappableCoordinate(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"mockId",
						);

						expect(snappedCoord).toBe(undefined);
					});

					it("returns a snappable coordinate if one exists", () => {
						// Ensure there is something to snap too by
						// creating an existing polygon
						createStorePolygon(config);

						const snappedCoord = lineSnappingBehavior.getSnappableCoordinate(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"currentId",
						);

						expect(snappedCoord).toStrictEqual([0, 0]);
					});

					it("returns a snappable coordinate if one exists", () => {
						// Ensure there is something to snap too by
						// creating an existing polygon
						createStorePolygon(config);

						const snappedCoord = lineSnappingBehavior.getSnappableCoordinate(
							MockCursorEvent({ lng: -0.5, lat: 0.5 }),
							"currentId",
						);

						expect(snappedCoord && snappedCoord[0]).toBeCloseTo(0);
						expect(snappedCoord && snappedCoord[1]).toBeCloseTo(
							0.5000190382262164,
						);
					});
				});
			},
		);
	});
});
