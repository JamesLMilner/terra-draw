import { Position } from "geojson";
import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { COMMON_PROPERTIES, TerraDrawMouseEvent } from "../common";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";
import { MutateFeatureBehavior } from "./mutate-feature.behavior";
import { FeatureId } from "../extend";
import { ReadFeatureBehavior } from "./read-feature.behavior";
import {
	getClosedCoordinates,
	isPolygonArray,
} from "../geometry/get-coordinates";

export class ClosingPointsBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
		private readonly mutateFeatureBehavior: MutateFeatureBehavior,
		private readonly readFeatureBehavior: ReadFeatureBehavior,
	) {
		super(config);
	}

	private _startEndPoints: FeatureId[] = [];

	get ids() {
		return this._startEndPoints.concat();
	}

	set ids(_: FeatureId[]) {}

	public create(selectedCoords: Position[] | Position[][]) {
		if (this.ids.length) {
			throw new Error("Opening and closing points already created");
		}

		const isPolygon = isPolygonArray(selectedCoords);
		const coordinates = getClosedCoordinates(selectedCoords);

		if (isPolygon) {
			if (coordinates.length <= 3) {
				throw new Error("Requires at least 4 coordinates");
			}

			this._startEndPoints = this.mutateFeatureBehavior.createGuidancePoints({
				coordinates: [coordinates[0], coordinates[coordinates.length - 2]],
				type: COMMON_PROPERTIES.CLOSING_POINT,
			});
		} else {
			this._startEndPoints = [
				this.mutateFeatureBehavior.createGuidancePoint({
					coordinate: coordinates[coordinates.length - 2] as Position,
					type: COMMON_PROPERTIES.CLOSING_POINT,
				}),
			];
		}
	}

	public delete() {
		if (this.ids.length) {
			const existingIds = this.ids.filter((id) =>
				this.readFeatureBehavior.hasFeature(id),
			);
			if (existingIds.length) {
				this.mutateFeatureBehavior.deleteFeatures(existingIds);
			}
			this._startEndPoints = [];
		}
	}

	public updateOne(index: number, updatedCoordinate: Position) {
		this.mutateFeatureBehavior.updateGuidancePoints([
			{
				featureId: this.ids[index],
				coordinate: updatedCoordinate,
			},
		]);
	}

	public update(updatedCoordinates: Position[] | Position[][]) {
		const coordinates = getClosedCoordinates(updatedCoordinates);

		if (this.ids.length === 1) {
			this.mutateFeatureBehavior.updateGuidancePoints([
				{
					featureId: this.ids[0],
					coordinate: coordinates[coordinates.length - 2],
				},
			]);
			return;
		} else if (this.ids.length === 2) {
			this.mutateFeatureBehavior.updateGuidancePoints([
				{
					featureId: this.ids[0],
					coordinate: coordinates[0],
				},
				{
					featureId: this.ids[1],
					coordinate: coordinates[coordinates.length - 3],
				},
			]);
		}
	}

	public isLineStringClosingPoint(event: TerraDrawMouseEvent) {
		if (this.ids.length !== 1) {
			return { isClosing: false };
		}

		const closing = this.readFeatureBehavior.getGeometry(this.ids[0]);

		const distance = this.pixelDistance.measure(
			event,
			closing.coordinates as Position,
		);

		const isClosing = distance < this.pointerDistance;

		return { isClosing };
	}

	public isPolygonClosingPoints(event: TerraDrawMouseEvent) {
		if (this.ids.length !== 2) {
			return { isClosing: false, isPreviousClosing: false };
		}

		const opening = this.readFeatureBehavior.getGeometry(this.ids[0]);
		const closing = this.readFeatureBehavior.getGeometry(this.ids[1]);

		const distance = this.pixelDistance.measure(
			event,
			opening.coordinates as Position,
		);

		const distancePrevious = this.pixelDistance.measure(
			event,
			closing.coordinates as Position,
		);

		const isClosing = distance < this.pointerDistance;
		const isPreviousClosing = distancePrevious < this.pointerDistance;

		return { isClosing, isPreviousClosing };
	}
}
