import type { Position } from "geojson";

import {
	getClosedCoordinates,
	getUnclosedCoordinates,
	isPolygonArray,
} from "./get-coordinates";

describe("geometry/get-coordinates", () => {
	describe("isPolygonArray", () => {
		it("returns true for polygon coordinates (Position[][]) that contain a ring of positions", () => {
			const polygon: Position[][] = [
				[
					[0, 0],
					[1, 0],
					[1, 1],
					[0, 0],
				],
			];

			expect(isPolygonArray(polygon)).toBe(true);
		});

		it("returns false for line coordinates (Position[])", () => {
			const line: Position[] = [
				[0, 0],
				[1, 1],
			];

			expect(isPolygonArray(line)).toBe(false);
		});

		it("returns false for an empty array", () => {
			// Runtime behavior for an empty array (which is ambiguous at the type level).
			const empty: unknown = [];
			expect(isPolygonArray(empty as Position[] | Position[][])).toBe(false);
		});

		it("returns false for a nested array that doesn't have Position shape", () => {
			// Example: [[[0,0]]] is not a valid `Position[][]` because
			// the ring contains a single Position rather than an array of Positions.
			const invalid: unknown = [[[0, 0]]];
			expect(isPolygonArray(invalid as Position[] | Position[][])).toBe(false);
		});
	});

	describe("getUnclosedCoordinates", () => {
		it("returns the same coordinates for a line", () => {
			const line: Position[] = [
				[0, 0],
				[1, 1],
				[2, 2],
			];

			const result = getUnclosedCoordinates(line);

			expect(result).toEqual(line);
			// Ensure it doesn't allocate a new array unnecessarily for line input.
			expect(result).toBe(line);
		});

		it("returns the first ring without the closing coordinate for a polygon", () => {
			const polygon: Position[][] = [
				[
					[0, 0],
					[2, 0],
					[2, 2],
					[0, 0],
				],
			];

			expect(getUnclosedCoordinates(polygon)).toEqual([
				[0, 0],
				[2, 0],
				[2, 2],
			]);
		});

		it("does not mutate the input polygon ring", () => {
			const ring: Position[] = [
				[0, 0],
				[1, 0],
				[1, 1],
				[0, 0],
			];
			const polygon: Position[][] = [ring];
			const ringCopy = [...ring];

			getUnclosedCoordinates(polygon);

			expect(ring).toEqual(ringCopy);
		});
	});

	describe("getClosedCoordinates", () => {
		it("returns the same coordinates for a line", () => {
			const line: Position[] = [
				[0, 0],
				[1, 1],
			];

			const result = getClosedCoordinates(line);

			expect(result).toEqual(line);
			// Ensure it doesn't allocate a new array unnecessarily for line input.
			expect(result).toBe(line);
		});

		it("returns the first ring including the closing coordinate for a polygon", () => {
			const polygon: Position[][] = [
				[
					[0, 0],
					[2, 0],
					[2, 2],
					[0, 0],
				],
			];

			expect(getClosedCoordinates(polygon)).toEqual([
				[0, 0],
				[2, 0],
				[2, 2],
				[0, 0],
			]);
		});
	});
});
