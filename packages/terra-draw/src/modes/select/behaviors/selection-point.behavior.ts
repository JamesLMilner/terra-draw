import { Position } from "geojson";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { FeatureId } from "../../../store/store";
import { SELECT_PROPERTIES } from "../../../common";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { getUnclosedCoordinates } from "../../../geometry/get-coordinates";
import { ReadFeatureBehavior } from "../../read-feature.behavior";

export type SelectionPointProperties = {
	mode: string;
	index: number;
	[SELECT_PROPERTIES.SELECTION_POINT_FEATURE_ID]: string;
	[SELECT_PROPERTIES.SELECTION_POINT]: true;
};

export class SelectionPointBehavior extends TerraDrawModeBehavior {
	constructor(
		config: BehaviorConfig,
		mutateFeatureBehavior: MutateFeatureBehavior,
	) {
		super(config);
		this.mutateFeature = mutateFeatureBehavior;
	}

	private mutateFeature: MutateFeatureBehavior;

	private _selectionPoints: FeatureId[] = [];

	get ids() {
		return this._selectionPoints.concat();
	}

	set ids(_: FeatureId[]) {}

	public create({
		featureId,
		featureCoordinates,
	}: {
		featureId: FeatureId;
		featureCoordinates: Position[] | Position[][];
	}) {
		const coordinates = getUnclosedCoordinates(featureCoordinates);

		this._selectionPoints = this.mutateFeature.createGuidancePoints({
			coordinates,
			type: SELECT_PROPERTIES.SELECTION_POINT,
			additionalProperties: (index) => ({
				[SELECT_PROPERTIES.SELECTION_POINT_FEATURE_ID]: featureId,
				index,
			}),
		});
	}

	public delete() {
		if (!this.ids.length) {
			return;
		}

		this.mutateFeature.deleteFeaturesIfPresent(this.ids);
		this._selectionPoints = [];
	}

	public updateAllInPlace({
		featureCoordinates,
	}: {
		featureCoordinates: Position[] | Position[][];
	}) {
		if (this._selectionPoints.length === 0) {
			return;
		}

		const coordinates = getUnclosedCoordinates(featureCoordinates);

		if (coordinates.length !== this._selectionPoints.length) {
			return;
		}

		this.mutateFeature.updateGuidancePoints(
			this._selectionPoints.map((id, i) => ({
				featureId: id,
				coordinate: coordinates[i],
			})),
		);
	}

	public updateOneAtIndex(index: number, updatedCoordinate: Position) {
		if (this._selectionPoints[index] === undefined) {
			return;
		}

		this.mutateFeature.updateGuidancePoints([
			{
				featureId: this._selectionPoints[index],
				coordinate: updatedCoordinate,
			},
		]);
	}
}
