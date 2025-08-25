import { isValidJSONValue } from "./valid-json";

describe("isValidJSONValue", () => {
	describe("primitives", () => {
		it("null", () => {
			expect(isValidJSONValue(null)).toBe(true);
		});

		it("booleans", () => {
			expect(isValidJSONValue(true)).toBe(true);
			expect(isValidJSONValue(false)).toBe(true);
		});

		it("strings", () => {
			expect(isValidJSONValue("")).toBe(true);
			expect(isValidJSONValue("hello")).toBe(true);
			expect(isValidJSONValue("💡")).toBe(true);
		});

		it("numbers: finite only", () => {
			expect(isValidJSONValue(0)).toBe(true);
			expect(isValidJSONValue(42)).toBe(true);
			expect(isValidJSONValue(-0)).toBe(true); // valid JSON number
			expect(isValidJSONValue(1.234)).toBe(true);

			expect(isValidJSONValue(Number.NaN)).toBe(false);
			expect(isValidJSONValue(Number.POSITIVE_INFINITY)).toBe(false);
			expect(isValidJSONValue(Number.NEGATIVE_INFINITY)).toBe(false);
		});

		it("invalid primitive-like values", () => {
			expect(isValidJSONValue(undefined)).toBe(false);
			expect(isValidJSONValue(Symbol("x"))).toBe(false);
			expect(isValidJSONValue(BigInt(1))).toBe(false);
			expect(isValidJSONValue(function () {})).toBe(false);
			expect(isValidJSONValue(() => {})).toBe(false);
		});
	});

	describe("arrays", () => {
		it("simple arrays", () => {
			expect(isValidJSONValue([])).toBe(true);
			expect(isValidJSONValue([1, "a", true, null])).toBe(true);
		});

		it("nested arrays/objects", () => {
			const v = [1, { a: [null, { b: "x" }] }, false];
			expect(isValidJSONValue(v)).toBe(true);
		});

		it("arrays with undefined/holes are invalid", () => {
			expect(isValidJSONValue([undefined])).toBe(false);
			// An array hole is effectively `undefined`
			const arrWithHole = [];
			arrWithHole.length = 2;
			arrWithHole[1] = 1; // arr is now [ <1 empty item>, 1 ]
			expect(isValidJSONValue(arrWithHole)).toBe(false);
		});

		it("arrays containing invalid values", () => {
			expect(isValidJSONValue([1, NaN])).toBe(false);
			expect(isValidJSONValue([1, Infinity])).toBe(false);
			expect(isValidJSONValue([1, () => {}])).toBe(false);
			expect(isValidJSONValue([1, Symbol()])).toBe(false);
			expect(isValidJSONValue([1, BigInt(2)])).toBe(false);
		});
	});

	describe("objects", () => {
		it("empty object", () => {
			expect(isValidJSONValue({})).toBe(true);
		});

		it("simple object with valid values", () => {
			expect(
				isValidJSONValue({
					a: 1,
					b: "x",
					c: true,
					d: null,
					e: [1, 2, 3],
					f: { nested: "ok" },
				}),
			).toBe(true);
		});

		it("object with undefined value is invalid", () => {
			expect(isValidJSONValue({ a: undefined })).toBe(false);
		});

		it("object with invalid value types is invalid", () => {
			expect(isValidJSONValue({ a: NaN })).toBe(false);
			expect(isValidJSONValue({ a: Infinity })).toBe(false);
			expect(isValidJSONValue({ a: () => {} })).toBe(false);
			expect(isValidJSONValue({ a: Symbol("s") })).toBe(false);
			expect(isValidJSONValue({ a: BigInt(10) })).toBe(false);
		});

		it("Object.create(null) is allowed (JSON object with no prototype)", () => {
			const o = Object.create(null);
			o.a = 1;
			o.b = "two";
			expect(isValidJSONValue(o)).toBe(true);
		});

		it("symbol-keyed properties are ignored by JSON and should not invalidate", () => {
			const s = Symbol("hidden");
			const o: { visible: number; [key: symbol]: unknown } = { visible: 1 };
			o[s] = () => {}; // non-JSON under a symbol key; JSON.stringify would ignore it
			expect(isValidJSONValue(o)).toBe(true);
		});

		it("Date objects should be considered NOT a JSON value (only plain objects/arrays/primitive JSON types are allowed)", () => {
			const d = new Date();
			// Strict JSON value set does NOT include Date instances.
			// If your implementation currently returns true here, update it to restrict to plain objects:
			//   const proto = Object.getPrototypeOf(value);
			//   if (proto !== Object.prototype && proto !== null) return false;
			expect(isValidJSONValue(d)).toBe(false);
		});

		it("Map/Set are not JSON values", () => {
			expect(isValidJSONValue(new Map())).toBe(false);
			expect(isValidJSONValue(new Set())).toBe(false);
		});

		it("class instances are not JSON values (unless plain objects)", () => {
			class X {
				private a: number;
				constructor() {
					this.a = 1;
				}
			}
			expect(isValidJSONValue(new X())).toBe(false);
		});

		it("typed arrays are not JSON values (they are objects, not arrays)", () => {
			expect(isValidJSONValue(new Uint8Array([1, 2, 3]))).toBe(false);
			expect(isValidJSONValue(new Int16Array([1, -2]))).toBe(false);
		});

		it("deeply nested valid structure", () => {
			const v = {
				a: [{ b: [{ c: [null, { d: "ok", e: [1, 2, 3] }] }] }],
				f: false,
			};
			expect(isValidJSONValue(v)).toBe(true);
		});
	});
});
