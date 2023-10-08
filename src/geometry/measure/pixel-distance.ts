export const pixelDistance = (
	pointOne: { x: number; y: number },
	pointTwo: { x: number; y: number },
) => {
	const { x: x1, y: y1 } = pointOne;
	const { x: x2, y: y2 } = pointTwo;
	const y = x2 - x1;
	const x = y2 - y1;
	return Math.sqrt(x * x + y * y);
};
