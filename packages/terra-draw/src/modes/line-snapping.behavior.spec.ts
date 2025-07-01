import { createStorePolygon } from "../test/create-store-features";
import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { BehaviorConfig } from "./base.behavior";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";
import { LineSnappingBehavior } from "./line-snapping.behavior";
import { coordinatePrecisionIsValid } from "../geometry/boolean/is-valid-coordinate";

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
						expect(snappedCoord && snappedCoord[1]).toBeCloseTo(0.5);

						expect(
							coordinatePrecisionIsValid(
								snappedCoord!,
								config.coordinatePrecision,
							),
						).toBe(true);
					});

					it("returns a snappable coordinate if one exists, respecting the coordinate precision", () => {
						config = MockBehaviorConfig("test", projection, 100);
						lineSnappingBehavior = new LineSnappingBehavior(
							config,
							new PixelDistanceBehavior(config),
							new ClickBoundingBoxBehavior(config),
						);

						// Ensure there is something to snap too by
						// creating an existing polygon
						createStorePolygon(config);

						const snapped = lineSnappingBehavior.getSnappableCoordinate(
							MockCursorEvent({ lng: -0.5, lat: 0.5 }),
							"currentId",
						);

						expect(snapped && snapped[0]).toBeCloseTo(0);
						expect(snapped && snapped[1]).toBeCloseTo(
							projection === "web-mercator"
								? 0.4999999999999944
								: 0.5000190382262164,
							20,
						);

						expect(coordinatePrecisionIsValid(snapped!, 100)).toBe(true);
					});
				});

				describe("getSnappable", () => {
					it("returns undefined if not snappable", () => {
						const snapped = lineSnappingBehavior.getSnappable(
							MockCursorEvent({ lng: 0, lat: 0 }),
						);

						expect(snapped).toEqual({
							coordinate: undefined,
							featureCoordinateIndex: undefined,
							featureId: undefined,
							minDistance: Infinity,
						});
					});

					it("returns a snappable coordinate if one exists", () => {
						// Ensure there is something to snap too by
						// creating an existing polygon
						createStorePolygon(config);

						const snapped = lineSnappingBehavior.getSnappable(
							MockCursorEvent({ lng: 0, lat: 0 }),
						);

						expect(snapped).toEqual({
							coordinate: [0, 0],
							featureCoordinateIndex: 0,
							featureId: expect.any(String),
							minDistance: 0,
						});
					});

					it("returns a snappable coordinate if one exists", () => {
						// Ensure there is something to snap too by
						// creating an existing polygon
						createStorePolygon(config);

						const snapped = lineSnappingBehavior.getSnappable(
							MockCursorEvent({ lng: -0.5, lat: 0.5 }),
						);

						expect(snapped?.coordinate && snapped?.coordinate[0]).toBeCloseTo(
							0,
						);
						expect(snapped?.coordinate && snapped?.coordinate[1]).toBeCloseTo(
							0.5,
						);

						expect(
							coordinatePrecisionIsValid(
								snapped!.coordinate!,
								config.coordinatePrecision,
							),
						).toBe(true);
					});

					it("returns a snappable coordinate if one exists, respecting the coordinate precision", () => {
						config = MockBehaviorConfig("test", projection, 100);
						lineSnappingBehavior = new LineSnappingBehavior(
							config,
							new PixelDistanceBehavior(config),
							new ClickBoundingBoxBehavior(config),
						);

						// Ensure there is something to snap too by
						// creating an existing polygon
						createStorePolygon(config);

						const snapped = lineSnappingBehavior.getSnappable(
							MockCursorEvent({ lng: -0.5, lat: 0.5 }),
						);

						expect(snapped?.coordinate && snapped?.coordinate[0]).toBeCloseTo(
							0,
						);
						expect(snapped?.coordinate && snapped?.coordinate[1]).toBeCloseTo(
							projection === "web-mercator"
								? 0.4999999999999944
								: 0.5000190382262164,
							20,
						);

						expect(coordinatePrecisionIsValid(snapped.coordinate!, 100)).toBe(
							true,
						);
					});
				});
			},
		);
	});
});
