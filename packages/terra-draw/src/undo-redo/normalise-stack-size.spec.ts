import { normaliseMaxStackSize } from "./normalise-stack-size";

describe("normaliseMaxStackSize", () => {
	it("returns Infinity when stack size is undefined", () => {
		expect(normaliseMaxStackSize()).toBe(Number.POSITIVE_INFINITY);
	});

	it("returns Infinity when stack size is NaN", () => {
		expect(normaliseMaxStackSize(Number.NaN)).toBe(Number.POSITIVE_INFINITY);
	});

	it("returns Infinity when stack size is positive Infinity", () => {
		expect(normaliseMaxStackSize(Number.POSITIVE_INFINITY)).toBe(
			Number.POSITIVE_INFINITY,
		);
	});

	it("returns Infinity when stack size is negative Infinity", () => {
		expect(normaliseMaxStackSize(Number.NEGATIVE_INFINITY)).toBe(
			Number.POSITIVE_INFINITY,
		);
	});

	it("floors finite decimal stack size", () => {
		expect(normaliseMaxStackSize(3.9)).toBe(3);
	});

	it("returns finite integer stack size unchanged", () => {
		expect(normaliseMaxStackSize(4)).toBe(4);
	});

	it("clamps negative finite stack size to zero", () => {
		expect(normaliseMaxStackSize(-2)).toBe(0);
	});
});
