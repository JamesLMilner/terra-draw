import { TerraDrawMouseEvent, UpdateTypes, Validation } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { LineString, Polygon, Position, Point, Feature } from "geojson";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { FeatureId, GeoJSONStoreGeometries } from "../../../store/store";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { cartesianDistance } from "../../../geometry/measure/pixel-distance";
import { coordinateIsValid } from "../../../geometry/boolean/is-valid-coordinate";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../../../geometry/project/web-mercator";
import { webMercatorCentroid } from "../../../geometry/web-mercator-centroid";

export type ResizeOptions =
	| "center"
	| "opposite"
	| "center-fixed"
	| "opposite-fixed";

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
	) {
		super(config);
	}

	private minimumScale = 0.0001;

	private draggedCoordinate: { id: null | FeatureId; index: number } = {
		id: null,
		index: -1,
	};

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

	private isValidDragWebMercator(
		index: BoundingBoxIndex,
		distanceX: number,
		distanceY: number,
	) {
		switch (index) {
			case 0:
				if (distanceX <= 0 || distanceY >= 0) {
					return false;
				}
				break;
			case 1:
				if (distanceY >= 0) {
					return false;
				}
				break;
			case 2:
				if (distanceX >= 0 || distanceY >= 0) {
					return false;
				}
				break;
			case 3:
				if (distanceX >= 0) {
					return false;
				}
				break;
			case 4:
				if (distanceX >= 0 || distanceY <= 0) {
					return false;
				}
				break;
			case 5:
				if (distanceY <= 0) {
					return false;
				}
				break;
			case 6:
				if (distanceX <= 0 || distanceY <= 0) {
					return false;
				}
				break;
			case 7:
				if (distanceX <= 0) {
					return false;
				}
				break;
			default:
				break;
		}

		return true;
	}

	private getSelectedFeatureDataWebMercator() {
		if (!this.draggedCoordinate.id || this.draggedCoordinate.index === -1) {
			return null;
		}

		const feature = this.getFeature(this.draggedCoordinate.id);
		if (!feature) {
			return null;
		}

		const updatedCoords = this.getNormalisedCoordinates(feature.geometry);
		const boundingBox = this.getBBoxWebMercator(updatedCoords);

		return {
			boundingBox,
			feature,
			updatedCoords,
			selectedCoordinate: updatedCoords[this.draggedCoordinate.index],
		};
	}

	private centerWebMercatorDrag(event: TerraDrawMouseEvent) {
		const featureData = this.getSelectedFeatureDataWebMercator();
		if (!featureData) {
			return null;
		}
		const { feature, boundingBox, updatedCoords, selectedCoordinate } =
			featureData;

		const webMercatorOrigin = webMercatorCentroid(feature);

		if (!webMercatorOrigin) {
			return null;
		}

		const webMercatorSelected = lngLatToWebMercatorXY(
			selectedCoordinate[0],
			selectedCoordinate[1],
		);

		const { closestBBoxIndex } = this.getIndexesWebMercator(
			boundingBox,
			webMercatorSelected,
		);

		const webMercatorCursor = lngLatToWebMercatorXY(event.lng, event.lat);

		this.scaleWebMercator({
			closestBBoxIndex,
			updatedCoords,
			webMercatorCursor,
			webMercatorSelected,
			webMercatorOrigin,
		});

		return updatedCoords;
	}

	private centerFixedWebMercatorDrag(event: TerraDrawMouseEvent) {
		const featureData = this.getSelectedFeatureDataWebMercator();
		if (!featureData) {
			return null;
		}
		const { feature, boundingBox, updatedCoords, selectedCoordinate } =
			featureData;

		const webMercatorOrigin = webMercatorCentroid(feature);

		if (!webMercatorOrigin) {
			return null;
		}

		const webMercatorSelected = lngLatToWebMercatorXY(
			selectedCoordinate[0],
			selectedCoordinate[1],
		);

		const { closestBBoxIndex } = this.getIndexesWebMercator(
			boundingBox,
			webMercatorSelected,
		);

		const webMercatorCursor = lngLatToWebMercatorXY(event.lng, event.lat);

		this.scaleFixedWebMercator({
			closestBBoxIndex,
			updatedCoords,
			webMercatorCursor,
			webMercatorSelected,
			webMercatorOrigin,
		});

		return updatedCoords;
	}

	private scaleFixedWebMercator({
		closestBBoxIndex,
		webMercatorOrigin,
		webMercatorSelected,
		webMercatorCursor,
		updatedCoords,
	}: {
		closestBBoxIndex: BoundingBoxIndex;
		updatedCoords: Position[];
		webMercatorCursor: { x: number; y: number };
		webMercatorSelected: { x: number; y: number };
		webMercatorOrigin: { x: number; y: number };
	}) {
		const cursorDistanceX = webMercatorOrigin.x - webMercatorCursor.x;
		const cursorDistanceY = webMercatorOrigin.y - webMercatorCursor.y;

		const valid = this.isValidDragWebMercator(
			closestBBoxIndex,
			cursorDistanceX,
			cursorDistanceY,
		);

		if (!valid) {
			return null;
		}

		let scale =
			cartesianDistance(webMercatorOrigin, webMercatorCursor) /
			cartesianDistance(webMercatorOrigin, webMercatorSelected);

		if (scale < 0) {
			scale = this.minimumScale;
		}

		this.performWebMercatorScale(
			updatedCoords,
			webMercatorOrigin.x,
			webMercatorOrigin.y,
			scale,
			scale,
		);

		return updatedCoords;
	}

	private oppositeFixedWebMercatorDrag(event: TerraDrawMouseEvent) {
		const featureData = this.getSelectedFeatureDataWebMercator();
		if (!featureData) {
			return null;
		}

		const { boundingBox, updatedCoords, selectedCoordinate } = featureData;

		const webMercatorSelected = lngLatToWebMercatorXY(
			selectedCoordinate[0],
			selectedCoordinate[1],
		);

		const { oppositeBboxIndex, closestBBoxIndex } = this.getIndexesWebMercator(
			boundingBox,
			webMercatorSelected,
		);

		const webMercatorOrigin = {
			x: boundingBox[oppositeBboxIndex][0],
			y: boundingBox[oppositeBboxIndex][1],
		};
		const webMercatorCursor = lngLatToWebMercatorXY(event.lng, event.lat);

		this.scaleFixedWebMercator({
			closestBBoxIndex,
			updatedCoords,
			webMercatorCursor,
			webMercatorSelected,
			webMercatorOrigin,
		});

		return updatedCoords;
	}

	private oppositeWebMercatorDrag(event: TerraDrawMouseEvent) {
		const featureData = this.getSelectedFeatureDataWebMercator();
		if (!featureData) {
			return null;
		}

		const { boundingBox, updatedCoords, selectedCoordinate } = featureData;

		const webMercatorSelected = lngLatToWebMercatorXY(
			selectedCoordinate[0],
			selectedCoordinate[1],
		);

		const { oppositeBboxIndex, closestBBoxIndex } = this.getIndexesWebMercator(
			boundingBox,
			webMercatorSelected,
		);

		const webMercatorOrigin = {
			x: boundingBox[oppositeBboxIndex][0],
			y: boundingBox[oppositeBboxIndex][1],
		};
		const webMercatorCursor = lngLatToWebMercatorXY(event.lng, event.lat);

		this.scaleWebMercator({
			closestBBoxIndex,
			updatedCoords,
			webMercatorCursor,
			webMercatorSelected,
			webMercatorOrigin,
		});

		return updatedCoords;
	}

	private scaleWebMercator({
		closestBBoxIndex,
		webMercatorOrigin,
		webMercatorSelected,
		webMercatorCursor,
		updatedCoords,
	}: {
		closestBBoxIndex: BoundingBoxIndex;
		updatedCoords: Position[];
		webMercatorCursor: { x: number; y: number };
		webMercatorSelected: { x: number; y: number };
		webMercatorOrigin: { x: number; y: number };
	}) {
		const cursorDistanceX = webMercatorOrigin.x - webMercatorCursor.x;
		const cursorDistanceY = webMercatorOrigin.y - webMercatorCursor.y;

		const valid = this.isValidDragWebMercator(
			closestBBoxIndex,
			cursorDistanceX,
			cursorDistanceY,
		);

		if (!valid) {
			return null;
		}

		let xScale = 1;
		if (
			cursorDistanceX !== 0 &&
			closestBBoxIndex !== 1 &&
			closestBBoxIndex !== 5
		) {
			const currentDistanceX = webMercatorOrigin.x - webMercatorSelected.x;
			xScale = 1 - (currentDistanceX - cursorDistanceX) / cursorDistanceX;
		}

		let yScale = 1;
		if (
			cursorDistanceY !== 0 &&
			closestBBoxIndex !== 3 &&
			closestBBoxIndex !== 7
		) {
			const currentDistanceY = webMercatorOrigin.y - webMercatorSelected.y;
			yScale = 1 - (currentDistanceY - cursorDistanceY) / cursorDistanceY;
		}

		if (!this.validateScale(xScale, yScale)) {
			return null;
		}

		if (xScale < 0) {
			xScale = this.minimumScale;
		}

		if (yScale < 0) {
			yScale = this.minimumScale;
		}

		this.performWebMercatorScale(
			updatedCoords,
			webMercatorOrigin.x,
			webMercatorOrigin.y,
			xScale,
			yScale,
		);

		return updatedCoords;
	}

	private getFeature(id: FeatureId) {
		if (this.draggedCoordinate.id === null) {
			return null;
		}

		const geometry = this.store.getGeometryCopy(id);

		// Update the geometry of the dragged feature
		if (geometry.type !== "Polygon" && geometry.type !== "LineString") {
			return null;
		}

		const feature = { type: "Feature", geometry, properties: {} } as Feature<
			Polygon | LineString
		>;

		return feature;
	}

	private getNormalisedCoordinates(geometry: Polygon | LineString) {
		// Coordinates are either polygon or linestring at this point
		return geometry.type === "Polygon"
			? geometry.coordinates[0]
			: geometry.coordinates;
	}

	private validateScale(xScale: number, yScale: number) {
		const validX = !isNaN(xScale) && yScale < Number.MAX_SAFE_INTEGER;
		const validY = !isNaN(yScale) && yScale < Number.MAX_SAFE_INTEGER;

		return validX && validY;
	}

	private performWebMercatorScale(
		coordinates: Position[],
		originX: number,
		originY: number,
		xScale: number,
		yScale: number,
	) {
		coordinates.forEach((coordinate) => {
			const { x, y } = lngLatToWebMercatorXY(coordinate[0], coordinate[1]);

			const updatedX = originX + (x - originX) * xScale;
			const updatedY = originY + (y - originY) * yScale;

			const { lng, lat } = webMercatorXYToLngLat(updatedX, updatedY);

			coordinate[0] = lng;
			coordinate[1] = lat;
		});
	}

	private getBBoxWebMercator(coordinates: Position[]) {
		const bbox: [number, number, number, number] = [
			Infinity,
			Infinity,
			-Infinity,
			-Infinity,
		];

		// Convert from [lng, lat] -> [x, y]
		coordinates = coordinates.map((coord) => {
			const { x, y } = lngLatToWebMercatorXY(coord[0], coord[1]);
			return [x, y];
		});

		coordinates.forEach(([x, y]) => {
			if (x < bbox[0]) {
				bbox[0] = x;
			}

			if (y < bbox[1]) {
				bbox[1] = y;
			}

			if (x > bbox[2]) {
				bbox[2] = x;
			}

			if (y > bbox[3]) {
				bbox[3] = y;
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
		const topRight = [east, north];
		const lowRight = [east, south];
		const lowLeft = [west, south];

		const midTop = [(west + east) / 2, north];
		const midRight = [east, north + (south - north) / 2];
		const midBottom = [(west + east) / 2, south];
		const midLeft = [west, north + (south - north) / 2];

		return [
			topLeft, // 0
			midTop, // 1
			topRight, // 2
			midRight, // 3
			lowRight, // 4
			midBottom, // 5
			lowLeft, // 6
			midLeft, // 7
		] as const;
	}

	private getIndexesWebMercator(
		boundingBox: BoundingBox,
		selectedXY: { x: number; y: number },
	) {
		let closestIndex: BoundingBoxIndex | undefined;
		let closestDistance = Infinity;

		for (let i = 0; i < boundingBox.length; i++) {
			const distance = cartesianDistance(
				{ x: selectedXY.x, y: selectedXY.y },
				{ x: boundingBox[i][0], y: boundingBox[i][1] },
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

	/**
	 * @returns - true if the feature is being dragged (resized), false otherwise
	 */
	public isDragging() {
		return this.draggedCoordinate.id !== null;
	}

	/**
	 * Starts the resizing of the feature
	 * @param id - feature id of the feature that is being dragged
	 * @param index - index of the coordinate that is being dragged
	 * @returns - void
	 */
	public startDragging(id: FeatureId, index: number) {
		this.draggedCoordinate = {
			id,
			index,
		};
	}

	/**
	 * Stops the resizing of the feature
	 * @returns - void	 *
	 */
	public stopDragging() {
		this.draggedCoordinate = {
			id: null,
			index: -1,
		};
	}

	/**
	 * Returns the index of the coordinate that is going to be dragged
	 * @param event - cursor event
	 * @param selectedId - feature id of the feature that is selected
	 * @returns - the index to be dragged
	 */
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

	/**
	 * Resizes the feature based on the cursor event
	 * @param event - cursor event
	 * @param resizeOption - the resize option, either "center" or "opposite"
	 * @returns - true is resize was successful, false otherwise
	 */
	public drag(
		event: TerraDrawMouseEvent,
		resizeOption: ResizeOptions,
		validateFeature?: Validation,
	): boolean {
		if (!this.draggedCoordinate.id) {
			return false;
		}

		const feature = this.getFeature(this.draggedCoordinate.id);
		if (!feature) {
			return false;
		}

		let updatedCoords: Position[] | null = null;

		if (resizeOption === "center") {
			updatedCoords = this.centerWebMercatorDrag(event);
		} else if (resizeOption === "opposite") {
			updatedCoords = this.oppositeWebMercatorDrag(event);
		} else if (resizeOption === "center-fixed") {
			updatedCoords = this.centerFixedWebMercatorDrag(event);
		} else if (resizeOption === "opposite-fixed") {
			updatedCoords = this.oppositeFixedWebMercatorDrag(event);
		}

		if (!updatedCoords) {
			return false;
		}

		// Ensure that coordinate precision is maintained
		for (let i = 0; i < updatedCoords.length; i++) {
			const coordinate = updatedCoords[i];
			coordinate[0] = limitPrecision(coordinate[0], this.coordinatePrecision);
			coordinate[1] = limitPrecision(coordinate[1], this.coordinatePrecision);

			// Ensure the coordinate we are about to update with is valid
			if (!coordinateIsValid(coordinate, this.coordinatePrecision)) {
				return false;
			}
		}

		// Perform the update to the midpoints and selection points
		const updatedMidPoints = this.midPoints.getUpdated(updatedCoords) || [];
		const updatedSelectionPoints =
			this.selectionPoints.getUpdated(updatedCoords) || [];

		const updatedGeometry = {
			type: feature.geometry.type as "Polygon" | "LineString",
			coordinates:
				feature.geometry.type === "Polygon" ? [updatedCoords] : updatedCoords,
		} as GeoJSONStoreGeometries;

		if (validateFeature) {
			const valid = validateFeature(
				{
					id: this.draggedCoordinate.id,
					type: "Feature",
					geometry: updatedGeometry,
					properties: {},
				},
				{
					project: this.config.project,
					unproject: this.config.unproject,
					coordinatePrecision: this.config.coordinatePrecision,
					updateType: UpdateTypes.Provisional,
				},
			);
			if (!valid) {
				return false;
			}
		}

		// Issue the update to the selected feature
		this.store.updateGeometry([
			{
				id: this.draggedCoordinate.id,
				geometry: updatedGeometry,
			},
			...updatedSelectionPoints,
			...updatedMidPoints,
		]);

		return true;
	}
}
