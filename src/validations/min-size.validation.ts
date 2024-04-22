import { Polygon } from "geojson";
import { polygonAreaSquareMeters } from "../geometry/measure/area";

export const ValidateMinSizeSquareMeters = (
	polygon: Polygon,
	minSize: number,
): boolean => {
	return polygonAreaSquareMeters(polygon) > minSize;
};
