import { Position } from "geojson";
import { haversineDistanceKilometers } from "../measure/haversine-distance";
import { lngLatToWebMercatorXY } from "../project/web-mercator";

/*
 * Function to calculate the web mercator vs geodesic distortion between two coordinates
 * Value of 1 means no distortion, higher values mean higher distortion
 * */
export function calculateWebMercatorDistortion(
	source: Position,
	target: Position,
): number {
	const geodesicDistance = haversineDistanceKilometers(source, target) * 1000;
	if (geodesicDistance === 0) {
		return 1;
	}

	const { x: x1, y: y1 } = lngLatToWebMercatorXY(source[0], source[1]);
	const { x: x2, y: y2 } = lngLatToWebMercatorXY(target[0], target[1]);
	const euclideanDistance = Math.sqrt(
		Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2),
	);
	return euclideanDistance / geodesicDistance;
}
