import { CartesianPoint } from "../../common";

const RADIANS_TO_DEGREES = 57.29577951308232 as const; // 180 / Math.PI
const DEGREES_TO_RADIANS = 0.017453292519943295 as const; // Math.PI / 180
const R = 6378137 as const;

/**
 * Convert longitude and latitude to web mercator x and y
 * @param lng
 * @param lat
 * @returns - web mercator x and y
 */
export const lngLatToWebMercatorXY = (
	lng: number,
	lat: number,
): CartesianPoint => ({
	x: lng === 0 ? 0 : lng * DEGREES_TO_RADIANS * R,
	y:
		lat === 0
			? 0
			: Math.log(Math.tan(Math.PI / 4 + (lat * DEGREES_TO_RADIANS) / 2)) * R,
});

/**
 * Convert web mercator x and y to longitude and latitude
 * @param x - web mercator x
 * @param y - web mercator y
 * @returns - longitude and latitude
 */
export const webMercatorXYToLngLat = (
	x: number,
	y: number,
): { lng: number; lat: number } => ({
	lng: x === 0 ? 0 : RADIANS_TO_DEGREES * (x / R),
	lat:
		y === 0
			? 0
			: (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * RADIANS_TO_DEGREES,
});
