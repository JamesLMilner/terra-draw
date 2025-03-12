import { followsRightHandRule } from "./right-hand-rule";
import { Polygon } from "geojson";

describe("followsRightHandRule", () => {
	test("returns true for a counterclockwise (right-hand rule) polygon", () => {
		const counterclockwisePolygon: Polygon = {
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[4, 0],
					[4, 4],
					[0, 4],
					[0, 0], // Counterclockwise order
				],
			],
		};

		expect(followsRightHandRule(counterclockwisePolygon)).toBe(true);
	});

	test("returns false for a clockwise (left-hand rule) polygon", () => {
		const clockwisePolygon: Polygon = {
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[0, 4],
					[4, 4],
					[4, 0],
					[0, 0], // Clockwise order
				],
			],
		};

		expect(followsRightHandRule(clockwisePolygon)).toBe(false);
	});

	test("returns true for an irregular counterclockwise polygon", () => {
		const irregularCCWPolygon: Polygon = {
			type: "Polygon",
			coordinates: [
				[
					[1, 1],
					[3, 0],
					[4, 2],
					[3, 4],
					[1, 3],
					[1, 1], // Counterclockwise order
				],
			],
		};

		expect(followsRightHandRule(irregularCCWPolygon)).toBe(true);
	});

	test("returns false for an irregular clockwise polygon", () => {
		const irregularCWPolygon: Polygon = {
			type: "Polygon",
			coordinates: [
				[
					[1, 1],
					[1, 3],
					[3, 4],
					[4, 2],
					[3, 0],
					[1, 1], // Clockwise order
				],
			],
		};

		expect(followsRightHandRule(irregularCWPolygon)).toBe(false);
	});

	test("returns true for a large counterclockwise polygon", () => {
		const largeCCWPolygon: Polygon = {
			type: "Polygon",
			coordinates: [
				[
					[-10, -10],
					[10, -10],
					[10, 10],
					[-10, 10],
					[-10, -10], // Counterclockwise order
				],
			],
		};

		expect(followsRightHandRule(largeCCWPolygon)).toBe(true);
	});

	test("returns false for a small clockwise polygon", () => {
		const smallCWPolygon: Polygon = {
			type: "Polygon",
			coordinates: [
				[
					[2, 2],
					[2, 3],
					[3, 3],
					[3, 2],
					[2, 2], // Clockwise order
				],
			],
		};

		expect(followsRightHandRule(smallCWPolygon)).toBe(false);
	});
});
