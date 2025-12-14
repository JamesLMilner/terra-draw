import { Position } from "geojson";
import { TerraDrawMouseEvent } from "../common";
import { BBoxPolygon, GeoJSONStoreFeatures } from "../store/store";
import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";

export class PointSearchBehavior extends TerraDrawModeBehavior {
	constructor(
		config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly clickBoundingBox: ClickBoundingBoxBehavior,
	) {
		super(config);
	}

	public getNearestPointFeature(event: TerraDrawMouseEvent) {
		const bbox = this.clickBoundingBox.create(event) as BBoxPolygon;
		const features = this.store.search(bbox);

		let distance = Infinity;
		let clickedFeature: GeoJSONStoreFeatures | undefined = undefined;

		for (let i = 0; i < features.length; i++) {
			const feature = features[i];
			const isPoint =
				feature.geometry.type === "Point" &&
				feature.properties.mode === this.mode;

			if (!isPoint) {
				continue;
			}

			const position = feature.geometry.coordinates as Position;
			const distanceToFeature = this.pixelDistance.measure(event, position);

			if (
				distanceToFeature > distance ||
				distanceToFeature > this.pointerDistance
			) {
				continue;
			}

			distance = distanceToFeature;
			clickedFeature = feature;
		}

		return clickedFeature;
	}
}
