import { Validation } from "../common";
import { polygonAreaSquareMeters } from "../geometry/measure/area";
import { GeoJSONStoreFeatures } from "../terra-draw";

export const ValidateMinAreaSquareMeters = (
	feature: GeoJSONStoreFeatures,
	minSize: number,
): ReturnType<Validation> => {
	if (feature.geometry.type !== "Polygon") {
		return {
			valid: false,
			reason: "Feature is not a Polygon",
		};
	}

	if (polygonAreaSquareMeters(feature.geometry) < minSize) {
		return {
			valid: false,
			reason: "Feature is smaller than the minimum area",
		};
	}

	return { valid: true };
};
