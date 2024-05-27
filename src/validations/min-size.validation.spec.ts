import { Polygon } from "geojson";
import { ValidateMinAreaSquareMeters } from "./min-size.validation";
import { GeoJSONStoreFeatures } from "../terra-draw";

describe("ValidateMinAreaSquareMeters", () => {
	it("it should return true if less than the min size provided", () => {
		// Arrange
		const feature = {
			type: "Feature",
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
			} as Polygon,
		} as GeoJSONStoreFeatures;

		const minSize = 10000;
		// Act
		const result = ValidateMinAreaSquareMeters(feature, minSize);
		// Assert
		expect(result).toBe(true);
	});
});
