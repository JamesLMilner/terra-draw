import {
	isBoolean,
	isDrawInteraction,
	isFiniteNonNegativeNumber,
	isFunction,
	isNonEmptyString,
	isNonNullObject,
	isNull,
} from "./checks";

describe("checks", () => {
	describe("isFiniteNonNegativeNumber", () => {
		it("returns true for finite non-negative numbers", () => {
			expect(isFiniteNonNegativeNumber(0)).toBe(true);
			expect(isFiniteNonNegativeNumber(1.5)).toBe(true);
		});

		it("returns false for invalid values", () => {
			expect(isFiniteNonNegativeNumber(-1)).toBe(false);
			expect(isFiniteNonNegativeNumber(Number.NaN)).toBe(false);
			expect(isFiniteNonNegativeNumber(Number.POSITIVE_INFINITY)).toBe(false);
			expect(isFiniteNonNegativeNumber("1")).toBe(false);
		});
	});

	describe("isBoolean", () => {
		it("returns true for boolean values", () => {
			expect(isBoolean(true)).toBe(true);
			expect(isBoolean(false)).toBe(true);
		});

		it("returns false for non-boolean values", () => {
			expect(isBoolean("true")).toBe(false);
			expect(isBoolean(0)).toBe(false);
			expect(isBoolean(null)).toBe(false);
		});
	});

	describe("isNull", () => {
		it("returns true only for null", () => {
			expect(isNull(null)).toBe(true);
			expect(isNull(undefined)).toBe(false);
			expect(isNull({})).toBe(false);
		});
	});

	describe("isNonNullObject", () => {
		it("returns true for non-null objects", () => {
			expect(isNonNullObject({})).toBe(true);
			expect(isNonNullObject([])).toBe(true);
		});

		it("returns false for null and non-objects", () => {
			expect(isNonNullObject(null)).toBe(false);
			expect(isNonNullObject("object")).toBe(false);
			expect(isNonNullObject(1)).toBe(false);
			expect(isNonNullObject(() => {})).toBe(false);
		});
	});

	describe("isFunction", () => {
		it("returns true for functions", () => {
			expect(isFunction(() => {})).toBe(true);
			expect(isFunction(function test() {})).toBe(true);
		});

		it("returns false for non-functions", () => {
			expect(isFunction({})).toBe(false);
			expect(isFunction("fn")).toBe(false);
			expect(isFunction(null)).toBe(false);
		});
	});

	describe("isNonEmptyString", () => {
		it("returns true for non-empty strings", () => {
			expect(isNonEmptyString("a")).toBe(true);
			expect(isNonEmptyString("terra")).toBe(true);
		});

		it("returns false for empty and non-string values", () => {
			expect(isNonEmptyString("")).toBe(false);
			expect(isNonEmptyString(1)).toBe(false);
			expect(isNonEmptyString(null)).toBe(false);
		});
	});

	describe("isDrawInteraction", () => {
		it("returns true for supported draw interaction values", () => {
			expect(isDrawInteraction("click-move")).toBe(true);
			expect(isDrawInteraction("click-drag")).toBe(true);
			expect(isDrawInteraction("click-move-or-drag")).toBe(true);
		});

		it("returns false for unsupported values", () => {
			expect(isDrawInteraction("click")).toBe(false);
			expect(isDrawInteraction("drag")).toBe(false);
			expect(isDrawInteraction(1)).toBe(false);
			expect(isDrawInteraction(null)).toBe(false);
		});
	});
});
