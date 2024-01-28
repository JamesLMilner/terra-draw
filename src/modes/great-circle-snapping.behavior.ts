import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { TerraDrawMouseEvent } from "../common";
import { Feature, Position } from "geojson";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { BBoxPolygon, FeatureId } from "../store/store";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";

export class GreatCircleSnappingBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly clickBoundingBox: ClickBoundingBoxBehavior,
	) {
		super(config);
	}

	public getSnappableCoordinate = (
		event: TerraDrawMouseEvent,
		currentFeatureId?: FeatureId,
	) => {
		return this.getSnappableEnds(event, (feature) => {
			return Boolean(
				feature.properties &&
					feature.properties.mode === this.mode &&
					currentFeatureId
					? feature.id !== currentFeatureId
					: true,
			);
		});
	};

	private getSnappableEnds(
		event: TerraDrawMouseEvent,
		filter: (feature: Feature) => boolean,
	) {
		const bbox = this.clickBoundingBox.create(event) as BBoxPolygon;

		const features = this.store.search(bbox, filter);

		const closest: { coord: undefined | Position; minDist: number } = {
			coord: undefined,
			minDist: Infinity,
		};

		features.forEach((feature) => {
			let coordinates: Position[];
			if (feature.geometry.type === "LineString") {
				coordinates = feature.geometry.coordinates;
			} else {
				return;
			}

			// Get the start coordinate
			const start = coordinates[0];
			const dist = this.pixelDistance.measure(event, start);
			if (dist < closest.minDist && dist < this.pointerDistance) {
				closest.coord = start;
			}

			// Get the final coordinate
			const end = coordinates[coordinates.length - 1];
			const endDist = this.pixelDistance.measure(event, end);
			if (endDist < closest.minDist && endDist < this.pointerDistance) {
				closest.coord = end;
			}
		});

		return closest.coord;
	}
}
