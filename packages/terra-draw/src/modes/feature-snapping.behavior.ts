import { Snappable, TerraDrawMouseEvent } from "../common";
import { Feature } from "geojson";
import { FeatureId } from "../store/store";
import { CoordinateSnappingBehavior } from "./coordinate-snapping.behavior";
import { LineSnappingBehavior } from "./line-snapping.behavior";

export type FeatureSnappingOptions = {
	toLine?: boolean;
	toCoordinate?: boolean;
};

export class FeatureSnappingBehavior {
	constructor(
		private readonly coordinateSnapping: CoordinateSnappingBehavior,
		private readonly lineSnapping: LineSnappingBehavior,
	) {}

	public getSnappable(
		event: TerraDrawMouseEvent,
		currentFeatureId?: FeatureId,
		filter?: (feature: Feature) => boolean,
		options?: FeatureSnappingOptions,
	): Snappable {
		const toCoordinate = options?.toCoordinate !== false;
		const toLine = options?.toLine !== false;
		const effectiveFilter = (feature: Feature) => {
			if (currentFeatureId !== undefined && feature.id === currentFeatureId) {
				return false;
			}

			if (filter) {
				return filter(feature);
			}

			return true;
		};

		let closest: Snappable = {
			coordinate: undefined,
			featureId: undefined,
			featureCoordinateIndex: undefined,
			minDistance: Infinity,
		};

		if (toCoordinate) {
			const coordinateCandidate = this.coordinateSnapping.getSnappable(
				event,
				effectiveFilter,
			);

			if (
				coordinateCandidate.coordinate &&
				coordinateCandidate.minDistance < closest.minDistance
			) {
				closest = coordinateCandidate;
			}
		}

		if (toLine) {
			const lineCandidate = this.lineSnapping.getSnappable(
				event,
				effectiveFilter,
			);
			if (
				lineCandidate.coordinate &&
				lineCandidate.minDistance < closest.minDistance
			) {
				closest = lineCandidate;
			}
		}

		return closest;
	}
}
