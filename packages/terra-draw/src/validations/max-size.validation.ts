import { Validation } from "../common";
import { polygonAreaSquareMeters } from "../geometry/measure/area";
import { GeoJSONStoreFeatures } from "../terra-draw";
import { ValidationReasonFeatureNotPolygon } from "./common-validations";

export const ValidationMaxAreaSquareMetersReason =
	"Feature is larger than the maximum area";

export const ValidateMaxAreaSquareMeters = (
	feature: GeoJSONStoreFeatures,
	maxSize: number,
): ReturnType<Validation> => {
	if (feature.geometry.type !== "Polygon") {
		return {
			valid: false,
			reason: ValidationReasonFeatureNotPolygon,
		};
	}

	const size = polygonAreaSquareMeters(feature.geometry);

	if (size > maxSize) {
		return {
			valid: false,
			reason: ValidationMaxAreaSquareMetersReason,
		};
	}

	return { valid: true };
};
