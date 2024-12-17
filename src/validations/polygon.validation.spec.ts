import { Feature, Polygon } from "geojson";
import {
	ValidateNonIntersectingPolygonFeature,
	ValidatePolygonFeature,
} from "./polygon.validation";

describe("isValidPolygonFeature", () => {
	it("returns true for a valid Polygon feature", () => {
		const validFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[45, 80],
						[46, 80],
						[46, 81],
						[45, 80],
					],
				],
			},
		} as Feature<Polygon, Record<string, any>>;
		expect(ValidatePolygonFeature(validFeature, 9)).toEqual({ valid: true });
	});

	it("returns false for non-Polygon feature", () => {
		const nonPolygonFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Point",
				coordinates: [[45, 90]],
			},
		} as any;
		expect(ValidatePolygonFeature(nonPolygonFeature, 9)).toEqual({
			valid: false,
			reason: "Feature is not a Polygon",
		});
	});

	it("returns false for Polygon feature with more than one coordinates array", () => {
		const multiCoordinatesFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[45, 80],
						[46, 80],
						[46, 81],
						[45, 80],
					],
					[
						[45, 80],
						[46, 80],
						[46, 81],
						[45, 80],
					],
				],
			},
		} as Feature<Polygon, Record<string, any>>;
		expect(ValidatePolygonFeature(multiCoordinatesFeature, 9)).toEqual({
			valid: false,
			reason: "Feature has holes",
		});
	});

	it("returns false for Polygon feature with less than 4 coordinates in array", () => {
		const lessCoordinatesFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[45, 80],
						[46, 80],
						[46, 81],
					],
				],
			},
		} as Feature<Polygon, Record<string, any>>;
		expect(ValidatePolygonFeature(lessCoordinatesFeature, 9)).toEqual({
			valid: false,
			reason: "Feature has less than 4 coordinates",
		});
	});

	it("returns false for Polygon feature where first and last coordinates do not match", () => {
		const nonMatchingCoordinatesFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[45, 80],
						[46, 80],
						[46, 81],
						[47, 82],
					],
				],
			},
		} as Feature<Polygon, Record<string, any>>;
		expect(ValidatePolygonFeature(nonMatchingCoordinatesFeature, 9)).toEqual({
			valid: false,
			reason: "Feature coordinates are not closed",
		});
	});

	it("returns false Polygon with excessive coordinate precision", () => {
		const validFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[45.00000000001, 80.00000000001],
						[46.00000000001, 80.00000000001],
						[46.00000000001, 81.00000000001],
						[45.00000000001, 80.00000000001],
					],
				],
			},
		} as Feature<Polygon, Record<string, any>>;
		expect(ValidatePolygonFeature(validFeature, 9)).toEqual({
			valid: false,
			reason: "Feature has invalid coordinates",
		});
	});
});

describe("isValidNonIntersectingPolygonFeature", () => {
	it("returns true for a non self intersecting Polygon feature", () => {
		const validFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[45, 80],
						[46, 80],
						[46, 81],
						[45, 80],
					],
				],
			},
		} as Feature<Polygon, Record<string, any>>;
		expect(ValidateNonIntersectingPolygonFeature(validFeature, 9)).toEqual({
			valid: true,
		});
	});

	it("returns false for a self intersecting Polygon feature", () => {
		const validFeature = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[32.4444915, 14.5054203],
						[30.3079481, 14.5054203],
						[34.0641062, 12.9567495],
						[30.3079481, 11.6337171],
						[32.4444915, 11.6337171],
						[32.4444915, 14.5054203],
					],
				],
			},
		} as Feature<Polygon, Record<string, any>>;
		expect(ValidateNonIntersectingPolygonFeature(validFeature, 9)).toEqual({
			valid: false,
			reason: "Feature intersects itself",
		});
	});
});
