import { TerraDrawMouseEvent, UpdateTypes, Validation } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { FeatureAtPointerEventBehavior } from "./feature-at-pointer-event.behavior";
import { Position } from "geojson";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { FeatureId } from "../../../store/store";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../../../geometry/project/web-mercator";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";

export class DragFeatureBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly featuresAtCursorEvent: FeatureAtPointerEventBehavior,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
		private readonly coordinatePoints: CoordinatePointBehavior,
	) {
		super(config);
	}

	private draggedFeatureId: FeatureId | null = null;

	private dragPosition: Position | undefined;

	startDragging(event: TerraDrawMouseEvent, id: FeatureId) {
		this.draggedFeatureId = id;
		this.dragPosition = [event.lng, event.lat];
	}

	stopDragging() {
		this.draggedFeatureId = null;
		this.dragPosition = undefined;
	}

	isDragging() {
		return this.draggedFeatureId !== null;
	}

	canDrag(event: TerraDrawMouseEvent, selectedId: FeatureId) {
		const { clickedFeature } = this.featuresAtCursorEvent.find(event, true);

		// If the cursor is not over the selected
		// feature then we don't want to drag
		if (!clickedFeature || clickedFeature.id !== selectedId) {
			return false;
		}

		return true;
	}

	drag(event: TerraDrawMouseEvent, validateFeature?: Validation) {
		if (!this.draggedFeatureId) {
			return;
		}

		const geometry = this.store.getGeometryCopy(this.draggedFeatureId);
		const cursorCoord = [event.lng, event.lat];

		// Update the geometry of the dragged feature
		if (geometry.type === "Polygon" || geometry.type === "LineString") {
			let updatedCoords: Position[];
			let upToCoord: number;

			if (geometry.type === "Polygon") {
				updatedCoords = geometry.coordinates[0];
				upToCoord = updatedCoords.length - 1;
			} else {
				// Must be LineString here
				updatedCoords = geometry.coordinates;
				upToCoord = updatedCoords.length;
			}

			if (!this.dragPosition) {
				return false;
			}

			for (let i = 0; i < upToCoord; i++) {
				const coordinate = updatedCoords[i];

				let updatedLng: number;
				let updatedLat: number;

				if (this.config.projection === "web-mercator") {
					const webMercatorDragPosition = lngLatToWebMercatorXY(
						this.dragPosition[0],
						this.dragPosition[1],
					);
					const webMercatorCursorCoord = lngLatToWebMercatorXY(
						cursorCoord[0],
						cursorCoord[1],
					);
					const webMercatorCoordinate = lngLatToWebMercatorXY(
						coordinate[0],
						coordinate[1],
					);

					const delta = {
						x: webMercatorDragPosition.x - webMercatorCursorCoord.x,
						y: webMercatorDragPosition.y - webMercatorCursorCoord.y,
					};

					const updatedX = webMercatorCoordinate.x - delta.x;
					const updatedY = webMercatorCoordinate.y - delta.y;

					const { lng, lat } = webMercatorXYToLngLat(updatedX, updatedY);

					updatedLng = lng;
					updatedLat = lat;
				} else {
					const delta = [
						this.dragPosition[0] - cursorCoord[0],
						this.dragPosition[1] - cursorCoord[1],
					];
					updatedLng = coordinate[0] - delta[0];
					updatedLat = coordinate[1] - delta[1];
				}

				// Keep precision limited when calculating new coordinates
				updatedLng = limitPrecision(
					updatedLng,
					this.config.coordinatePrecision,
				);

				updatedLat = limitPrecision(
					updatedLat,
					this.config.coordinatePrecision,
				);

				// Ensure that coordinates do not exceed
				// lng lat limits. Long term we may want to figure out
				// proper handling of anti meridian crossings
				if (
					updatedLng > 180 ||
					updatedLng < -180 ||
					updatedLat > 90 ||
					updatedLat < -90
				) {
					return false;
				}

				updatedCoords[i] = [updatedLng, updatedLat];
			}

			// Set final coordinate identical to first
			// We only want to do this for polygons!
			if (geometry.type === "Polygon") {
				updatedCoords[updatedCoords.length - 1] = [
					updatedCoords[0][0],
					updatedCoords[0][1],
				];
			}

			const updatedSelectionPoints =
				this.selectionPoints.getUpdated(updatedCoords) || [];

			const updatedMidPoints = this.midPoints.getUpdated(updatedCoords) || [];

			const updatedCoordinatePoints =
				this.coordinatePoints.getUpdated(
					this.draggedFeatureId,
					updatedCoords,
				) || [];

			if (validateFeature) {
				const validationResult = validateFeature(
					{
						type: "Feature",
						id: this.draggedFeatureId,
						geometry,
						properties: {},
					},
					{
						project: this.config.project,
						unproject: this.config.unproject,
						coordinatePrecision: this.config.coordinatePrecision,
						updateType: UpdateTypes.Provisional,
					},
				);

				if (!validationResult.valid) {
					return false;
				}
			}

			// Issue the update to the selected feature
			this.store.updateGeometry([
				{ id: this.draggedFeatureId, geometry },
				...updatedSelectionPoints,
				...updatedMidPoints,
				...updatedCoordinatePoints,
			]);

			this.dragPosition = [event.lng, event.lat];

			// Update mid point positions
		} else if (geometry.type === "Point") {
			// For cursor points we can simply move it
			// to the dragged position
			this.store.updateGeometry([
				{
					id: this.draggedFeatureId,
					geometry: {
						type: "Point",
						coordinates: cursorCoord,
					},
				},
			]);

			this.dragPosition = [event.lng, event.lat];
		}
	}
}
