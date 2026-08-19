import type { DrawInteractions } from "../common";

export type Check<T> = (value: unknown) => value is T;

/**
 * Checks whether a value is a finite, non-negative number.
 *
 * @param value - The value to validate.
 * @returns True when the value is a number >= 0 and finite.
 */
export const isFiniteNonNegativeNumber: Check<number> = (
	value,
): value is number => {
	return typeof value === "number" && value >= 0 && Number.isFinite(value);
};

/**
 * Checks whether a value is a boolean.
 *
 * @param value - The value to validate.
 * @returns True when the value is either true or false.
 */
export const isBoolean: Check<boolean> = (value): value is boolean => {
	return typeof value === "boolean";
};

/**
 *  Checks whether a value is null.
 *
 * @param value - The value to validate.
 * @returns True when the value is null.
 */
export const isNull: Check<null> = (value): value is null => {
	return value === null;
};

/**
 * Checks whether a value is a non-null object.
 *
 * @param value - The value to validate.
 * @returns True when the value is an object and not null.
 */
export const isNonNullObject: Check<Record<string, unknown>> = (
	value,
): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null;
};

/**
 * Checks whether a value is a function.
 *
 * @param value - The value to validate.
 * @returns True when the value is a callable function.
 */
export const isFunction: Check<Function> = (value): value is Function => {
	return typeof value === "function";
};

/**
 * Checks whether a value is a string with at least one character.
 *
 * @param value - The value to validate.
 * @returns True when the value is a non-empty string.
 */
export const isNonEmptyString: Check<string> = (value): value is string => {
	return typeof value === "string" && value.length > 0;
};

/**
 * Checks whether a value is a supported draw interaction string.
 *
 * @param value - The value to validate.
 * @returns True when the value is one of the DrawInteractions literals.
 */
export const isDrawInteraction: Check<DrawInteractions> = (
	value,
): value is DrawInteractions => {
	return (
		value === "click-move" ||
		value === "click-drag" ||
		value === "click-move-or-drag"
	);
};
