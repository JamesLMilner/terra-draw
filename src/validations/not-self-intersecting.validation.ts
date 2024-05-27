import { Feature, LineString, Polygon } from "geojson";
import { selfIntersects } from "../geometry/boolean/self-intersects";
import { GeoJSONStoreFeatures } from "../terra-draw";

export const ValidateNotSelfIntersecting = (
	feature: GeoJSONStoreFeatures,
): boolean => {
	if (
		feature.geometry.type !== "Polygon" &&
		feature.geometry.type !== "LineString"
	) {
		return false;
	}

	const hasSelfIntersections = selfIntersects(
		feature as Feature<LineString> | Feature<Polygon>,
	);

	return !hasSelfIntersections;
};
