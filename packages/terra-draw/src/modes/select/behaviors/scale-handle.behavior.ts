import { Point } from "geojson";
import { SELECT_PROPERTIES, TerraDrawMouseEvent } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { FeatureId } from "../../../store/store";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { BoundingBoxBehavior } from "./bounding-box.behavior";

const SCALE_HANDLE_THRESHOLD_PX = 15;

// Owns the four bbox corner scaling handles. Corner index order: 0 SW, 1 SE, 2 NE, 3 NW
export class ScaleHandleBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly boundingBox: BoundingBoxBehavior,
		private readonly readFeature: ReadFeatureBehavior,
		private readonly mutateFeature: MutateFeatureBehavior,
		private readonly pixelDistance: PixelDistanceBehavior,
	) {
		super(config);
	}

	private scaleHandleIds: FeatureId[] = [];

	public create({ featureId }: { featureId: FeatureId }) {
		const corners = this.boundingBox.getCorners();
		if (!corners) return;

		this.scaleHandleIds = this.mutateFeature.createGuidancePoints({
			coordinates: corners,
			type: SELECT_PROPERTIES.SCALE_HANDLE,
			additionalProperties: (index) => ({
				[SELECT_PROPERTIES.SCALE_HANDLE]: featureId,
				[SELECT_PROPERTIES.SCALE_HANDLE_INDEX]: index,
			}),
		});
	}

	public updateInPlace() {
		if (this.scaleHandleIds.length === 0) return;
		const corners = this.boundingBox.getCorners();
		if (!corners) return;

		this.mutateFeature.updateGuidancePoints(
			this.scaleHandleIds.map((featureId, index) => ({
				featureId,
				coordinate: corners[index],
			})),
		);
	}

	public getNearestScaleHandle(
		event: TerraDrawMouseEvent,
	): { id: FeatureId; index: number } | undefined {
		if (this.scaleHandleIds.length === 0) return undefined;

		let nearest: { id: FeatureId; index: number; dist: number } | undefined;

		this.scaleHandleIds.forEach((id, index) => {
			const dist = this.pixelDistance.measure(
				event,
				this.readFeature.getGeometry<Point>(id).coordinates,
			);
			if (
				dist <= SCALE_HANDLE_THRESHOLD_PX &&
				(!nearest || dist < nearest.dist)
			) {
				nearest = { id, index, dist };
			}
		});

		return nearest ? { id: nearest.id, index: nearest.index } : undefined;
	}

	public destroy() {
		this.mutateFeature.deleteFeaturesIfPresent(this.scaleHandleIds);
		this.scaleHandleIds = [];
	}

	public hasHandles(): boolean {
		return this.scaleHandleIds.length > 0;
	}
}
