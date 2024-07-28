import { Feature, LineString, Polygon, Position } from "geojson";
import { transformScale, transformScaleWebMercator } from "./scale";
import { centroid } from "../centroid";
import { webMercatorCentroid } from "../web-mercator-centroid";
import { webMercatorXYToLngLat } from "../project/web-mercator";

describe("scale", () => {
	describe("transformScale", () => {
		it("returns a polygon as is if scale is set to 1", () => {
			const polygon = {
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
			const origin = centroid(polygon);
			const result = transformScale(polygon, 1, origin);
			expect(result).toStrictEqual(polygon);
		});

		it("scales a given Polygon correctly when scale factor is 2", () => {
			const polygon = {
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
			const origin = centroid(polygon);
			const result = transformScale(polygon, 2, origin);
			expect(result).toStrictEqual({
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[-0.5, -0.4999999999999963],
							[-0.5000761693402183, 1.5],
							[1.5000761693402183, 1.5],
							[1.5, -0.4999999999999963],
							[-0.5, -0.4999999999999963],
						],
					],
				},
				properties: {},
			});
		});

		it("scales a given LineString correctly when scale factor is 2", () => {
			const linestring = {
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
			const origin = centroid(linestring);
			const result = transformScale(linestring, 2, origin);
			expect(result).toStrictEqual({
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: [
						[-0.5, -0.4999999999999963],
						[-0.5000761693402183, 1.5],
						[1.5000761693402183, 1.5],
						[1.5, -0.4999999999999963],
					],
				},
				properties: {},
			});
		});
	});

	describe("transformScaleWebMercator", () => {
		let polygon: Feature<Polygon>;
		let lineString: Feature<LineString>;
		let polygonCenter: Position;
		let lineStringCenter: Position;

		beforeEach(() => {
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
			const centerLineString = webMercatorCentroid(lineString);
			const lineStringWebMercatorCenter = webMercatorXYToLngLat(
				centerLineString.x,
				centerLineString.y,
			);
			lineStringCenter = [
				lineStringWebMercatorCenter.lng,
				lineStringWebMercatorCenter.lat,
			];

			const center = webMercatorCentroid(polygon);
			const polygonWebMercatorCenter = webMercatorXYToLngLat(
				center.x,
				center.y,
			);
			polygonCenter = [
				polygonWebMercatorCenter.lng,
				polygonWebMercatorCenter.lat,
			];
		});

		it("returns a polygon as is if scale is set to 1", () => {
			const result = transformScaleWebMercator(polygon, 1, polygonCenter);
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

		it("scales a given Polygon correctly when scale factor is 2", () => {
			const result = transformScaleWebMercator(polygon, 2, polygonCenter);
			expect(result.geometry.coordinates).toStrictEqual([
				[
					[-0.4999999999999999, -0.5000190396762169],
					[-0.4999999999999999, 1.499904816116831],
					[1.5000000000000002, 1.499904816116831],
					[1.5000000000000002, -0.5000190396762169],
					[-0.4999999999999999, -0.5000190396762169],
				],
			]);
		});

		it("scales a given LineString correctly when scale factor is 2", () => {
			const result = transformScale(lineString, 2, lineStringCenter);
			expect(result).toStrictEqual({
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: [
						[-0.5, -0.5000190396762128],
						[-0.5000761664393849, 1.499980960323781],
						[1.500076166439385, 1.499980960323781],
						[1.5, -0.5000190396762132],
					],
				},
				properties: {},
			});
		});
	});
});
