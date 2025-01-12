import { CartesianPoint } from "../../common";

export const pixelDistanceToLine = (
	point: CartesianPoint,
	linePointOne: CartesianPoint,
	linePointTwo: CartesianPoint,
) => {
	const square = (x: number) => {
		return x * x;
	};
	const dist2 = (v: CartesianPoint, w: CartesianPoint) => {
		return square(v.x - w.x) + square(v.y - w.y);
	};
	const distToSegmentSquared = (
		p: CartesianPoint,
		v: CartesianPoint,
		w: CartesianPoint,
	) => {
		const l2 = dist2(v, w);

		if (l2 === 0) {
			return dist2(p, v);
		}

		let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
		t = Math.max(0, Math.min(1, t));

		return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
	};

	return Math.sqrt(distToSegmentSquared(point, linePointOne, linePointTwo));
};
