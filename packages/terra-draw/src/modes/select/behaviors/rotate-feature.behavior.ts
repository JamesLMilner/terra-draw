import {
	CartesianPoint,
	SELECT_PROPERTIES,
	TerraDrawMouseEvent,
	UpdateTypes,
} from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { Feature, LineString, Polygon, Position, Point } from "geojson";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import {
	transformRotate,
	transformRotateWebMercator,
} from "../../../geometry/transform/rotate";
import { centroid } from "../../../geometry/centroid";
import { rhumbBearing } from "../../../geometry/measure/rhumb-bearing";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { FeatureId, GeoJSONStoreFeatures } from "../../../store/store";
import { webMercatorCentroid } from "../../../geometry/web-mercator-centroid";
import { lngLatToWebMercatorXY } from "../../../geometry/project/web-mercator";
import { webMercatorBearing } from "../../../geometry/measure/bearing";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import {
	MutateFeatureBehavior,
	Mutations,
	UpdateGeometry,
} from "../../mutate-feature.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { BoundingBoxBehavior } from "./bounding-box.behavior";
import { ScaleHandleBehavior } from "./scale-handle.behavior";

const DRAG_HANDLE_OFFSET_PX = 30;
const DRAG_HANDLE_THRESHOLD_PX = 15;

