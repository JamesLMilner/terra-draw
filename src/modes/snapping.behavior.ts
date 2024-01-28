import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { TerraDrawMouseEvent } from "../common";
import { Feature, Position } from "geojson";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { BBoxPolygon, FeatureId } from "../store/store";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";

export class SnappingBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly clickBoundingBox: ClickBoundingBoxBehavior,
	) {
		super(config);
	}

	/** Returns the nearest snappable coordinate - on first click there is no currentId so no need to provide */
	public getSnappableCoordinateFirstClick = (event: TerraDrawMouseEvent) => {
		return this.getSnappable(event, (feature) => {
			return Boolean(
				feature.properties && feature.properties.mode === this.mode,
			);
		});
	};

	public getSnappableCoordinate = (
		event: TerraDrawMouseEvent,
		currentFeatureId: FeatureId,
	) => {
		return this.getSnappable(event, (feature) => {
			return Boolean(
				feature.properties &&
					feature.properties.mode === this.mode &&
					feature.id !== currentFeatureId,
			);
		});
	};

	private getSnappable(
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
			if (feature.geometry.type === "Polygon") {
				coordinates = feature.geometry.coordinates[0];
			} else if (feature.geometry.type === "LineString") {
				coordinates = feature.geometry.coordinates;
			} else {
				return;
			}

			coordinates.forEach((coord) => {
				const dist = this.pixelDistance.measure(event, coord);
				if (dist < closest.minDist && dist < this.pointerDistance) {
					closest.coord = coord;
				}
			});
		});

		return closest.coord;
	}
}
