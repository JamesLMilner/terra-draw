import { polygonAreaSquareMeters } from "../geometry/measure/area";
import { GeoJSONStoreFeatures } from "../terra-draw";

export const ValidateMinAreaSquareMeters = (
	feature: GeoJSONStoreFeatures,
	minSize: number,
): boolean => {
	if (feature.geometry.type !== "Polygon") {
		return false;
	}

	return polygonAreaSquareMeters(feature.geometry) > minSize;
};
