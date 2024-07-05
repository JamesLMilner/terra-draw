import { calculateWebMercatorDistortion } from "./web-mercator-distortion";

describe("Geometry", () => {
	describe("calculateWebMercatorDistortion", () => {
		it("returns 1 for identical coordinates", () => {
			const result = calculateWebMercatorDistortion([0, 0], [0, 0]);
			expect(result).toBe(1);
		});

		it("returns almost 1 for coordinates along the equator", () => {
			const result = calculateWebMercatorDistortion([0, 0], [179, 0]);
			expect(result).toBe(1.0011202323026207);
		});

		it("returns high value for high latitudes", () => {
			const result = calculateWebMercatorDistortion([0, 0], [0, 89]);
			expect(result).toBe(3.0557707265347394);
		});
	});
});
