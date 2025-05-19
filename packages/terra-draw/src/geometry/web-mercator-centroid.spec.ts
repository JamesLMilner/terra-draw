import { Feature, Polygon } from "geojson";
import { webMercatorCentroid } from "./web-mercator-centroid";

describe("webMercatorCentroid", () => {
	it("returns the web mercator center correctly for polygon", () => {
		const result = webMercatorCentroid({
			type: "Feature",
			properties: {},
			geometry: {
				coordinates: [
					[
						[60.15177901043299, 18.599398042438764],
						[60.15177901043299, 12.900268744312697],
						[63.75086634124065, 12.900268744312697],
						[63.75086634124065, 18.599398042438764],
						[60.15177901043299, 18.599398042438764],
					],
				],
				type: "Polygon",
			},
		});

		expect(result.x).toBeCloseTo(6896389.694243949);
		expect(result.y).toBeCloseTo(1778084.1594212381);
	});

	it("returns the web mercator center correctly for polygon deterministically for the environment", () => {
		const polygon = {
			type: "Feature",
			properties: {},
			geometry: {
				coordinates: [
					[
						[60.15177901043299, 18.599398042438764],
						[60.15177901043299, 12.900268744312697],
						[63.75086634124065, 12.900268744312697],
						[63.75086634124065, 18.599398042438764],
						[60.15177901043299, 18.599398042438764],
					],
				],
				type: "Polygon",
			},
		} as Feature<Polygon>;
		const result = webMercatorCentroid(polygon);
		const result2 = webMercatorCentroid(polygon);

		expect(result.x).toEqual(result2.x);
		expect(result.y).toEqual(result2.y);
	});

	it("returns the web mercator center correctly for linestring", () => {
		const result = webMercatorCentroid({
			type: "Feature",
			properties: {},
			geometry: {
				coordinates: [
					[60.15177901043299, 18.599398042438764],
					[60.15177901043299, 12.900268744312697],
					[63.75086634124065, 12.900268744312697],
				],
				type: "LineString",
			},
		});

		expect(result.x).toBeCloseTo(6829614.932746265);
		expect(result.y).toBeCloseTo(1668169.6040318909);
	});
});
