import { Polygon } from "geojson";
import { earthRadius } from "../helpers";

// Adapted from @turf/area is MIT Licensed licensed https://github.com/Turfjs/turf/blob/master/packages/turf-area/index.ts
// In turn adapted from NASA: https://dataverse.jpl.nasa.gov/file.xhtml?fileId=47998&version=2.0

export function polygonAreaSquareMeters(polygon: Polygon) {
	const coords = polygon.coordinates;
	let total = 0;
	if (coords && coords.length > 0) {
		total += Math.abs(ringArea(coords[0]));
		for (let i = 1; i < coords.length; i++) {
			total -= Math.abs(ringArea(coords[i]));
		}
	}
	return total;
}

const FACTOR = (earthRadius * earthRadius) / 2;
const PI_OVER_180 = Math.PI / 180;

function ringArea(coords: number[][]): number {
	const coordsLength = coords.length;

	if (coordsLength <= 2) {
		return 0;
	}

	let total = 0;

	let i = 0;
	while (i < coordsLength) {
		const lower = coords[i];
		const middle = coords[i + 1 === coordsLength ? 0 : i + 1];
		const upper =
			coords[i + 2 >= coordsLength ? (i + 2) % coordsLength : i + 2];

		const lowerX = lower[0] * PI_OVER_180;
		const middleY = middle[1] * PI_OVER_180;
		const upperX = upper[0] * PI_OVER_180;

		total += (upperX - lowerX) * Math.sin(middleY);

		i++;
	}

	return total * FACTOR;
}
