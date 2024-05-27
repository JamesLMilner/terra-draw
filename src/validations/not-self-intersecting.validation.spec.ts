import { Polygon } from "geojson";
import { ValidateNotSelfIntersecting } from "./not-self-intersecting.validation";
import { GeoJSONStoreFeatures } from "../terra-draw";

describe("ValidateNotSelfIntersecting", () => {
	it("it should return false polygon self intersects", () => {
		const feature = {
			type: "Feature",
			properties: {},
			geometry: {
				coordinates: [
					[
						[34.22041933638323, 16.155508656132255],
						[14.634103624858, 1.9928911643832947],
						[44.85353434697225, -10.538516452804046],
						[15.981035610620069, 13.843769534036511],
						[34.22041933638323, 16.155508656132255],
					],
				],
				type: "Polygon",
			},
		} as GeoJSONStoreFeatures;

		// Act
		const result = ValidateNotSelfIntersecting(feature);
		// Assert
		expect(result).toBe(false);
	});

	it("it should return true if polygon does not self intersects", () => {
		const feature = {
			type: "Feature",
			geometry: {
				coordinates: [
					[
						[22.115939239949142, 17.061864550222168],
						[10.555809858425931, 17.061864550222168],
						[10.555809858425931, 4.004764588790522],
						[22.115939239949142, 4.004764588790522],
						[22.115939239949142, 17.061864550222168],
					],
				],
				type: "Polygon",
			} as Polygon,
		} as GeoJSONStoreFeatures;

		// Act
		const result = ValidateNotSelfIntersecting(feature);
		// Assert
		expect(result).toBe(true);
	});
});
