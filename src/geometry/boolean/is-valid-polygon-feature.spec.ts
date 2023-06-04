import { Feature, Polygon } from "geojson";
import {
	isValidNonIntersectingPolygonFeature,
	isValidPolygonFeature,
} from "./is-valid-polygon-feature";

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
		expect(isValidPolygonFeature(validFeature, 9)).toBe(true);
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
		expect(isValidPolygonFeature(nonPolygonFeature, 9)).toBe(false);
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
		expect(isValidPolygonFeature(multiCoordinatesFeature, 9)).toBe(false);
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
		expect(isValidPolygonFeature(lessCoordinatesFeature, 9)).toBe(false);
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
		expect(isValidPolygonFeature(nonMatchingCoordinatesFeature, 9)).toBe(false);
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
		expect(isValidPolygonFeature(validFeature, 9)).toBe(false);
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
		expect(isValidNonIntersectingPolygonFeature(validFeature, 9)).toBe(true);
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
		expect(isValidNonIntersectingPolygonFeature(validFeature, 9)).toBe(false);
	});
});
