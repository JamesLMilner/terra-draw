import { Validation } from "../common";
import { polygonAreaSquareMeters } from "../geometry/measure/area";
import { GeoJSONStoreFeatures } from "../terra-draw";
import { ValidationReasonFeatureNotPolygon } from "./common-validations";

export const ValidationReasonFeatureLessThanMinSize =
	"Feature is smaller than the minimum area";

export const ValidateMinAreaSquareMeters = (
	feature: GeoJSONStoreFeatures,
	minSize: number,
): ReturnType<Validation> => {
	if (feature.geometry.type !== "Polygon") {
		return {
			valid: false,
			reason: ValidationReasonFeatureNotPolygon,
		};
	}

	if (polygonAreaSquareMeters(feature.geometry) < minSize) {
		return {
			valid: false,
			reason: ValidationReasonFeatureLessThanMinSize,
		};
	}

	return { valid: true };
};
