import { Feature, Point } from "geojson";
import { ValidatePointFeature } from "./point.validation";

describe("isValidPoint", () => {
	it("returns true for a valid Point with correct coordinate precision", () => {
		const validPoint = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Point",
				coordinates: [45, 90],
			},
		} as Feature<Point, Record<string, any>>;
		expect(ValidatePointFeature(validPoint, 2)).toEqual({ valid: true });
	});

	it("returns false for a non-Point feature", () => {
		const nonPointFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "LineString",
				coordinates: [
					[45, 90],
					[46, 91],
				],
			},
		} as any;
		expect(ValidatePointFeature(nonPointFeature, 2)).toEqual({
			valid: false,
			reason: "Feature is not a Point",
		});
	});

	it("returns false for a Point with incorrect coordinate precision", () => {
		const invalidPoint = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Point",
				coordinates: [45.123, 90.123],
			},
		} as Feature<Point, Record<string, any>>;
		expect(ValidatePointFeature(invalidPoint, 2)).toEqual({
			valid: false,
			reason:
				"Feature has invalid coordinates with excessive coordinate precision",
		});
	});
});
