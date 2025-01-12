import { rhumbBearing } from "./rhumb-bearing";

describe("rhumbBearing", () => {
	it("gets rhumb bearing correctly", () => {
		const result = rhumbBearing([0, 0], [1, 1]);
		expect(result).toBe(44.99854548511024);
	});

	it("gets rhumb bearing correctly", () => {
		for (let i = 0; i < 180; i++) {
			const result = rhumbBearing([i, i / 2], [-i, -(i / 2)]);
			const result2 = rhumbBearing([-i, -(i / 2)], [i, i / 2]);
			expect(typeof result).toBe("number");
			expect(typeof result2).toBe("number");
		}
	});
});
