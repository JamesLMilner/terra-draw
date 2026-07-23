import { Polygon, Position } from "geojson";
import { SELECT_PROPERTIES, UpdateTypes } from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { FeatureId } from "../../../store/store";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import {
	MutateFeatureBehavior,
	Mutations,
} from "../../mutate-feature.behavior";
import {
	BBox,
	bboxFromCoordinates,
	bboxPolygon,
} from "../../../geometry/shape/create-feature-bbox";

// Owns the shared selection bounding-box polygon (used by rotation and scaling)
export class BoundingBoxBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly readFeature: ReadFeatureBehavior,
		private readonly mutateFeature: MutateFeatureBehavior,
	) {
		super(config);
	}

	private boundingBoxGuideId: FeatureId | undefined;

	public create({
		featureId,
		featureCoordinates,
	}: {
		featureId: FeatureId;
		featureCoordinates: Position[] | Position[][];
	}): FeatureId {
		const featureBBox = bboxFromCoordinates(featureCoordinates);
		const polygon = bboxPolygon(featureBBox);

		const created = this.mutateFeature.createPolygon({
			coordinates: polygon.geometry.coordinates[0],
			properties: {
				mode: this.mode,
				[SELECT_PROPERTIES.ROTATION_BBOX_GUIDE]: featureId,
			},
		});

		this.boundingBoxGuideId = created.id;
		return created.id;
	}

	// Rebuild as an axis-aligned box from the current feature coordinates
	public updateInPlace({
		featureCoordinates,
	}: {
		featureCoordinates: Position[] | Position[][];
	}) {
		if (!this.boundingBoxGuideId) return;

		const featureBBox = bboxFromCoordinates(featureCoordinates);
		const polygon = bboxPolygon(featureBBox);

		this.mutateFeature.updatePolygon({
			featureId: this.boundingBoxGuideId,
			coordinateMutations: {
				coordinates: polygon.geometry.coordinates,
				type: Mutations.Replace,
			},
			context: { updateType: UpdateTypes.Commit },
		});
	}

	public getGeometry(): Polygon | undefined {
		if (!this.boundingBoxGuideId) return undefined;
		return this.readFeature.getGeometry<Polygon>(this.boundingBoxGuideId);
	}

	// Overwrite the box geometry (e.g. a rigidly-rotated box during rotation)
	public setGeometry(coordinates: Polygon["coordinates"]) {
		if (!this.boundingBoxGuideId) return;
		this.mutateFeature.updatePolygon({
			featureId: this.boundingBoxGuideId,
			coordinateMutations: {
				coordinates,
				type: Mutations.Replace,
			},
			context: { updateType: UpdateTypes.Provisional },
		});
	}

	// The four corners from the ring: SW, SE, NE, NW (live, so reflects rotation)
	public getCorners(): [Position, Position, Position, Position] | undefined {
		const geometry = this.getGeometry();
		if (!geometry) return undefined;
		const ring = geometry.coordinates[0];
		return [ring[0], ring[1], ring[2], ring[3]];
	}

	/** Midpoint of the two top corners (NW, NE) — the rotate handle anchor. */
	public getTopCenter(): Position | undefined {
		const corners = this.getCorners();
		if (!corners) return undefined;
		const [, , ne, nw] = corners;
		return [(nw[0] + ne[0]) / 2, (nw[1] + ne[1]) / 2];
	}

	/** The axis-aligned bbox of the given feature coordinates. */
	public getBBox(coordinates: Position[] | Position[][]): BBox {
		return bboxFromCoordinates(coordinates);
	}

	public destroy() {
		this.mutateFeature.deleteFeatureIfPresent(this.boundingBoxGuideId);
		this.boundingBoxGuideId = undefined;
	}

	public hasBoundingBox(): boolean {
		return this.boundingBoxGuideId !== undefined;
	}
}
