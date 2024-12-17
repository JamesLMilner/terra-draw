import { Feature, LineString } from "geojson";
import { ValidateLineStringFeature } from "./linestring.validation";

describe("ValidateLineStringFeature", () => {
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
		expect(ValidateLineStringFeature(validFeature, 9)).toEqual({ valid: true });
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
		expect(ValidateLineStringFeature(nonLineStringFeature, 9)).toEqual({
			valid: false,
			reason: "Feature is not a LineString",
		});
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
		expect(ValidateLineStringFeature(lessCoordinatesFeature, 9)).toEqual({
			valid: false,
			reason: "Feature has less than 2 coordinates",
		});
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
		expect(ValidateLineStringFeature(validFeature, 2)).toEqual({
			valid: false,
			reason: "Feature has invalid coordinates",
		});
	});
});
