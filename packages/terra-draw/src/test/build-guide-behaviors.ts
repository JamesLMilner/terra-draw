import { BehaviorConfig } from "../modes/base.behavior";
import { PixelDistanceBehavior } from "../modes/pixel-distance.behavior";
import { ReadFeatureBehavior } from "../modes/read-feature.behavior";
import { MutateFeatureBehavior } from "../modes/mutate-feature.behavior";
import { BoundingBoxBehavior } from "../modes/select/behaviors/bounding-box.behavior";
import { ScaleHandleBehavior } from "../modes/select/behaviors/scale-handle.behavior";
import { RotateFeatureBehavior } from "../modes/select/behaviors/rotate-feature.behavior";
import { SelectionPointBehavior } from "../modes/select/behaviors/selection-point.behavior";
import { MidPointBehavior } from "../modes/select/behaviors/midpoint.behavior";
import { CoordinatePointBehavior } from "../modes/select/behaviors/coordinate-point.behavior";

// Test helper: wires the shared guide behaviors (bounding box, scale handles, rotate)
export function buildGuideBehaviors(
	config: BehaviorConfig,
	selectionPoints: SelectionPointBehavior,
	midPoints: MidPointBehavior,
	coordinatePoints: CoordinatePointBehavior,
	readFeature: ReadFeatureBehavior,
	mutateFeature: MutateFeatureBehavior,
) {
	const boundingBox = new BoundingBoxBehavior(
		config,
		readFeature,
		mutateFeature,
	);
	const scaleHandles = new ScaleHandleBehavior(
		config,
		boundingBox,
		readFeature,
		mutateFeature,
		new PixelDistanceBehavior(config),
	);
	const rotateFeature = new RotateFeatureBehavior(
		config,
		selectionPoints,
		midPoints,
		coordinatePoints,
		readFeature,
		mutateFeature,
		new PixelDistanceBehavior(config),
		boundingBox,
		scaleHandles,
	);
	return { boundingBox, scaleHandles, rotateFeature };
}
