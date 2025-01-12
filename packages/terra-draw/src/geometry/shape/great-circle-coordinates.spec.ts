import { generateGreatCircleCoordinates } from "./great-circle-coordinates";

describe("Geometry", () => {
	describe("generateGreatCircleCoordinates", () => {
		it("generates a coordinate", () => {
			const result = generateGreatCircleCoordinates([0, 0], [1, 1], 1);
			expect(result).toHaveLength(1);
			expect(result).toEqual([[0.4999619199226218, 0.5000190382261059]]);
		});

		it("generates many coordinates", () => {
			const result = generateGreatCircleCoordinates([0, 0], [1, 1], 10);
			expect(result).toHaveLength(10);
			expect(result).toEqual([
				[0.09089993580370964, 0.09091366797545271],
				[0.18180032933571574, 0.18182710712118227],
				[0.2727016383289259, 0.27274008860343246],
				[0.3636043205254701, 0.3636523835803809],
				[0.4545088336813104, 0.4545637631981049],
				[0.5454156355708523, 0.5454739985865489],
				[0.6363251839915536, 0.6363828608554906],
				[0.7272379367685333, 0.7272901210905058],
				[0.8181543517591787, 0.8181955503489342],
				[0.9090748868577531, 0.9090989196558447],
			]);
		});
	});
});
