import { bearing, webMercatorBearing } from "./bearing";

describe("bearing", () => {
	it("bearing between two identical points is zero", () => {
		expect(bearing([0, 0], [0, 0])).toBe(0);
	});

	it("bearing should return positive value", () => {
		expect(bearing([0, 0], [1, 1])).toBe(44.99563645534486);
	});
});

describe("webMercatorBearing", () => {
	it("bearing between two identical points is zero", () => {
		expect(webMercatorBearing({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
	});

	it("bearing should return positive value", () => {
		expect(webMercatorBearing({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(45);
	});
});
