import { TerraDrawMouseEvent } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";

import { LineString, Polygon, Position, Point, Feature } from "geojson";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { FeatureId } from "../../../store/store";
import { centroid } from "../../../geometry/centroid";
import { haversineDistanceKilometers } from "../../../geometry/measure/haversine-distance";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { transformScale } from "../../../geometry/transform/scale";

export type ResizeOptions = "center-fixed" | "opposite-corner-fixed";

type OppositeMapIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export class DragCoordinateResizeBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
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
		const geometry = this.store.getGeometryCopy(selectedId);
		const closestCoordinate = this.getClosestCoordinate(event, geometry);

		// No coordinate was within the pointer distance
		if (closestCoordinate.index === -1) {
			return -1;
		}
		return closestCoordinate.index;
	}

	private lastDistance: number | undefined;

	public drag(
		event: TerraDrawMouseEvent,
		resizeOption: ResizeOptions,
	): boolean {
		if (!this.draggedCoordinate.id) {
			return false;
		}
		const index = this.draggedCoordinate.index;
		const geometry = this.store.getGeometryCopy(this.draggedCoordinate.id);

		// Update the geometry of the dragged feature
		if (geometry.type !== "Polygon" && geometry.type !== "LineString") {
			return false;
		}

		const mouseCoord = [event.lng, event.lat];

		// Coordinates are either polygon or linestring at this point
		const updatedCoords: Position[] =
			geometry.type === "Polygon"
				? geometry.coordinates[0]
				: geometry.coordinates;
		const selectedCoordinate = updatedCoords[index];

		const feature = { type: "Feature", geometry, properties: {} } as Feature<
			Polygon | LineString
		>;

		// Get the origin for the scaling to occur from
		let origin: Position | undefined;
		if (resizeOption === "center-fixed") {
			origin = this.getCenterOrigin(feature);
		} else if (resizeOption === "opposite-corner-fixed") {
			origin = this.getOppositeOrigin(feature, selectedCoordinate);
		}

		const distance = haversineDistanceKilometers(
			origin as Position,
			mouseCoord,
		);

		// We need an original bearing to compare against
		if (!this.lastDistance) {
			this.lastDistance = distance;
			return false;
		}

		const scale = 1 - (this.lastDistance - distance) / distance;

		transformScale(feature, scale, origin as Position);

		// Ensure that coordinate precision is maintained
		updatedCoords.forEach((coordinate) => {
			coordinate[0] = limitPrecision(coordinate[0], this.coordinatePrecision);
			coordinate[1] = limitPrecision(coordinate[1], this.coordinatePrecision);
		});

		const updatedMidPoints = this.midPoints.getUpdated(updatedCoords) || [];

		const updatedSelectionPoints =
			this.selectionPoints.getUpdated(updatedCoords) || [];

		// Issue the update to the selected feature
		this.store.updateGeometry([
			{
				id: this.draggedCoordinate.id,
				geometry,
			},
			...updatedSelectionPoints,
			...updatedMidPoints,
		]);

		this.lastDistance = distance;

		return true;
	}

	private getCenterOrigin(feature: Feature<Polygon | LineString>) {
		return centroid(feature);
	}

	private getOppositeOrigin(
		feature: Feature<Polygon | LineString>,
		selectedCoordinate: Position,
	) {
		const coordinates =
			feature.geometry.type === "Polygon"
				? feature.geometry.coordinates[0]
				: feature.geometry.coordinates;

		const bbox: [number, number, number, number] = [
			Infinity,
			Infinity,
			-Infinity,
			-Infinity,
		];
		coordinates.forEach((coord) => {
			if (bbox[0] > coord[0]) {
				bbox[0] = coord[0];
			}
			if (bbox[1] > coord[1]) {
				bbox[1] = coord[1];
			}
			if (bbox[2] < coord[0]) {
				bbox[2] = coord[0];
			}
			if (bbox[3] < coord[1]) {
				bbox[3] = coord[1];
			}
		});

		const [west, south, east, north] = bbox;

		//   Bounding box is represnted as follows:
		//
		//   0    1    2
		//   *----*----*
		// 	 |		   |
		// 7 *		   *  3
		//   |		   |
		//   *----*----*
		// 	 6    5    4
		//
		const topLeft = [west, north];
		const midTop = [(west + east) / 2, north];
		const topRight = [east, north];
		const midRight = [east, (south + north) / 2];
		const lowRight = [east, south];
		const midBottom = [(west + east) / 2, south];
		const lowLeft = [west, south];
		const midLeft = [west, (south + north) / 2];

		const options = [
			topLeft, // 1
			midTop, // 2
			topRight,
			midRight,
			lowRight,
			midBottom,
			lowLeft,
			midLeft,
		] as const;

		let closest: OppositeMapIndex | undefined;
		let closestDistance = Infinity;

		for (let i = 0; i < options.length; i++) {
			const distance = haversineDistanceKilometers(
				selectedCoordinate,
				options[i],
			);
			if (distance < closestDistance) {
				closest = i as OppositeMapIndex;
				closestDistance = distance;
			}
		}

		if (closest === undefined) {
			throw new Error("No closest coordinate found");
		}

		// Depending on where what the origin is set to, we need to find the position to
		// scale from
		const oppositeIndex = this.boundingBoxMaps["opposite"][closest];
		return options[oppositeIndex];
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
		this.lastDistance = undefined;
		this.draggedCoordinate = {
			id: null,
			index: -1,
		};
	}

	// This map provides the oppsite corner of the bbox
	// to the index of the coordinate provided
	//   0    1    2
	//   *----*----*
	// 	 |		   |
	// 7 *		   *  3
	//   |		   |
	//   *----*----*
	// 	 6    5    4
	//
	private boundingBoxMaps = {
		opposite: {
			0: 4,
			1: 5,
			2: 6,
			3: 7,
			4: 0,
			5: 1,
			6: 2,
			7: 3,
		},
	};
}
