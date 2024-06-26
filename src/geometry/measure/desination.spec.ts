import { destination } from "./destination";

describe("destination", () => {
	it("bearing between two identical points is zero", () => {
		expect(destination([0, 0], 0, 0)).toEqual([0, 0]);
	});

	it("bearing should return positive value", () => {
		expect(destination([0, 0], 1, 1)).toEqual([
			0.00015695304633900835, 0.008991833928760623,
		]);
	});
});
