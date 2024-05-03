import { webMercatorCenter } from "./web-mercator-center";

describe("webMercatorCenter", () => {
	it("returns the web mecator center correctly", () => {
		const result = webMercatorCenter({
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

		expect(result).toStrictEqual({
			x: 6896389.694243937,
			y: 1778084.1594212404,
		});
	});
});
