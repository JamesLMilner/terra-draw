import { TerraDrawMouseEvent, UpdateTypes, Validation } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { FeatureAtPointerEventBehavior } from "./feature-at-pointer-event.behavior";
import { LineString, Polygon, Position } from "geojson";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { FeatureId, GeoJSONStoreFeatures } from "../../../store/store";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../../../geometry/project/web-mercator";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import {
	MutateFeatureBehavior,
	Mutations,
} from "../../mutate-feature.behavior";
import { getUnclosedCoordinates } from "../../../geometry/get-coordinates";

export class DragFeatureBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly featuresAtCursorEvent: FeatureAtPointerEventBehavior,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
		private readonly coordinatePoints: CoordinatePointBehavior,
		private readonly readFeature: ReadFeatureBehavior,
		private readonly mutateFeature: MutateFeatureBehavior,
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

	drag(event: TerraDrawMouseEvent) {
		if (!this.draggedFeatureId) {
			return;
		}

		const geometry = this.readFeature.getGeometry(this.draggedFeatureId);
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

			const featureId = this.draggedFeatureId as FeatureId;

			let updated: GeoJSONStoreFeatures<Polygon | LineString> | null = null;

			if (geometry.type === "Polygon") {
				updated = this.mutateFeature.updatePolygon({
					featureId,
					coordinateMutations: {
						type: Mutations.Replace,
						coordinates: [updatedCoords],
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
						coordinates: updatedCoords,
					},
					context: {
						updateType: UpdateTypes.Provisional as const,
					},
				});
			} else {
				return;
			}

			if (!updated) {
				return false;
			}

			const featureCoordinates = updated.geometry.coordinates;

			// Perform the update to the midpoints and selection points
			this.midPoints.updateAllInPlace({ featureCoordinates });
			this.selectionPoints.updateAllInPlace({ featureCoordinates });
			this.coordinatePoints.updateAllInPlace({ featureId, featureCoordinates });

			this.dragPosition = [event.lng, event.lat];

			// Update mid point positions
		} else if (geometry.type === "Point") {
			// For cursor points we can simply move it
			// to the dragged position
			this.mutateFeature.updatePoint({
				featureId: this.draggedFeatureId,
				coordinateMutations: {
					type: Mutations.Replace,
					coordinates: cursorCoord,
				},
				context: {
					updateType: UpdateTypes.Provisional as const,
				},
			});

			this.dragPosition = [event.lng, event.lat];
		}
	}
}
