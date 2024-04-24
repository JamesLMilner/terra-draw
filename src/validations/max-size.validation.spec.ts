import { Polygon } from "geojson";
import { ValidateMaxSizeSquareMeters } from "./max-size.validation";

describe("ValidateMaxSizeSquareMeters", () => {
	it("should return true if the polygon area is less than the max size", () => {
		// Arrange
		const polygon = {
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
		} as Polygon;

		const maxSize = 100000000000;
		// Act
		const result = ValidateMaxSizeSquareMeters(polygon, maxSize);
		// Assert
		expect(result).toBe(true);
	});
});
