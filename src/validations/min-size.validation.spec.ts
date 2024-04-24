import { Polygon } from "geojson";
import { ValidateMinSizeSquareMeters } from "./min-size.validation";

describe("ValidateMinSizeSquareMeters", () => {
	it("it should return true if less than the min size provided", () => {
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

		const minSize = 10000;
		// Act
		const result = ValidateMinSizeSquareMeters(polygon, minSize);
		// Assert
		expect(result).toBe(true);
	});
});
