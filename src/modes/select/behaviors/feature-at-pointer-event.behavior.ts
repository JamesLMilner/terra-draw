import { SELECT_PROPERTIES, TerraDrawMouseEvent } from "../../../common";
import { BBoxPolygon, GeoJSONStoreFeatures } from "../../../store/store";

import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { ClickBoundingBoxBehavior } from "../../click-bounding-box.behavior";

import { pointInPolygon } from "../../../geometry/boolean/point-in-polygon";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { pixelDistanceToLine } from "../../../geometry/measure/pixel-distance-to-line";

export class FeatureAtPointerEventBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly createClickBoundingBox: ClickBoundingBoxBehavior,
		private readonly pixelDistance: PixelDistanceBehavior,
	) {
		super(config);
	}

	public find(event: TerraDrawMouseEvent, hasSelection: boolean) {
		let clickedFeature: GeoJSONStoreFeatures | undefined = undefined;
		let clickedFeatureDistance = Infinity;
		let clickedMidPoint: GeoJSONStoreFeatures | undefined = undefined;
		let clickedMidPointDistance = Infinity;

		const bbox = this.createClickBoundingBox.create(event);
		const features = this.store.search(bbox as BBoxPolygon);

		for (let i = 0; i < features.length; i++) {
			const feature = features[i];
			const geometry = feature.geometry;

			if (geometry.type === "Point") {
				// Ignore selection points always, and ignore mid points
				// when nothing is selected
				const isSelectionPoint = feature.properties.selectionPoint;
				const isNonSelectedMidPoint =
					!hasSelection && feature.properties[SELECT_PROPERTIES.MID_POINT];

				if (isSelectionPoint || isNonSelectedMidPoint) {
					continue;
				}

				const distance = this.pixelDistance.measure(
					event,
					geometry.coordinates,
				);

				// We want to catch both clicked
				// features but also any midpoints
				// in the clicked area
				if (
					feature.properties[SELECT_PROPERTIES.MID_POINT] &&
					distance < this.pointerDistance &&
					distance < clickedMidPointDistance
				) {
					clickedMidPointDistance = distance;
					clickedMidPoint = feature;
				} else if (
					!feature.properties[SELECT_PROPERTIES.MID_POINT] &&
					distance < this.pointerDistance &&
					distance < clickedFeatureDistance
				) {
					clickedFeatureDistance = distance;
					clickedFeature = feature;
				}
			} else if (geometry.type === "LineString") {
				for (let i = 0; i < geometry.coordinates.length - 1; i++) {
					const coord = geometry.coordinates[i];
					const nextCoord = geometry.coordinates[i + 1];
					const distanceToLine = pixelDistanceToLine(
						{ x: event.containerX, y: event.containerY },
						this.project(coord[0], coord[1]),
						this.project(nextCoord[0], nextCoord[1]),
					);

					if (
						distanceToLine < this.pointerDistance &&
						distanceToLine < clickedFeatureDistance
					) {
						clickedFeatureDistance = distanceToLine;
						clickedFeature = feature;
					}
				}
			} else if (geometry.type === "Polygon") {
				const clickInsidePolygon = pointInPolygon(
					[event.lng, event.lat],
					geometry.coordinates,
				);

				if (clickInsidePolygon) {
					clickedFeatureDistance = 0;
					clickedFeature = feature;
				}
			}
		}

		return { clickedFeature, clickedMidPoint };
	}
}
