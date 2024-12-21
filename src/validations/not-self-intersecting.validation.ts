import { Feature, LineString, Polygon } from "geojson";
import { selfIntersects } from "../geometry/boolean/self-intersects";
import { GeoJSONStoreFeatures } from "../terra-draw";
import { Validation } from "../common";

export const ValidationReasonFeatureNotPolygonOrLineString =
	"Feature is not a Polygon or LineString";
export const ValidationReasonFeatureSelfIntersects =
	"Feature intersects itself";

export const ValidateNotSelfIntersecting = (
	feature: GeoJSONStoreFeatures,
): ReturnType<Validation> => {
	if (
		feature.geometry.type !== "Polygon" &&
		feature.geometry.type !== "LineString"
	) {
		return {
			valid: false,
			reason: ValidationReasonFeatureNotPolygonOrLineString,
		};
	}

	const hasSelfIntersections = selfIntersects(
		feature as Feature<LineString> | Feature<Polygon>,
	);

	if (hasSelfIntersections) {
		return {
			valid: false,
			reason: ValidationReasonFeatureSelfIntersects,
		};
	}

	return { valid: true };
};
