import { Polygon } from "geojson";
import { followsRightHandRule } from "./boolean/right-hand-rule";
import { ensureRightHandRule } from "./ensure-right-hand-rule";

describe("ensureRightHandRule", () => {
	it("should return undefined if the polygon follows the right-hand rule", () => {
		const polygon: Polygon = {
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[4, 0],
					[4, 4],
					[0, 4],
					[0, 0],
				],
			],
		};

		const result = ensureRightHandRule(polygon);
		expect(result).toBeUndefined();
	});

	it("should return a reversed polygon if it does not follow the right-hand rule", () => {
		const polygon: Polygon = {
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[0, 4],
					[4, 4],
					[4, 0],
					[0, 0],
				],
			],
		};

		const result = ensureRightHandRule(polygon);

		expect(result).toEqual({
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[4, 0],
					[4, 4],
					[0, 4],
					[0, 0],
				],
			],
		});
	});
});
