import { Validation } from "../common";
import { polygonAreaSquareMeters } from "../geometry/measure/area";
import { GeoJSONStoreFeatures } from "../terra-draw";

export const ValidateMaxAreaSquareMeters = (
	feature: GeoJSONStoreFeatures,
	maxSize: number,
): ReturnType<Validation> => {
	if (feature.geometry.type !== "Polygon") {
		return {
			valid: false,
			reason: "Feature is not a Polygon",
		};
	}

	const size = polygonAreaSquareMeters(feature.geometry);

	if (size > maxSize) {
		return {
			valid: false,
			reason: "Feature is larger than the maximum area",
		};
	}

	return { valid: true };
};
