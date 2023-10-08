export const pixelDistanceToLine = (
	point: { x: number; y: number },
	linePointOne: { x: number; y: number },
	linePointTwo: { x: number; y: number },
) => {
	const square = (x: number) => {
		return x * x;
	};
	const dist2 = (v: { x: number; y: number }, w: { x: number; y: number }) => {
		return square(v.x - w.x) + square(v.y - w.y);
	};
	const distToSegmentSquared = (
		p: { x: number; y: number },
		v: { x: number; y: number },
		w: { x: number; y: number },
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
