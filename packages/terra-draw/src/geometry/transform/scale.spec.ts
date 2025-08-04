import { Feature, LineString, Polygon, Position } from "geojson";
import { transformScaleWebMercatorCoordinates } from "./scale";
import { webMercatorCentroid } from "../web-mercator-centroid";
import { webMercatorXYToLngLat } from "../project/web-mercator";

describe("scale", () => {
	describe("transformScaleWebMercatorCoordinates", () => {
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
			transformScaleWebMercatorCoordinates({
				coordinates: polygon.geometry.coordinates[0],
				originX: polygonCenter[0],
				originY: polygonCenter[1],
				xScale: 1,
				yScale: 1,
			});

			expect(polygon.geometry.coordinates).toStrictEqual([
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
			transformScaleWebMercatorCoordinates({
				coordinates: polygon.geometry.coordinates[0],
				originX: polygonCenter[0],
				originY: polygonCenter[1],
				xScale: 2,
				yScale: 2,
			});

			expect(polygon.geometry.coordinates).toStrictEqual([
				[
					[-0.000004491576420597606, -0.00000449174745800546],
					[-0.000004491576420597606, 1.9996909631424498],
					[1.9999955084235796, 1.9996909631424498],
					[1.9999955084235796, -0.00000449174745800546],
					[-0.000004491576420597606, -0.00000449174745800546],
				],
			]);
		});

		it("scales a given LineString correctly when scale factor is 2", () => {
			transformScaleWebMercatorCoordinates({
				coordinates: lineString.geometry.coordinates,
				originX: lineStringCenter[0],
				originY: lineStringCenter[1],
				xScale: 2,
				yScale: 2,
			});

			expect(lineString.geometry.coordinates).toStrictEqual([
				[-0.000004491576420597607, -0.00000449174745800546],
				[-0.000004491576420597607, 1.9996909631424498],
				[1.9999955084235796, 1.9996909631424498],
				[1.9999955084235796, -0.00000449174745800546],
			]);
		});
	});
});
