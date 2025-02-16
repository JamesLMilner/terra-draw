import { Feature, Polygon } from "geojson";
import { followsRightHandRule } from "./boolean/right-hand-rule";

export function ensureRightHandRule(polygon: Polygon): undefined | Polygon {
	const isFollowingRightHandRule = followsRightHandRule(polygon);
	if (!isFollowingRightHandRule) {
		return {
			type: "Polygon",
			coordinates: [polygon.coordinates[0].reverse()],
		} as Polygon;
	}
}
