// Based on which-polygon
// https://github.com/mapbox/which-polygon/blob/2eb5b8a427d018ebd964c05acd3b9166c4558b2c/index.js#L81
export function pointInPolygon(
  point: [number, number],
  rings: [number, number][][]
) {
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

function rayIntersect(
  p: [number, number],
  p1: [number, number],
  p2: [number, number]
) {
  return (
    p1[1] > p[1] !== p2[1] > p[1] &&
    p[0] < ((p2[0] - p1[0]) * (p[1] - p1[1])) / (p2[1] - p1[1]) + p1[0]
  );
}
