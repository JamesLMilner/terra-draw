import {
	validLatitude,
	validLongitude,
	coordinateIsValid,
	getDecimalPlaces,
} from "./is-valid-coordinate";

describe("validLatitude", () => {
	it("should return true for valid latitude", () => {
		expect(validLatitude(45)).toBe(true);
	});

	it("should return false for latitude greater than 90", () => {
		expect(validLatitude(91)).toBe(false);
	});

	it("should return false for latitude less than -90", () => {
		expect(validLatitude(-91)).toBe(false);
	});

	it("should return true for boundary values -90 and 90", () => {
		expect(validLatitude(-90)).toBe(true);
		expect(validLatitude(90)).toBe(true);
	});

	it("should return true for valid longitude", () => {
		expect(validLongitude(90)).toBe(true);
	});

	it("should return false for longitude greater than 180", () => {
		expect(validLongitude(181)).toBe(false);
	});

	it("should return false for longitude less than -180", () => {
		expect(validLongitude(-181)).toBe(false);
	});

	it("should return true for boundary values -180 and 180", () => {
		expect(validLongitude(-180)).toBe(true);
		expect(validLongitude(180)).toBe(true);
	});
});

describe("coordinateIsValid", () => {
	it("should return true for valid coordinate", () => {
		expect(coordinateIsValid([45, 90], 9)).toBe(true);
	});

	it("should return false for coordinate with incorrect length", () => {
		expect(coordinateIsValid([45], 9)).toBe(false);
		expect(coordinateIsValid([45, 90, 100], 9)).toBe(false);
	});

	it("should return false for coordinate with non-number elements", () => {
		expect(coordinateIsValid(["45", 90], 9)).toBe(false);
		expect(coordinateIsValid([45, "90"], 9)).toBe(false);
		expect(coordinateIsValid(["45", "90"], 9)).toBe(false);
	});

	it("should return false for coordinate with invalid longitude and latitude", () => {
		expect(coordinateIsValid([181, 90], 9)).toBe(false);
		expect(coordinateIsValid([45, 91], 9)).toBe(false);
		expect(coordinateIsValid([-181, -91], 9)).toBe(false);
	});
});

describe("getDecimalPlaces", () => {
	it("returns 0 for an integer", () => {
		expect(getDecimalPlaces(10)).toBe(0);
		expect(getDecimalPlaces(0)).toBe(0);
	});

	it("returns the correct number of decimal places for a float", () => {
		expect(getDecimalPlaces(0.1)).toBe(1);
		expect(getDecimalPlaces(0.01)).toBe(2);
		expect(getDecimalPlaces(0.123456)).toBe(6);
	});

	it("returns the correct number of decimal places for a float greater than 1", () => {
		expect(getDecimalPlaces(1.23)).toBe(2);
	});

	it("returns the correct number of decimal places for a float less than 0", () => {
		expect(getDecimalPlaces(-0.123)).toBe(3);
	});
});
