import { Feature, Point } from "geojson";
import { isValidPoint } from "./is-valid-point";

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
		expect(isValidPoint(validPoint, 2)).toBe(true);
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
		expect(isValidPoint(nonPointFeature, 2)).toBe(false);
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
		expect(isValidPoint(invalidPoint, 2)).toBe(false);
	});
});
