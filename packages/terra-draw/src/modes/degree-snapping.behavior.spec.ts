import { LineString, Polygon } from "geojson";
import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { bearing } from "../geometry/measure/bearing";
import { destination } from "../geometry/measure/destination";
import { DegreeSnappingBehavior } from "./degree-snapping.behavior";

describe("DegreeSnappingBehavior", () => {
	const line: LineString = {
		type: "LineString",
		coordinates: [
			[0, 0],
			[1, 0],
			[1, 0],
		],
	};

	describe.each(["web-mercator", "globe"] as const)("on %s", (projection) => {
		it("defaults to 90 degree snapping", () => {
			const behavior = new DegreeSnappingBehavior(
				MockBehaviorConfig("linestring", projection),
			);
			const snapped = behavior.getSnappableCoordinate(
				MockCursorEvent({ lng: 1.2, lat: 0.8 }),
				line,
				2,
			);

			expect(snapped).toBeDefined();
			expect(snapped?.[0]).toBeCloseTo(1, 3);
		});

		it("supports a custom degree interval", () => {
			const behavior = new DegreeSnappingBehavior(
				MockBehaviorConfig("linestring", projection),
			);
			const snapped = behavior.getSnappableCoordinate(
				MockCursorEvent({ lng: 1.6, lat: 0.5 }),
				line,
				2,
				{ degree: 45 },
			);

			expect(snapped).toBeDefined();
			expect(snapped?.[0]).toBeCloseTo(1.55, 1);
			expect(snapped?.[1]).toBeCloseTo(0.55, 1);
		});

		it("only snaps backwards when back tracking is enabled", () => {
			const behavior = new DegreeSnappingBehavior(
				MockBehaviorConfig("linestring", projection),
			);
			const event = MockCursorEvent({ lng: 0.2, lat: 0 });
			const withoutBackTracking = behavior.getSnappableCoordinate(
				event,
				line,
				2,
			);
			const withBackTracking = behavior.getSnappableCoordinate(event, line, 2, {
				backTracking: true,
			});

			expect(withoutBackTracking).toBeUndefined();
			expect(withBackTracking?.[0]).toBeCloseTo(0.2, 3);
		});
	});

	it("continues from the forward tangent of a globe segment", () => {
		const behavior = new DegreeSnappingBehavior(
			MockBehaviorConfig("linestring", "globe"),
		);
		const previous: [number, number] = [0, 60];
		const current: [number, number] = [30, 60];
		const forwardBearing = bearing(current, previous) + 180;
		const cursor = destination(current, 1_000, forwardBearing);
		const globeLine: LineString = {
			type: "LineString",
			coordinates: [previous, current, current],
		};

		const snapped = behavior.getSnappableCoordinate(
			MockCursorEvent({ lng: cursor[0], lat: cursor[1] }),
			globeLine,
			2,
		);

		expect(snapped).toBeDefined();
		expect(bearing(current, snapped!)).toBeCloseTo(forwardBearing, 6);
	});

	it.each(["web-mercator", "globe"] as const)(
		"offers a degree-constrained polygon closing coordinate on %s",
		(projection) => {
			const behavior = new DegreeSnappingBehavior(
				MockBehaviorConfig("polygon", projection),
			);
			const polygon: Polygon = {
				type: "Polygon",
				coordinates: [
					[
						[0, 0],
						[1, 0],
						[1, 1],
						[1, 1],
						[0, 0],
					],
				],
			};

			const snapped = behavior.getSnappableCoordinate(
				MockCursorEvent({ lng: 0.2, lat: 0.8 }),
				polygon,
				3,
			);

			expect(snapped?.[0]).toBeCloseTo(0, 2);
			expect(snapped?.[1]).toBeCloseTo(1, 2);
		},
	);

	it("uses every multiple of the interval for polygon closing", () => {
		const behavior = new DegreeSnappingBehavior(
			MockBehaviorConfig("polygon", "web-mercator"),
		);
		const polygon: Polygon = {
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[1, 0],
					[1, 1],
					[1, 1],
					[0, 0],
				],
			],
		};

		const snapped = behavior.getSnappableCoordinate(
			MockCursorEvent({ lng: 0.1, lat: 1 }),
			polygon,
			3,
			{ degree: 45 },
		);

		expect(snapped?.[0]).toBeCloseTo(0, 6);
		expect(snapped?.[1]).toBeCloseTo(1, 6);
	});

	it("does not snap until there are two committed coordinates", () => {
		const behavior = new DegreeSnappingBehavior(
			MockBehaviorConfig("linestring"),
		);
		expect(
			behavior.getSnappableCoordinate(
				MockCursorEvent({ lng: 1, lat: 1 }),
				line,
				1,
			),
		).toBeUndefined();
	});
});
