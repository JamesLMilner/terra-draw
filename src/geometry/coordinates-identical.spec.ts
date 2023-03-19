import { coordinatesIdentical } from "./coordinates-identical";

describe("coordinatesIdentical", () => {
	it("returns false when coordinates not identical", () => {
		const result = coordinatesIdentical([0, 0], [1, 1]);

		expect(result).toBe(false);
	});

	it("returns true when coordinates are identical", () => {
		const result = coordinatesIdentical([0, 0], [0, 0]);
		expect(result).toBe(true);
	});
});
