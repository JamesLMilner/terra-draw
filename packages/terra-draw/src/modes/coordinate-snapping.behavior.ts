import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { TerraDrawMouseEvent } from "../common";
import { Feature, Position } from "geojson";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { BBoxPolygon, FeatureId } from "../store/store";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";

export class CoordinateSnappingBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly clickBoundingBox: ClickBoundingBoxBehavior,
	) {
		super(config);
	}

	/** Returns the nearest snappable coordinate - on first click there is no currentId so no need to provide */
	public getSnappableCoordinateFirstClick = (event: TerraDrawMouseEvent) => {
		const snappble = this.getSnappable(event, (feature) => {
			return Boolean(
				feature.properties && feature.properties.mode === this.mode,
			);
		});

		return snappble.coordinate;
	};

	public getSnappableCoordinate = (
		event: TerraDrawMouseEvent,
		currentFeatureId: FeatureId,
	) => {
		const snappable = this.getSnappable(event, (feature) => {
			return Boolean(
				feature.properties &&
					feature.properties.mode === this.mode &&
					feature.id !== currentFeatureId,
			);
		});

		return snappable.coordinate;
	};

	public getSnappable(
		event: TerraDrawMouseEvent,
		filter?: (feature: Feature) => boolean,
	) {
		const bbox = this.clickBoundingBox.create(event) as BBoxPolygon;

		const features = this.store.search(bbox, filter);

		const closest: {
			coordinate: undefined | Position;
			minDist: number;
			featureId: undefined | FeatureId;
			featureCoordinateIndex: undefined | number;
		} = {
			featureId: undefined,
			featureCoordinateIndex: undefined,
			coordinate: undefined,
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

			coordinates.forEach((coord, coordIndex) => {
				const dist = this.pixelDistance.measure(event, coord);
				if (dist < closest.minDist && dist < this.pointerDistance) {
					closest.coordinate = coord;
					closest.minDist = dist;
					closest.featureId = feature.id;
					closest.featureCoordinateIndex = coordIndex;
				}
			});
		});

		return closest;
	}
}
