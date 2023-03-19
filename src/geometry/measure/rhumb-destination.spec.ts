import { rhumbDestination } from "./rhumb-destination";

describe("rhumbDestination", () => {
	it("gets rhumb destination correctly", () => {
		const result = rhumbDestination([1, 1], 1000, 1);
		expect(result).toStrictEqual([1.0001569771690129, 1.008991833928772]);
	});

	it("gets rhumb destination correctly with negative distance", () => {
		const result = rhumbDestination([1, 1], -1000, 1);
		expect(result).toStrictEqual([0.9998430232609508, 0.9910081660712281]);
	});

	it("gets rhumb destination correctly", () => {
		const result = rhumbDestination([90, 180], -1000, 1);
		expect(result).toStrictEqual([90.000156953045, 0.008991833928770716]);
	});

	it("gets rhumb destination correctly", () => {
		const result = rhumbDestination([-90, -180], -1000, 1);
		expect(result).toStrictEqual([-89.99984304695494, 0.008991833928770716]);
	});
});
