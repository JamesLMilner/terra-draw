import { LineString, Position } from "geojson";
import { destination } from "./destination";
import { bearing } from "./bearing";
import { haversineDistanceKilometers } from "./haversine-distance";

// Adapted from @turf/line-slice-along module which is MIT licensed
// https://github.com/Turfjs/turf/blob/master/packages/turf-line-slice-along/index.ts

export function lineSliceAlong(
	coords: LineString["coordinates"],
	startDist: number,
	stopDist: number,
): Position[] {
	const slice: Position[] = [];

	const origCoordsLength = coords.length;

	let travelled = 0;
	let overshot, direction, interpolated;
	for (let i = 0; i < coords.length; i++) {
		if (startDist >= travelled && i === coords.length - 1) {
			break;
		} else if (travelled > startDist && slice.length === 0) {
			overshot = startDist - travelled;
			if (!overshot) {
				slice.push(coords[i]);
				return slice;
			}
			direction = bearing(coords[i], coords[i - 1]) - 180;
			interpolated = destination(coords[i], overshot, direction);
			slice.push(interpolated);
		}

		if (travelled >= stopDist) {
			overshot = stopDist - travelled;
			if (!overshot) {
				slice.push(coords[i]);
				return slice;
			}
			direction = bearing(coords[i], coords[i - 1]) - 180;
			interpolated = destination(coords[i], overshot, direction);
			slice.push(interpolated);
			return slice;
		}

		if (travelled >= startDist) {
			slice.push(coords[i]);
		}

		if (i === coords.length - 1) {
			return slice;
		}

		travelled += haversineDistanceKilometers(coords[i], coords[i + 1]);
	}

	if (travelled < startDist && coords.length === origCoordsLength) {
		throw new Error("Start position is beyond line");
	}

	const last = coords[coords.length - 1];
	return [last, last];
}
