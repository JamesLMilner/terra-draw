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
import { pixelDistance } from "../../../geometry/measure/pixel-distance";

export type ResizeOptions =
	| "center-fixed"
	| "opposite-fixed"
	| "opposite"
	| "center"
	| "center-planar"
	| "opposite-planar";

type BoundingBoxIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type BoundingBox = readonly [
	number[],
	number[],
	number[],
	number[],
	number[],
	number[],
	number[],
	number[],
];

export class DragCoordinateResizeBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
		private readonly minDistanceFromSelectionPoint: number,
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

	private isValidDrag(
		index: BoundingBoxIndex,
		distanceX: number,
		distanceY: number,
	) {
		console.log({ index, distanceX, distanceY });

		switch (index) {
			case 0:
				if (distanceX > 0 || distanceY < 0) {
					return false;
				}
				break;
			case 1:
				if (distanceY < 0) {
					return false;
				}
				break;
			case 2:
				if (distanceX < 0 || distanceY < 0) {
					return false;
				}
				break;
			case 3:
				if (distanceX < 0) {
					return false;
				}
				break;
			case 4:
				if (distanceX < 0 || distanceY > 0) {
					return false;
				}
				break;
			case 5:
				if (distanceY > 0) {
					return false;
				}
				break;
			case 6:
				if (distanceX > 0 || distanceY > 0) {
					return false;
				}
				break;
			case 7:
				if (distanceX > 0) {
					return false;
				}
				break;
			default:
				break;
		}

		return true;
	}

	private getOptions(feature: Feature<Polygon | LineString>) {
		const coordinates =
			feature.geometry.type === "Polygon"
				? feature.geometry.coordinates[0]
				: feature.geometry.coordinates;

		const options = this.getBBox(coordinates);
		return options;
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

	public drag(
		event: TerraDrawMouseEvent,
		resizeOption: ResizeOptions,
	): boolean {
		if (!this.draggedCoordinate.id) {
			return false;
		}
		const index = this.draggedCoordinate.index as BoundingBoxIndex;
		const geometry = this.store.getGeometryCopy(this.draggedCoordinate.id);

		// Update the geometry of the dragged feature
		if (geometry.type !== "Polygon" && geometry.type !== "LineString") {
			return false;
		}

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

		const options = this.getOptions(feature);

		const { oppositeBboxIndex, closestBBoxIndex } = this.getIndexes(
			options,
			selectedCoordinate,
		);

		if (
			resizeOption === "center-fixed" ||
			resizeOption === "center" ||
			resizeOption === "center-planar"
		) {
			origin = centroid(feature);
		} else if (
			resizeOption === "opposite-fixed" ||
			resizeOption === "opposite" ||
			resizeOption === "opposite-planar"
		) {
			origin = options[oppositeBboxIndex];
		}

		if (!origin) {
			return false;
		}

		const { x: selectedX, y: selectedY } = this.project(
			selectedCoordinate[0],
			selectedCoordinate[1],
		);
		const distanceSelectedToCursor = pixelDistance(
			{ x: event.containerX, y: event.containerY },
			{ x: selectedX, y: selectedY },
		);

		const { x: originX, y: originY } = this.project(origin[0], origin[1]);
		const distanceOriginToCursor = pixelDistance(
			{ x: event.containerX, y: event.containerY },
			{ x: originX, y: originY },
		);

		// This will mean that the cursor is not near the dragged coordinate
		// and we should not scale
		// if (distanceSelectedToCursor > this.pointerDistance) {
		// 	return false;
		// }

		const distanceOriginToSelected = pixelDistance(
			{ x: originX, y: originY },
			{ x: selectedX, y: selectedY },
		);

		let scale = 1;
		if (distanceOriginToCursor !== 0) {
			scale =
				1 -
				(distanceOriginToSelected - distanceOriginToCursor) /
					distanceOriginToCursor;
		}

		const distanceX = -(originX - event.containerX);
		const distanceY = originY - event.containerY;

		const valid = this.isValidDrag(closestBBoxIndex, distanceX, distanceY);

		console.log({ valid });

		if (!valid) {
			return false;
		}

		let xScale = 1;
		const cursorDistanceX = Math.abs(originX - event.containerX);
		const currentDistanceX = Math.abs(originX - selectedX);
		if (
			cursorDistanceX !== 0 &&
			closestBBoxIndex !== 1 &&
			closestBBoxIndex !== 5
		) {
			xScale = 1 - (currentDistanceX - cursorDistanceX) / cursorDistanceX;
		}

		let yScale = 1;
		const cursorDistanceY = Math.abs(originY - event.containerY);
		const currentDistanceY = Math.abs(originY - selectedY);
		if (
			cursorDistanceY !== 0 &&
			closestBBoxIndex !== 3 &&
			closestBBoxIndex !== 7
		) {
			yScale = 1 - (currentDistanceY - cursorDistanceY) / cursorDistanceY;
		}

		if (resizeOption === "center-fixed" || resizeOption === "opposite-fixed") {
			transformScale(feature, scale, origin);
		} else if (resizeOption === "opposite" || resizeOption === "center") {
			// Quick check to ensure it's viable to even scale
			// TODO: We could probably be smarter about this as this will
			// break in some instances
			if (distanceSelectedToCursor > distanceOriginToCursor) {
				return false;
			}

			if (!this.validateScale(xScale, yScale)) {
				return false;
			}

			transformScale(feature, xScale, origin, "x");
			transformScale(feature, yScale, origin, "y");
		} else if (
			resizeOption === "center-planar" ||
			resizeOption === "opposite-planar"
		) {
			if (!this.validateScale(xScale, yScale)) {
				return false;
			}

			this.scalePlanar(updatedCoords, originX, originY, xScale, yScale);
		} else {
			throw new Error("Invalid resize option");
		}

		// We want to ensure that we are not causing the corners
		// of the bounding box to overlap. This also has the side
		// affect of preventing bugs
		const bbox = this.getBBox(updatedCoords);
		for (let i = 0; i < bbox.length; i++) {
			if (i === oppositeBboxIndex) {
				continue;
			}

			// Projecting can sometimes cause invalid coordinates
			let bboxPixelCoordinate;
			try {
				bboxPixelCoordinate = this.config.project(bbox[i][0], bbox[i][1]);
			} catch (_) {
				return false;
			}

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const distanceToOtherBboxCoordinate = this.pixelDistance.measure(
				{
					containerX: bboxPixelCoordinate.x,
					containerY: bboxPixelCoordinate.y,
				} as TerraDrawMouseEvent,
				origin,
			);

			// if (distanceToOtherBboxCoordinate < this.minDistanceFromSelectionPoint) {
			// 	return false;
			// }
		}

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

		return true;
	}

	private validateScale(xScale: number, yScale: number) {
		const validX =
			!isNaN(xScale) && xScale > 0 && yScale < Number.MAX_SAFE_INTEGER;
		const validY =
			!isNaN(yScale) && yScale > 0 && yScale < Number.MAX_SAFE_INTEGER;

		return validX && validY;
	}

	private scalePlanar(
		coordinates: Position[],
		originX: number,
		originY: number,
		xScale: number,
		yScale: number,
	) {
		coordinates.forEach((coordinate) => {
			const { x, y } = this.project(coordinate[0], coordinate[1]);

			const updatedX = originX + (x - originX) * xScale;
			const updatedY = originY + (y - originY) * yScale;
			const updatedCoordinate = this.unproject(updatedX, updatedY);

			coordinate[0] = updatedCoordinate.lng;
			coordinate[1] = updatedCoordinate.lat;
		});
	}

	private getCenterOrigin(feature: Feature<Polygon | LineString>) {
		return centroid(feature);
	}

	private getBBox(coordinates: Position[]) {
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

		return [
			topLeft, // 1
			midTop, // 2
			topRight,
			midRight,
			lowRight,
			midBottom,
			lowLeft,
			midLeft,
		] as const;
	}

	private getIndexes(
		options: BoundingBox,
		// feature: Feature<Polygon | LineString>,
		selectedCoordinate: Position,
	) {
		// const coordinates =
		// 	feature.geometry.type === "Polygon"
		// 		? feature.geometry.coordinates[0]
		// 		: feature.geometry.coordinates;

		// const options = this.getBBox(coordinates);

		let closestIndex: BoundingBoxIndex | undefined;
		let closestDistance = Infinity;

		for (let i = 0; i < options.length; i++) {
			const distance = haversineDistanceKilometers(
				selectedCoordinate,
				options[i],
			);
			if (distance < closestDistance) {
				closestIndex = i as BoundingBoxIndex;
				closestDistance = distance;
			}
		}

		if (closestIndex === undefined) {
			throw new Error("No closest coordinate found");
		}

		// Depending on where what the origin is set to, we need to find the position to
		// scale from
		const oppositeIndex = this.boundingBoxMaps["opposite"][
			closestIndex
		] as BoundingBoxIndex;

		return {
			oppositeBboxIndex: oppositeIndex,
			closestBBoxIndex: closestIndex,
		} as const;
	}

	// private getOppositeOrigin(options: BoundingBox, oppositeIndex: BoundingBoxIndex) {
	// 	return options[oppositeIndex]
	// }

	// private getOppositeOrigin(
	// 	feature: Feature<Polygon | LineString>,
	// 	selectedCoordinate: Position,
	// ) {
	// 	const coordinates =
	// 		feature.geometry.type === "Polygon"
	// 			? feature.geometry.coordinates[0]
	// 			: feature.geometry.coordinates;

	// 	const options = this.getBBox(coordinates);

	// 	let closest: BoundingBoxIndex | undefined;
	// 	let closestDistance = Infinity;

	// 	for (let i = 0; i < options.length; i++) {
	// 		const distance = haversineDistanceKilometers(
	// 			selectedCoordinate,
	// 			options[i],
	// 		);
	// 		if (distance < closestDistance) {
	// 			closest = i as BoundingBoxIndex;
	// 			closestDistance = distance;
	// 		}
	// 	}

	// 	if (closest === undefined) {
	// 		throw new Error("No closest coordinate found");
	// 	}

	// 	// Depending on where what the origin is set to, we need to find the position to
	// 	// scale from
	// 	const oppositeIndex = this.boundingBoxMaps["opposite"][
	// 		closest
	// 	] as BoundingBoxIndex;

	// 	return { origin: options[oppositeIndex], index: oppositeIndex, closest } as const;
	// }

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
