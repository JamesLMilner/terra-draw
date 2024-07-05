import { polygonAreaSquareMeters } from "../geometry/measure/area";
import { GeoJSONStoreFeatures } from "../terra-draw";

export const ValidateMaxAreaSquareMeters = (
	feature: GeoJSONStoreFeatures,
	maxSize: number,
): boolean => {
	if (feature.geometry.type !== "Polygon") {
		return false;
	}

	const size = polygonAreaSquareMeters(feature.geometry);
	return size < maxSize;
};
