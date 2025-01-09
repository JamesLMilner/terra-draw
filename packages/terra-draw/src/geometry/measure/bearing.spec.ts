import { bearing } from "./bearing";

describe("bearing", () => {
	it("bearing between two identical points is zero", () => {
		expect(bearing([0, 0], [0, 0])).toBe(0);
	});

	it("bearing should return positive value", () => {
		expect(bearing([0, 0], [1, 1])).toBe(44.99563645534486);
	});
});
