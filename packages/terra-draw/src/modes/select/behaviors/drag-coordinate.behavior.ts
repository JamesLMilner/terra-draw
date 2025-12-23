import {
	Snapping,
	TerraDrawMouseEvent,
	UpdateTypes,
	Validation,
} from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";

import { LineString, Polygon, Position, Point, Feature } from "geojson";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { selfIntersects } from "../../../geometry/boolean/self-intersects";
import { FeatureId, GeoJSONStoreFeatures } from "../../../store/store";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { CoordinateSnappingBehavior } from "../../coordinate-snapping.behavior";
import { LineSnappingBehavior } from "../../line-snapping.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import {
	MutateFeatureBehavior,
	Mutations,
} from "../../mutate-feature.behavior";

export class DragCoordinateBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
		private readonly coordinatePoints: CoordinatePointBehavior,
		private readonly coordinateSnapping: CoordinateSnappingBehavior,
		private readonly lineSnapping: LineSnappingBehavior,
		private readonly readFeature: ReadFeatureBehavior,
		private readonly mutateFeature: MutateFeatureBehavior,
	) {
		super(config);
	}

	private draggedCoordinate: { id: null | FeatureId; index: number } = {
		id: null,
		index: -1,
	};

	private getClosestCoordinate(
		event: TerraDrawMouseEvent,
		geometry: Polygon | LineString | Point,
	) {
		const closestCoordinate = {
			dist: Infinity,
			index: -1,
			isFirstOrLastPolygonCoord: false,
		};

		let geomCoordinates: Position[] | undefined;

		if (geometry.type === "LineString") {
			geomCoordinates = geometry.coordinates;
		} else if (geometry.type === "Polygon") {
			geomCoordinates = geometry.coordinates[0];
		} else {
			// We don't want to handle dragging
			// points here
			return closestCoordinate;
		}

		// Look through the selected features coordinates
		// and try to find a coordinate that is draggable
		for (let i = 0; i < geomCoordinates.length; i++) {
			const coord = geomCoordinates[i];
			const distance = this.pixelDistance.measure(event, coord);

			if (
				distance < this.pointerDistance &&
				distance < closestCoordinate.dist
			) {
				// We don't create a point for the final
				// polygon coord, so we must set it to the first
				// coordinate instead
				const isFirstOrLastPolygonCoord =
					geometry.type === "Polygon" &&
					(i === geomCoordinates.length - 1 || i === 0);

				closestCoordinate.dist = distance;
				closestCoordinate.index = isFirstOrLastPolygonCoord ? 0 : i;
				closestCoordinate.isFirstOrLastPolygonCoord = isFirstOrLastPolygonCoord;
			}
		}

		return closestCoordinate;
	}

	public getDraggableIndex(
		event: TerraDrawMouseEvent,
		selectedId: FeatureId,
	): number {
		const geometry = this.readFeature.getGeometry(selectedId);
		const closestCoordinate = this.getClosestCoordinate(event, geometry);

		// No coordinate was within the pointer distance
		if (closestCoordinate.index === -1) {
			return -1;
		}
		return closestCoordinate.index;
	}

	private snapCoordinate(
		event: TerraDrawMouseEvent,
		snapping: Snapping,
		draggedFeature: GeoJSONStoreFeatures,
	): Position {
		let snappedCoordinate: Position = [event.lng, event.lat];

		// This is a uniform filter we can use across all snapping behaviors
		const filter = (feature: Feature) => {
			return Boolean(
				feature.properties &&
					feature.properties.mode === draggedFeature.properties.mode &&
					feature.id !== this.draggedCoordinate.id,
			);
		};

		if (snapping?.toLine) {
			let snapped: Position | undefined;

			snapped = this.lineSnapping.getSnappable(event, filter).coordinate;

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		if (snapping.toCoordinate) {
			let snapped: Position | undefined = undefined;

			snapped = this.coordinateSnapping.getSnappable(event, filter).coordinate;

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		if (snapping?.toCustom) {
			let snapped: Position | undefined = undefined;

			snapped = snapping.toCustom(event, {
				currentCoordinate: this.draggedCoordinate.index,
				currentId: draggedFeature.id,
				getCurrentGeometrySnapshot: draggedFeature.id
					? () =>
							this.readFeature.getGeometry<Polygon>(
								draggedFeature.id as FeatureId,
							)
					: () => null,
				project: this.project,
				unproject: this.unproject,
			});

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		return snappedCoordinate;
	}

	drag(
		event: TerraDrawMouseEvent,
		allowSelfIntersection: boolean,
		snapping: Snapping,
	): boolean {
		const draggedFeatureId = this.draggedCoordinate.id;

		if (draggedFeatureId === null) {
			return false;
		}

		const index = this.draggedCoordinate.index;
		const geometry = this.readFeature.getGeometry(draggedFeatureId);
		const properties = this.readFeature.getProperties(draggedFeatureId);

		const updatedCoordinates = (
			geometry.type === "LineString"
				? geometry.coordinates
				: geometry.coordinates[0]
		) as Position[];

		const isFirstOrLastPolygonCoord =
			geometry.type === "Polygon" &&
			(index === updatedCoordinates.length - 1 || index === 0);

		const draggedFeature: GeoJSONStoreFeatures = {
			type: "Feature",
			id: draggedFeatureId,
			geometry,
			properties,
		};

		const updatedCoordinate = this.snapCoordinate(
			event,
			snapping,
			draggedFeature,
		);

		// Ensure that coordinates do not exceed
		// lng lat limits. Long term we may want to figure out
		// proper handling of anti meridian crossings
		if (
			event.lng > 180 ||
			event.lng < -180 ||
			event.lat > 90 ||
			event.lat < -90
		) {
			return false;
		}

		// We want to update the actual Polygon/LineString itself -
		// for Polygons we want the first and last coordinates to match
		if (isFirstOrLastPolygonCoord) {
			const lastCoordIndex = updatedCoordinates.length - 1;
			updatedCoordinates[0] = updatedCoordinate;
			updatedCoordinates[lastCoordIndex] = updatedCoordinate;
		} else {
			updatedCoordinates[index] = updatedCoordinate;
		}

		if (
			geometry.type !== "Point" &&
			!allowSelfIntersection &&
			selfIntersects({
				type: "Feature",
				geometry: geometry,
				properties: {},
			} as Feature<Polygon>)
		) {
			return false;
		}

		const featureId = draggedFeatureId as FeatureId;

		let updated: GeoJSONStoreFeatures | null = null;

		if (geometry.type === "Polygon") {
			updated = this.mutateFeature.updatePolygon({
				featureId,
				coordinateMutations: {
					type: Mutations.Replace,
					coordinates: [updatedCoordinates],
				},
				context: {
					updateType: UpdateTypes.Provisional as const,
				},
			});
		} else if (geometry.type === "LineString") {
			updated = this.mutateFeature.updateLineString({
				featureId,
				coordinateMutations: {
					type: Mutations.Replace,
					coordinates: updatedCoordinates,
				},
				context: {
					updateType: UpdateTypes.Provisional as const,
				},
			});
		}

		if (!updated) {
			return false;
		}

		// Perform the update to the midpoints and selection points
		this.midPoints.updateOneAtIndex(index, updatedCoordinates);
		this.midPoints.updateOneAtIndex(index + 1, updatedCoordinates);
		this.selectionPoints.updateOneAtIndex(index, updatedCoordinate);
		this.coordinatePoints.updateOneAtIndex(featureId, index, updatedCoordinate);

		return true;
	}

	isDragging() {
		return this.draggedCoordinate.id !== null;
	}

	startDragging(id: FeatureId, index: number) {
		this.draggedCoordinate = {
			id,
			index,
		};
	}

	stopDragging() {
		this.draggedCoordinate = {
			id: null,
			index: -1,
		};
	}
}
