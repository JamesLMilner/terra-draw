/**
 * Checks if a value is a valid JSON value.
 * @param value - The value to check
 * @returns true if the value is valid JSON, false otherwise
 */
export function isValidJSONValue(value: unknown): value is JSON {
	// null is valid JSON
	if (value === null) {
		return true;
	}

	// boolean is valid JSON
	if (typeof value === "boolean") {
		return true;
	}

	// string is valid JSON
	if (typeof value === "string") {
		return true;
	}

	// undefined is not valid JSON
	if (value === undefined) {
		return false;
	}

	// number must be finite to be valid JSON
	if (typeof value === "number") {
		return Number.isFinite(value);
	}

	// BigInt is not a valid JSON type
	if (typeof value === "bigint") {
		return false;
	}

	// Symbols are not valid JSON types
	if (typeof value === "symbol") {
		return false;
	}

	// Functions are not valid JSON types
	if (typeof value === "function") {
		return false;
	}

	// Regular expressions are not valid JSON types
	if (value instanceof RegExp) {
		return false;
	}

	// Maps are not valid JSON types
	if (value instanceof Map) {
		return false;
	}

	// Sets are not valid JSON types
	if (value instanceof Set) {
		return false;
	}

	// Dates are not valid JSON types
	if (value instanceof Date) {
		return false;
	}

	// Class instances are not valid JSON types (only plain objects)
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		const proto = Object.getPrototypeOf(value);
		if (proto !== Object.prototype && proto !== null) {
			return false;
		}
	}

	// Typed Arrays are not valid JSON types
	if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
		return false;
	}

	// Array: all elements must be valid JSON
	if (Array.isArray(value)) {
		for (const item of value) {
			if (!isValidJSONValue(item)) {
				return false;
			}
		}
	}

	// Object: must be plain object with string keys
	if (typeof value === "object") {
		return Object.keys(value).every(
			(key) =>
				typeof key === "string" &&
				isValidJSONValue(value[key as keyof typeof value] as unknown),
		);
	}

	// Other types (shouldn't reach here) are not valid JSON
	return false;
}
