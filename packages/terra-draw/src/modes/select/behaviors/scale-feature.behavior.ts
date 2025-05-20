import { TerraDrawMouseEvent, Validation } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { FeatureId } from "../../../store/store";
import { DragCoordinateResizeBehavior } from "./drag-coordinate-resize.behavior";

export class ScaleFeatureBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly dragCoordinateResizeBehavior: DragCoordinateResizeBehavior,
	) {
		super(config);
	}

	public scale(
		event: TerraDrawMouseEvent,
		featureId: FeatureId,
		validation?: Validation,
	) {
		if (!this.dragCoordinateResizeBehavior.isDragging()) {
			const index = this.dragCoordinateResizeBehavior.getDraggableIndex(
				event,
				featureId,
			);
			this.dragCoordinateResizeBehavior.startDragging(featureId, index);
		}

		this.dragCoordinateResizeBehavior.drag(event, "center-fixed", validation);
	}

	public reset() {
		this.dragCoordinateResizeBehavior.stopDragging();
	}
}
