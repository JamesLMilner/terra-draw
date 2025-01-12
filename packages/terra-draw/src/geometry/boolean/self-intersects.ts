// Based on - https://github.com/mclaeysb/geojson-polygon-self-intersections
// MIT License - Copyright (c) 2016 Manuel Claeys Bouuaert

import { Feature, LineString, Polygon, Position } from "geojson";
// import * as rbush from "rbush";

type SelfIntersectsOptions = {
	epsilon: number;
	// reportVertexOnVertex: boolean;
	// reportVertexOnEdge: boolean;
};

export function selfIntersects(
	feature: Feature<Polygon> | Feature<LineString>,
): boolean {
	const options: SelfIntersectsOptions = {
		epsilon: 0,
		// reportVertexOnVertex: false,
		// reportVertexOnEdge: false,
	};

	let coord: number[][][];

	if (feature.geometry.type === "Polygon") {
		coord = feature.geometry.coordinates;
	} else if (feature.geometry.type === "LineString") {
		coord = [feature.geometry.coordinates];
	} else {
		throw new Error("Self intersects only accepts Polygons and LineStrings");
	}

	const output: number[][] = [];
	const seen: { [key: string]: boolean } = {};

	for (let ring0 = 0; ring0 < coord.length; ring0++) {
		for (let edge0 = 0; edge0 < coord[ring0].length - 1; edge0++) {
			for (let ring1 = 0; ring1 < coord.length; ring1++) {
				for (let edge1 = 0; edge1 < coord[ring1].length - 1; edge1++) {
					// speedup possible if only interested in unique: start last two loops at ring0 and edge0+1
					ifInteresctionAddToOutput(ring0, edge0, ring1, edge1);
				}
			}
		}
	}

	return output.length > 0;

	// true if frac is (almost) 1.0 or 0.0
	// function isBoundaryCase(frac: number) {
	//   const e2 = options.epsilon * options.epsilon;
	//   return e2 >= (frac - 1) * (frac - 1) || e2 >= frac * frac;
	// }

	function isOutside(frac: number) {
		return frac < 0 - options.epsilon || frac > 1 + options.epsilon;
	}
	// Function to check if two edges intersect and add the intersection to the output
	function ifInteresctionAddToOutput(
		ring0: number,
		edge0: number,
		ring1: number,
		edge1: number,
	) {
		const start0 = coord[ring0][edge0];
		const end0 = coord[ring0][edge0 + 1];
		const start1 = coord[ring1][edge1];
		const end1 = coord[ring1][edge1 + 1];

		const intersection = intersect(start0, end0, start1, end1);

		if (intersection === null) {
			return; // discard parallels and coincidence
		}

		let frac0;
		let frac1;

		if (end0[0] !== start0[0]) {
			frac0 = (intersection[0] - start0[0]) / (end0[0] - start0[0]);
		} else {
			frac0 = (intersection[1] - start0[1]) / (end0[1] - start0[1]);
		}
		if (end1[0] !== start1[0]) {
			frac1 = (intersection[0] - start1[0]) / (end1[0] - start1[0]);
		} else {
			frac1 = (intersection[1] - start1[1]) / (end1[1] - start1[1]);
		}

		// There are roughly three cases we need to deal with.
		// 1. If at least one of the fracs lies outside [0,1], there is no intersection.
		if (isOutside(frac0) || isOutside(frac1)) {
			return; // require segment intersection
		}

		// 2. If both are either exactly 0 or exactly 1, this is not an intersection but just
		// two edge segments sharing a common vertex.
		// if (isBoundaryCase(frac0) && isBoundaryCase(frac1)) {
		//   if (!options.reportVertexOnVertex) {
		//     return;
		//   }
		// }

		// // 3. If only one of the fractions is exactly 0 or 1, this is
		// // a vertex-on-edge situation.
		// if (isBoundaryCase(frac0) || isBoundaryCase(frac1)) {
		//   if (!options.reportVertexOnEdge) {
		//     return;
		//   }
		// }

		const key = intersection.toString();
		const unique = !seen[key];
		if (unique) {
			seen[key] = true;
		}

		output.push(intersection);
	}
}

function equalArrays(array1: Position, array2: Position) {
	return array1[0] === array2[0] && array1[1] === array2[1];
}

// Function to compute where two lines (not segments) intersect. From https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
function intersect(
	start0: Position,
	end0: Position,
	start1: Position,
	end1: Position,
) {
	if (
		equalArrays(start0, start1) ||
		equalArrays(start0, end1) ||
		equalArrays(end0, start1) ||
		equalArrays(end1, start1)
	) {
		return null;
	}

	const x0 = start0[0],
		y0 = start0[1],
		x1 = end0[0],
		y1 = end0[1],
		x2 = start1[0],
		y2 = start1[1],
		x3 = end1[0],
		y3 = end1[1];

	const denom = (x0 - x1) * (y2 - y3) - (y0 - y1) * (x2 - x3);
	if (denom === 0) {
		return null;
	}

	const x4 =
		((x0 * y1 - y0 * x1) * (x2 - x3) - (x0 - x1) * (x2 * y3 - y2 * x3)) / denom;

	const y4 =
		((x0 * y1 - y0 * x1) * (y2 - y3) - (y0 - y1) * (x2 * y3 - y2 * x3)) / denom;

	return [x4, y4];
}
