import { lngLatToWebMercatorXY, webMercatorXYToLngLat } from "./web-mercator";

describe("web mercator", () => {
	describe("lngLatToWebMercatorXY", () => {
		it("returns x,y of 0,0 web mercator coordinates from lng,lat of 0,0", () => {
			const result = lngLatToWebMercatorXY(0, 0);
			expect(result).toStrictEqual({ x: 0, y: 0 });
		});

		it("returns correct x,y web mercator coordinates for lng, lat", () => {
			const result = lngLatToWebMercatorXY(179, 89);
			expect(result).toStrictEqual({
				x: 19926188.85199597,
				y: 30240971.958386205,
			});
		});

		it("returns correct x,y web mercator coordinates for lng, lat", () => {
			const result = lngLatToWebMercatorXY(-179, -89);
			expect(result).toStrictEqual({
				x: -19926188.85199597,
				y: -30240971.95838617,
			});
		});
	});

	describe("webMercatorXYToLngLat", () => {
		it("returns x,y of 0,0 web mercator coordinates from lng,lat of 0,0", () => {
			const result = webMercatorXYToLngLat(0, 0);
			expect(result).toStrictEqual({ lng: 0, lat: 0 });
		});

		it("returns correct x,y web mercator coordinates for lng, lat", () => {
			const result = webMercatorXYToLngLat(
				19926188.85199597,
				30240971.958386205,
			);
			expect(result).toStrictEqual({ lng: 179, lat: 89.00000000000001 }); // TODO: should we limit precision?
		});

		it("returns correct x,y web mercator coordinates for lng, lat", () => {
			const result = webMercatorXYToLngLat(
				-19926188.85199597,
				-30240971.95838617,
			);
			expect(result).toStrictEqual({ lng: -179, lat: -89 });
		});
	});
});
