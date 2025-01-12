import { webMercatorCentroid } from "./web-mercator-centroid";

describe("webMercatorCenter", () => {
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

		expect(result.x).toBeCloseTo(6896389.694243925);
		expect(result.y).toBeCloseTo(1778084.1594212381);
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
