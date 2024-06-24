import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { Position } from "geojson";
import { haversineDistanceKilometers } from "../geometry/measure/haversine-distance";
import { lineSliceAlong } from "../geometry/measure/slice-along";
import { limitPrecision } from "../geometry/limit-decimal-precision";
import { generateGreatCircleCoordinates } from "../geometry/shape/great-circle-coordinates";

export class InsertCoordinatesBehavior extends TerraDrawModeBehavior {
	constructor(readonly config: BehaviorConfig) {
		super(config);
	}

	public generateInsertionCoordinates(
		coordinateOne: Position,
		coordinateTwo: Position,
		segmentLength: number,
	): Position[] {
		const line = [coordinateOne, coordinateTwo];

		let lineLength = 0;
		for (let i = 0; i < line.length - 1; i++) {
			lineLength += haversineDistanceKilometers(line[0], line[1]);
		}

		// If the line is shorter than the segment length then the original line is returned.
		if (lineLength <= segmentLength) {
			return line;
		}

		let numberOfSegments = lineLength / segmentLength - 1;

		// If numberOfSegments is integer, no need to plus 1
		if (!Number.isInteger(numberOfSegments)) {
			numberOfSegments = Math.floor(numberOfSegments) + 1;
		}

		const segments: Position[][] = [];
		for (let i = 0; i < numberOfSegments; i++) {
			const outline = lineSliceAlong(
				line,
				segmentLength * i,
				segmentLength * (i + 1),
			);
			segments.push(outline);
		}

		const coordinates: Position[] = [];
		for (let i = 0; i < segments.length; i++) {
			const line = segments[i];
			coordinates.push(line[1]);
		}

		const limitedCoordinates = this.limitCoordinates(coordinates);

		return limitedCoordinates;
	}

	public generateInsertionGeodesicCoordinates(
		coordinateOne: Position,
		coordinateTwo: Position,
		segmentLength: number,
	): Position[] {
		const distance = haversineDistanceKilometers(coordinateOne, coordinateTwo);
		const numberOfPoints = Math.floor(distance / segmentLength);
		const coordinates = generateGreatCircleCoordinates(
			coordinateOne,
			coordinateTwo,
			numberOfPoints,
		);
		const limitedCoordinates = this.limitCoordinates(coordinates);

		return limitedCoordinates;
	}

	private limitCoordinates(coordinates: Position[]) {
		return coordinates.map((coordinate) => [
			limitPrecision(coordinate[0], this.config.coordinatePrecision),
			limitPrecision(coordinate[1], this.config.coordinatePrecision),
		]);
	}
}
