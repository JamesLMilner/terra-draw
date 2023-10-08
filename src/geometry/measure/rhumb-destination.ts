import { Position } from "geojson";
import { degreesToRadians, earthRadius } from "../helpers";

// Based on Turf.js Rhumb Destination module
// https://github.com/Turfjs/turf/blob/master/packages/turf-rhumb-destination/index.ts

export function rhumbDestination(
	origin: Position,
	distanceMeters: number,
	bearing: number,
): Position {
	const wasNegativeDistance = distanceMeters < 0;
	let distanceInMeters = distanceMeters;

	if (wasNegativeDistance) {
		distanceInMeters = -Math.abs(distanceInMeters);
	}

	const delta = distanceInMeters / earthRadius; // angular distance in radians
	const lambda1 = (origin[0] * Math.PI) / 180; // to radians, but without normalize to 𝜋
	const phi1 = degreesToRadians(origin[1]);
	const theta = degreesToRadians(bearing);

	const DeltaPhi = delta * Math.cos(theta);
	let phi2 = phi1 + DeltaPhi;

	// check for going past the pole, normalise latitude if so
	if (Math.abs(phi2) > Math.PI / 2) {
		phi2 = phi2 > 0 ? Math.PI - phi2 : -Math.PI - phi2;
	}

	const DeltaPsi = Math.log(
		Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4),
	);
	// E-W course becomes ill-conditioned with 0/0
	const q = Math.abs(DeltaPsi) > 10e-12 ? DeltaPhi / DeltaPsi : Math.cos(phi1);

	const DeltaLambda = (delta * Math.sin(theta)) / q;
	const lambda2 = lambda1 + DeltaLambda;

	// normalise to −180..+180°
	const destination = [
		(((lambda2 * 180) / Math.PI + 540) % 360) - 180,
		(phi2 * 180) / Math.PI,
	];

	// compensate the crossing of the 180th meridian (https://macwright.org/2016/09/26/the-180th-meridian.html)
	// solution from https://github.com/mapbox/mapbox-gl-js/issues/3250#issuecomment-294887678
	destination[0] +=
		destination[0] - origin[0] > 180
			? -360
			: origin[0] - destination[0] > 180
			? 360
			: 0;
	return destination;
}
