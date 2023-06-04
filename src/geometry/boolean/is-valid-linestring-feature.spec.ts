import { Feature, LineString } from "geojson";
import { isValidLineStringFeature } from "./is-valid-linestring-feature";

describe("isValidLineStringFeature", () => {
	it("returns true for a valid LineString feature with correct coordinate precision", () => {
		const validFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "LineString",
				coordinates: [
					[45, 80],
					[46, 81],
				],
			},
		} as Feature<LineString, Record<string, any>>;
		expect(isValidLineStringFeature(validFeature, 9)).toBe(true);
	});

	it("returns false for a non-LineString feature", () => {
		const nonLineStringFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[45, 80],
					[46, 81],
					[45, 80],
				],
			},
		} as any;
		expect(isValidLineStringFeature(nonLineStringFeature, 9)).toBe(false);
	});

	it("returns false for a LineString feature with less than 2 coordinates", () => {
		const lessCoordinatesFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "LineString",
				coordinates: [[45, 90]],
			},
		} as Feature<LineString, Record<string, any>>;
		expect(isValidLineStringFeature(lessCoordinatesFeature, 9)).toBe(false);
	});

	it("returns false for a LineString feature with incorrect coordinate precision", () => {
		const validFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "LineString",
				coordinates: [
					[45.123, 80.123],
					[46.123, 81.123],
				],
			},
		} as Feature<LineString, Record<string, any>>;
		expect(isValidLineStringFeature(validFeature, 2)).toBe(false);
	});
});
