import { rhumbDistance } from "./rhumb-distance";

describe("rhumbDistance", () => {
	it("gets rhumb destination correctly", () => {
		const result = rhumbDistance([0, 0], [1, 1]);
		expect(result).toBe(157249.5986361746);
	});

	it("gets rhumb destination correctly", () => {
		const result = rhumbDistance([-180, -90], [-180, 90]);
		expect(result).toBe(20015114.442035925);
	});

	it("gets rhumb destination correctly", () => {
		const result = rhumbDistance([0, 0], [0, 0]);
		expect(result).toBe(0);
	});

	it("gets rhumb destination correctly", () => {
		const result = rhumbDistance([180, 0], [180, 0]);
		expect(result).toBe(0);
	});

	it("gets rhumb destination correctly", () => {
		const result = rhumbDistance([180, 90], [180, 90]);
		expect(result).toBe(0);
	});

	it("gets rhumb destination correctly", () => {
		const result = rhumbDistance([-180, -90], [180, 90]);
		expect(result).toBe(20015114.442035925);
	});

	it("does not change the passed coordinates when crossing the anti-meridian", () => {
		const destination = [179, 0];
		const origin = [-179, 0];
		const result = rhumbDistance(destination, origin);

		expect(result).toBeCloseTo(222390.16, 1);
		expect(destination).toStrictEqual([179, 0]);
		expect(origin).toStrictEqual([-179, 0]);
	});
});
