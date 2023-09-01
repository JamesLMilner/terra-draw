import { Unproject } from "../../common";
import { createBBoxFromPoint } from "./create-bbox";

describe("Geometry", () => {
	describe("bbox", () => {
		it("creates a bbox polygon", () => {
			const unproject = jest.fn((x, y) => ({
				lng: x,
				lat: y,
			})) as unknown as Unproject;

			const result = createBBoxFromPoint({
				point: {
					x: 10,
					y: 10,
				},
				unproject,
				pointerDistance: 30,
			});

			expect(result.geometry.type).toBe("Polygon");
			expect(result.geometry.coordinates).toEqual([
				[
					[-5, -5],
					[25, -5],
					[25, 25],
					[-5, 25],
					[-5, -5],
				],
			]);
		});
	});
});
