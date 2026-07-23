import { TerraDrawMouseEvent } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { FeatureId } from "../../../store/store";
import { DragCoordinateResizeBehavior } from "./drag-coordinate-resize.behavior";
import { BoundingBoxBehavior } from "./bounding-box.behavior";

export class ScaleFeatureBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly dragCoordinateResizeBehavior: DragCoordinateResizeBehavior,
		private readonly boundingBox: BoundingBoxBehavior,
	) {
		super(config);
	}

	// Set while a bbox corner handle is being dragged.
	private cornerScaling: {
		featureId: FeatureId;
		cornerIndex: number;
	} | null = null;

	// Key-chord scale (e.g. Control+s): uniform scale about the centroid
	public scale(event: TerraDrawMouseEvent, featureId: FeatureId) {
		if (!this.dragCoordinateResizeBehavior.isDragging()) {
			const index = this.dragCoordinateResizeBehavior.getDraggableIndex(
				event,
				featureId,
			);
			this.dragCoordinateResizeBehavior.startDragging(featureId, index);
		}

		this.dragCoordinateResizeBehavior.drag(event, "center-fixed");
	}

	public isCornerScaling(): boolean {
		return this.cornerScaling !== null;
	}

	public startCornerScaling(featureId: FeatureId, cornerIndex: number) {
		this.cornerScaling = { featureId, cornerIndex };
	}

	// Corner-handle scale: opposite corner fixed, or about the centre when scaleFromCenter
	public scaleFromCorner(event: TerraDrawMouseEvent, scaleFromCenter: boolean) {
		if (!this.cornerScaling) {
			return;
		}

		if (!this.dragCoordinateResizeBehavior.isDragging()) {
			const corners = this.boundingBox.getCorners();
			if (!corners) {
				return;
			}
			this.dragCoordinateResizeBehavior.startDraggingFromCorner(
				this.cornerScaling.featureId,
				corners[this.cornerScaling.cornerIndex],
			);
		}

		this.dragCoordinateResizeBehavior.drag(
			event,
			scaleFromCenter ? "center-fixed" : "opposite-fixed",
		);
	}

	public reset() {
		this.dragCoordinateResizeBehavior.stopDragging();
		this.cornerScaling = null;
	}
}
