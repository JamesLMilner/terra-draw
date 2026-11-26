import { getMidPointCoordinates } from "./get-midpoints";
import { rhumbDistance } from "./measure/rhumb-distance";

describe("getMidPointCoordinates", () => {
	it("get midpoint coordinates", () => {
		const result = getMidPointCoordinates({
			featureCoords: [
				[0, 0],
				[0, 1],
				[1, 1],
				[0, 1],
				[0, 0],
			],
			precision: 9,
			project: (lng: number, lat: number) => {
				return { x: lng * 100, y: lat * 100 };
			},
			unproject: (x: number, y: number) => {
				return { lng: x / 100, lat: y / 100 };
			},
			projection: "web-mercator",
		});

		expect(result).toStrictEqual([
			[0, 0.5],
			[0.5, 1],
			[0.5, 1],
			[0, 0.5],
		]);
	});

	describe("globe", () => {
		const project = (lng: number, lat: number) => ({ x: lng, y: lat });
		const unproject = (x: number, y: number) => ({ lng: x, lat: y });

		it("puts the midpoint in the middle of the rhumb line", () => {
			const result = getMidPointCoordinates({
				featureCoords: [
					[0, 60],
					[90, 60],
				],
				precision: 9,
				project,
				unproject,
				projection: "globe",
			});

			expect(result).toStrictEqual([[45, 60]]);
		});

		it("is the same distance from both ends of a long segment", () => {
			const start = [-74, 40.7];
			const end = [-0.1, 51.5];
			const [midpoint] = getMidPointCoordinates({
				featureCoords: [start, end],
				precision: 9,
				project,
				unproject,
				projection: "globe",
			});

			const toStart = rhumbDistance(midpoint, start);
			const toEnd = rhumbDistance(end, midpoint);

			expect(midpoint[1]).toBeCloseTo(46.1, 9);
			expect(Math.abs(toStart - toEnd)).toBeLessThan(1);
		});

		it("does not change the feature coordinates across the anti-meridian", () => {
			const featureCoords = [
				[170, -40],
				[-170, -35],
			];

			getMidPointCoordinates({
				featureCoords,
				precision: 9,
				project,
				unproject,
				projection: "globe",
			});

			expect(featureCoords).toStrictEqual([
				[170, -40],
				[-170, -35],
			]);
		});
	});
});
