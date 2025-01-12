import { Position } from "geojson";

// Based on which-polygon (Mapbox)
// https://github.com/mapbox/which-polygon/blob/2eb5b8a427d018ebd964c05acd3b9166c4558b2c/index.js#L81
// ISC License - Copyright (c) 2017, Mapbox

export function pointInPolygon(point: Position, rings: Position[][]) {
	let inside = false;
	for (let i = 0, len = rings.length; i < len; i++) {
		const ring = rings[i];
		for (let j = 0, len2 = ring.length, k = len2 - 1; j < len2; k = j++) {
			if (rayIntersect(point, ring[j], ring[k])) {
				inside = !inside;
			}
		}
	}
	return inside;
}

function rayIntersect(p: Position, p1: Position, p2: Position) {
	return (
		p1[1] > p[1] !== p2[1] > p[1] &&
		p[0] < ((p2[0] - p1[0]) * (p[1] - p1[1])) / (p2[1] - p1[1]) + p1[0]
	);
}
