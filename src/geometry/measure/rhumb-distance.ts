import { Position } from "geojson";
import { earthRadius } from "../helpers";

// Based on Turf.js Rhumb Distance module
// https://github.com/Turfjs/turf/blob/master/packages/turf-rhumb-distance/index.ts

export function rhumbDistance(destination: Position, origin: Position): number {
	// compensate the crossing of the 180th meridian (https://macwright.org/2016/09/26/the-180th-meridian.html)
	// solution from https://github.com/mapbox/mapbox-gl-js/issues/3250#issuecomment-294887678
	destination[0] +=
		destination[0] - origin[0] > 180
			? -360
			: origin[0] - destination[0] > 180
			? 360
			: 0;

	// see www.edwilliams.org/avform.htm#Rhumb

	const R = earthRadius;
	const phi1 = (origin[1] * Math.PI) / 180;
	const phi2 = (destination[1] * Math.PI) / 180;
	const DeltaPhi = phi2 - phi1;
	let DeltaLambda = (Math.abs(destination[0] - origin[0]) * Math.PI) / 180;

	// if dLon over 180° take shorter rhumb line across the anti-meridian:
	if (DeltaLambda > Math.PI) {
		DeltaLambda -= 2 * Math.PI;
	}

	// on Mercator projection, longitude distances shrink by latitude; q is the 'stretch factor'
	// q becomes ill-conditioned along E-W line (0/0); use empirical tolerance to avoid it
	const DeltaPsi = Math.log(
		Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4),
	);
	const q = Math.abs(DeltaPsi) > 10e-12 ? DeltaPhi / DeltaPsi : Math.cos(phi1);

	// distance is pythagoras on 'stretched' Mercator projection
	const delta = Math.sqrt(
		DeltaPhi * DeltaPhi + q * q * DeltaLambda * DeltaLambda,
	); // angular distance in radians

	const distanceMeters = delta * R;

	return distanceMeters;
}