export class RotateFeatureBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
		private readonly coordinatePoints: CoordinatePointBehavior,
		private readonly readFeature: ReadFeatureBehavior,
		private readonly mutateFeature: MutateFeatureBehavior,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly boundingBox: BoundingBoxBehavior,
		private readonly scaleHandles: ScaleHandleBehavior,
	) {
		super(config);
	}

	private lastBearing: number | undefined;
	private selectedGeometry: Polygon | LineString | undefined;
	private selectedGeometryCentroid: Position | undefined;
	private selectedGeometryWebMercatorCentroid: CartesianPoint | undefined;
	private dragHandleId: FeatureId | undefined;
	private dragHandleGuideId: FeatureId | undefined;

	reset() {
		this.lastBearing = undefined;
		this.selectedGeometry = undefined;
		this.selectedGeometryWebMercatorCentroid = undefined;
		this.selectedGeometryCentroid = undefined;
		this.destroyDragHandle();
	}

	public getNearestRotateHandle(event: TerraDrawMouseEvent) {
		if (!this.dragHandleId) return;

		const distancePixles = this.pixelDistance.measure(
			event,
			this.readFeature.getGeometry<Point>(this.dragHandleId).coordinates,
		);

		if (distancePixles <= DRAG_HANDLE_THRESHOLD_PX) {
			return this.dragHandleId;
		}

		return;
	}

	/**
	 * Create the rotate handle Point and its connector LineString. The bounding
	 * box itself is owned by BoundingBoxBehavior and must already exist — the
	 * handle is anchored to the box's top-center.
	 */
	public createHandle({ featureId }: { featureId: FeatureId }) {
		const topCenter = this.boundingBox.getTopCenter();
		if (!topCenter) return;

		const dragHandlePosition = this.calculateHandlePosition(topCenter);

		const dragHandleId = this.mutateFeature.createGuidancePoint({
			coordinate: dragHandlePosition,
			type: SELECT_PROPERTIES.ROTATION_POINT,
			additionalProperties: {
				[SELECT_PROPERTIES.ROTATION_POINT]: featureId,
			},
		});

		const dragHandleGuideId = this.mutateFeature.createLineString({
			coordinates: [topCenter, dragHandlePosition],
			properties: {
				mode: this.mode,
				[SELECT_PROPERTIES.ROTATION_POINT_GUIDE]: featureId,
			},
		});

		this.dragHandleId = dragHandleId;
		this.dragHandleGuideId = dragHandleGuideId.id;

		return dragHandleId;
	}

	/**
	 * Reposition the rotate handle + connector from the current bounding box.
	 * The box must already have been updated (the cascade runs
	 * boundingBox.updateInPlace before this).
	 */
	public updateInPlace() {
		if (!this.dragHandleId) return;

		const topCenter = this.boundingBox.getTopCenter();
		if (!topCenter) return;

		const dragHandlePosition = this.calculateHandlePosition(topCenter);

		this.mutateFeature.updatePoint({
			featureId: this.dragHandleId,
			coordinateMutations: {
				coordinates: dragHandlePosition,
				type: Mutations.Replace,
			},
			context: {
				updateType: UpdateTypes.Commit,
			},
		});

		if (this.dragHandleGuideId) {
			this.mutateFeature.updateLineString({
				featureId: this.dragHandleGuideId,
				coordinateMutations: {
					coordinates: [topCenter, dragHandlePosition],
					type: Mutations.Replace,
				},
				context: {
					updateType: UpdateTypes.Commit,
				},
			});
		}
	}

	public destroyDragHandle() {
		this.mutateFeature.deleteFeatureIfPresent(this.dragHandleId);
		this.dragHandleId = undefined;
		this.mutateFeature.deleteFeatureIfPresent(this.dragHandleGuideId);
		this.dragHandleGuideId = undefined;
	}

	public stopDragging({
		featureCoordinates,
	}: {
		featureCoordinates?: Position[] | Position[][];
	}) {
		if (featureCoordinates) {
			// Finishing a rotation re-axis-aligns the shared box, then
			// repositions the rotate handle and scale handles onto it.
			this.boundingBox.updateInPlace({ featureCoordinates });
			this.updateInPlace();
			this.scaleHandles.updateInPlace();
		}
		this.lastBearing = undefined;
		this.selectedGeometry = undefined;
		this.selectedGeometryWebMercatorCentroid = undefined;
		this.selectedGeometryCentroid = undefined;
	}

	public isDragging() {
		return this.lastBearing !== undefined;
	}

	private calculateHandlePosition(topCenter: Position): Position {
		const [lng, lat] = topCenter;
		const referencePointPixelSpace = this.project(lng, lat);
		const handlePositionPixelSpace = {
			...referencePointPixelSpace,
			y: referencePointPixelSpace.y - DRAG_HANDLE_OFFSET_PX,
		};
		const handlePositionWorldSpace = this.unproject(
			handlePositionPixelSpace.x,
			handlePositionPixelSpace.y,
		);
		return [handlePositionWorldSpace.lng, handlePositionWorldSpace.lat];
	}

	rotate(event: TerraDrawMouseEvent, selectedId: FeatureId) {
		if (!this.selectedGeometry) {
			this.selectedGeometry = this.readFeature.getGeometry<
				LineString | Polygon
			>(selectedId);
		}

		let dragHandleGeom: Point | undefined;
		let dragHandleGuideGeom: LineString | undefined;
		const geometry = this.selectedGeometry;

		// The bounding box is owned by BoundingBoxBehavior and rotated rigidly
		// alongside the feature.
		const bboxGuideGeom = this.boundingBox.getGeometry();

		if (this.dragHandleId) {
			dragHandleGeom = this.readFeature.getGeometry<Point>(this.dragHandleId);
		}
		if (this.dragHandleGuideId) {
			dragHandleGuideGeom = this.readFeature.getGeometry<LineString>(
				this.dragHandleGuideId,
			);
		}

		// Update the geometry of the dragged feature
		if (geometry.type !== "Polygon" && geometry.type !== "LineString") {
			return;
		}

		const mouseCoord = [event.lng, event.lat];

		let bearing: number;
		let updateDragHandleFeature: Feature<Point> | undefined;
		let updateBBoxGuideFeature: Feature<Polygon> | undefined;
		let updateDragHandleGuideFeature: Feature<LineString> | undefined;
		const updatedFeature = { type: "Feature", geometry, properties: {} } as
			| Feature<Polygon>
			| Feature<LineString>;

		if (dragHandleGeom) {
			updateDragHandleFeature = {
				type: "Feature",
				geometry: dragHandleGeom,
				properties: {},
			} as Feature<Point>;
		}
		if (bboxGuideGeom) {
			updateBBoxGuideFeature = {
				type: "Feature",
				geometry: bboxGuideGeom,
				properties: {},
			} as Feature<Polygon>;
		}
		if (dragHandleGuideGeom) {
			updateDragHandleGuideFeature = {
				type: "Feature",
				geometry: dragHandleGuideGeom,
				properties: {},
			} as Feature<LineString>;
		}

		if (this.config.projection === "web-mercator") {
			// Cache the centroid of the selected geometry
			// to avoid recalculating it on every cursor move
			if (!this.selectedGeometryWebMercatorCentroid) {
				this.selectedGeometryWebMercatorCentroid =
					webMercatorCentroid(updatedFeature);
			}

			const cursorWebMercator = lngLatToWebMercatorXY(event.lng, event.lat);

			bearing = webMercatorBearing(
				this.selectedGeometryWebMercatorCentroid,
				cursorWebMercator,
			);

			if (bearing === 0) {
				return;
			}

			if (!this.lastBearing) {
				this.lastBearing = bearing;
				return;
			}

			const angle = this.lastBearing - bearing;

			transformRotateWebMercator(
				updatedFeature,
				-angle,
				this.selectedGeometryWebMercatorCentroid,
			);

			updateDragHandleFeature &&
				transformRotateWebMercator(
					updateDragHandleFeature,
					-angle,
					this.selectedGeometryWebMercatorCentroid,
				);
			updateBBoxGuideFeature &&
				transformRotateWebMercator(
					updateBBoxGuideFeature,
					-angle,
					this.selectedGeometryWebMercatorCentroid,
				);
			updateDragHandleGuideFeature &&
				transformRotateWebMercator(
					updateDragHandleGuideFeature,
					-angle,
					this.selectedGeometryWebMercatorCentroid,
				);
		} else if (this.config.projection === "globe") {
			// Cache the centroid of the selected geometry
			// to avoid recalculating it on every cursor move
			if (!this.selectedGeometryCentroid) {
				this.selectedGeometryCentroid = centroid({
					type: "Feature",
					geometry,
					properties: {},
				});
			}

			bearing = rhumbBearing(this.selectedGeometryCentroid, mouseCoord);

			// We need an original bearing to compare against
			if (!this.lastBearing) {
				this.lastBearing = bearing + 180;
				return;
			}

			const angle = this.lastBearing - (bearing + 180);

			transformRotate(updatedFeature, -angle);
			updateDragHandleFeature &&
				transformRotate(updateDragHandleFeature, -angle);
			updateBBoxGuideFeature && transformRotate(updateBBoxGuideFeature, -angle);
			updateDragHandleGuideFeature &&
				transformRotate(updateDragHandleGuideFeature, -angle);
		} else {
			throw new Error("Unsupported projection");
		}

		// Coordinates are either polygon or linestring at this point
		const updatedCoords: Position[] =
			geometry.type === "Polygon"
				? geometry.coordinates[0]
				: geometry.coordinates;

		// Ensure that coordinate precision is maintained
		updatedCoords.forEach((coordinate) => {
			coordinate[0] = limitPrecision(coordinate[0], this.coordinatePrecision);
			coordinate[1] = limitPrecision(coordinate[1], this.coordinatePrecision);
		});

		const update = {
			featureId: selectedId,
			coordinateMutations: {
				type: Mutations.Replace,
				coordinates:
					geometry.type === "Polygon" ? [updatedCoords] : updatedCoords,
			},
			context: {
				updateType: UpdateTypes.Provisional as const,
			},
		};

		if (updateDragHandleFeature) {
			this.mutateFeature.updatePoint({
				featureId: this.dragHandleId!,
				coordinateMutations: {
					coordinates: updateDragHandleFeature.geometry.coordinates,
					type: Mutations.Replace,
				},
				context: {
					updateType: UpdateTypes.Commit,
				},
			});
		}

		let updated: GeoJSONStoreFeatures<Polygon | LineString> | null = null;
		if (updatedFeature.geometry.type === "Polygon") {
			updated = this.mutateFeature.updatePolygon(
				update as UpdateGeometry<Polygon>,
			);
		} else if (updatedFeature.geometry.type === "LineString") {
			updated = this.mutateFeature.updateLineString(
				update as UpdateGeometry<LineString>,
			);
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
		this.coordinatePoints.updateAllInPlace({
			featureId: selectedId,
			featureCoordinates,
		});

		// Write the rigidly-rotated bounding box back and ride the scale handles
		// on the rotated corners.
		if (updateBBoxGuideFeature) {
			this.boundingBox.setGeometry(updateBBoxGuideFeature.geometry.coordinates);
			this.scaleHandles.updateInPlace();
		}

		if (updateDragHandleGuideFeature && this.dragHandleGuideId) {
			this.mutateFeature.updateLineString({
				featureId: this.dragHandleGuideId,
				coordinateMutations: {
					coordinates: updateDragHandleGuideFeature.geometry.coordinates,
					type: Mutations.Replace,
				},
				context: { updateType: UpdateTypes.Provisional as const },
			});
		}

		if (this.projection === "web-mercator") {
			this.lastBearing = bearing;
		} else if (this.projection === "globe") {
			this.lastBearing = bearing + 180;
		}
	}
}
