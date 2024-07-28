import { Feature, LineString, Polygon } from "geojson";
import { transformRotate, transformRotateWebMercator } from "./rotate";

describe("rotate", () => {
	let polygon: Feature<Polygon>;
	let lineString: Feature<LineString>;

	beforeEach(() => {
		polygon = {
			type: "Feature",
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
				],
			},
			properties: {},
		} as Feature<Polygon>;

		lineString = {
			type: "Feature",
			geometry: {
				type: "LineString",
				coordinates: [
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				],
			},
			properties: {},
		} as Feature<LineString>;
	});

	describe("transformRotate", () => {
		it("returns polygon unchanged when angle is set to 0", () => {
			const result = transformRotate(polygon, 0);
			expect(result.geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
			]);
		});

		it("returns polygon unchanged when angle is set to 360", () => {
			const result = transformRotate(polygon, 360);
			expect(result.geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
			]);
		});

		it("rotates a given Polygon correctly", () => {
			const result = transformRotate(polygon, 180);
			expect(result).toStrictEqual({
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[1.0000380803192002, 0.9999999999999983],
							[0.9999619225808374, -9.93923337957349e-17],
							[0.00003807741916261875, -2.981770013872047e-16],
							[-0.000038080319200162194, 0.9999999999999983],
							[1.0000380803192002, 0.9999999999999983],
						],
					],
				},
				properties: {},
			});
		});

		it("rotates a given LineString correctly", () => {
			const result = transformRotate(lineString, 180);
			expect(result).toStrictEqual({
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: [
						[1.0000380803192002, 0.9999999999999983],
						[0.9999619225808374, -9.93923337957349e-17],
						[0.00003807741916261875, -2.981770013872047e-16],
						[-0.000038080319200162194, 0.9999999999999983],
					],
				},
				properties: {},
			});
		});
	});

	describe("transformRotateWebMercator", () => {
		it("returns a polygon unchanged when is set to 0", () => {
			const result = transformRotateWebMercator(polygon, 0);
			expect(result.geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
			]);
		});

		it("returns a polygon unchanged when angle is set to 360", () => {
			const result = transformRotateWebMercator(polygon, 0);
			expect(result.geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
			]);
		});
	});
});
