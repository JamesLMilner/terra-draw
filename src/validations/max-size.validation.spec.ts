import { ValidateMaxAreaSquareMeters } from "./max-size.validation";
import { GeoJSONStoreFeatures } from "../terra-draw";

describe("ValidateMaxAreaSquareMeters", () => {
	it("should return true if the polygon area is less than the max size", () => {
		// Arrange
		const polygon = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
				],
			},
		} as GeoJSONStoreFeatures;

		const maxSize = 100000000000;

		const result = ValidateMaxAreaSquareMeters(polygon, maxSize);
		expect(result).toEqual({ valid: true });
	});

	it("should return true if the polygon area is less than the max size", () => {
		// Arrange
		const polygon = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					],
				],
			},
		} as GeoJSONStoreFeatures;

		const maxSize = 1000000;

		const result = ValidateMaxAreaSquareMeters(polygon, maxSize);
		expect(result).toEqual({
			valid: false,
			reason: "Feature is larger than the maximum area",
		});
	});
});
