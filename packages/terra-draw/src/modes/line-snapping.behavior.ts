import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { TerraDrawMouseEvent } from "../common";
import { Feature, Position } from "geojson";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { BBoxPolygon, FeatureId } from "../store/store";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";
import { nearestPointOnLine } from "../geometry/point-on-line";
import { webMercatorNearestPointOnLine } from "../geometry/web-mercator-point-on-line";
import { limitPrecision } from "../geometry/limit-decimal-precision";

export class LineSnappingBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly clickBoundingBox: ClickBoundingBoxBehavior,
	) {
		super(config);
	}

	/** Returns the nearest snappable coordinate - on first click there is no currentId so no need to provide */
	public getSnappableCoordinateFirstClick = (event: TerraDrawMouseEvent) => {
		const snappable = this.getSnappable(event, (feature) => {
			return Boolean(
				feature.properties && feature.properties.mode === this.mode,
			);
		});

		return snappable.coordinate
			? [
					limitPrecision(
						snappable.coordinate[0],
						this.config.coordinatePrecision,
					),
					limitPrecision(
						snappable.coordinate[1],
						this.config.coordinatePrecision,
					),
				]
			: undefined;
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

		return snappable.coordinate
			? [
					limitPrecision(
						snappable.coordinate[0],
						this.config.coordinatePrecision,
					),
					limitPrecision(
						snappable.coordinate[1],
						this.config.coordinatePrecision,
					),
				]
			: undefined;
	};

	public getSnappable(
		event: TerraDrawMouseEvent,
		filter?: (feature: Feature) => boolean,
	) {
		const boundingBox = this.clickBoundingBox.create(event) as BBoxPolygon;
		const features = this.store.search(boundingBox, filter);
		const closest: {
			coordinate: undefined | Position;
			minDistance: number;
			featureId: undefined | FeatureId;
			featureCoordinateIndex: undefined | number;
		} = {
			featureId: undefined,
			featureCoordinateIndex: undefined,
			coordinate: undefined,
			minDistance: Infinity,
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

			const lines: [Position, Position][] = [];

			for (let i = 0; i < coordinates.length - 1; i++) {
				lines.push([coordinates[i], coordinates[i + 1]]);
			}

			let nearest:
				| {
						coordinate: Position;
						lineIndex: number;
						distance: number;
				  }
				| undefined;

			const lngLat: Position = [event.lng, event.lat];

			if (this.config.projection === "web-mercator") {
				nearest = webMercatorNearestPointOnLine(lngLat, lines);
			} else if (this.config.projection === "globe") {
				nearest = nearestPointOnLine(lngLat, lines);
			}

			if (!nearest) {
				return;
			}

			const distance = this.pixelDistance.measure(event, nearest.coordinate);
			if (distance < closest.minDistance && distance < this.pointerDistance) {
				closest.featureId = feature.id;
				closest.coordinate = [
					limitPrecision(
						nearest.coordinate[0],
						this.config.coordinatePrecision,
					),
					limitPrecision(
						nearest.coordinate[1],
						this.config.coordinatePrecision,
					),
				];
				closest.featureCoordinateIndex = nearest.lineIndex;
				closest.minDistance = distance;
			}
		});

		return closest;
	}
}
