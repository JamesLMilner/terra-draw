import { LineString, Polygon, Position } from "geojson";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { getMidPointCoordinates } from "../../../geometry/get-midpoints";
import { SelectionPointBehavior } from "./selection-point.behavior";
import {
	COMMON_PROPERTIES,
	Projection,
	SELECT_PROPERTIES,
	UpdateTypes,
} from "../../../common";
import { FeatureId, GeoJSONStoreFeatures } from "../../../store/store";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import {
	MutateFeatureBehavior,
	Mutations,
} from "../../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import {
	getClosedCoordinates,
	getUnclosedCoordinates,
} from "../../../geometry/get-coordinates";

export class MidPointBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly selectionPointBehavior: SelectionPointBehavior,
		private readonly coordinatePointBehavior: CoordinatePointBehavior,
		private readonly mutateFeature: MutateFeatureBehavior,
		private readonly readFeature: ReadFeatureBehavior,
	) {
		super(config);
	}

	private _midPoints: FeatureId[] = [];

	private getMidpointConfig(coordinates: Position[]) {
		return {
			featureCoords: coordinates,
			precision: this.coordinatePrecision,
			project: this.config.project,
			unproject: this.config.unproject,
			projection: this.config.projection as Projection,
		};
	}

	get ids() {
		return this._midPoints.concat();
	}

	set ids(_: FeatureId[]) {}

	public insert({
		featureId,
		midPointId,
	}: {
		featureId: FeatureId;
		midPointId: FeatureId;
	}) {
		const midPoint = this.readFeature.getGeometry(midPointId);
		const { midPointFeatureId, midPointSegment } =
			this.readFeature.getProperties(midPointId);
		const geometry = this.readFeature.getGeometry<Polygon | LineString>(
			midPointFeatureId as FeatureId,
		);

		const update = {
			featureId: midPointFeatureId as FeatureId,
			coordinateMutations: [
				{
					type: Mutations.InsertAfter,
					index: midPointSegment as number,
					coordinate: midPoint.coordinates as Position,
				},
			],
			context: {
				updateType: UpdateTypes.Commit as const,
			},
		};

		let updated: GeoJSONStoreFeatures<Polygon | LineString> | null = null;

		if (geometry.type === "Polygon") {
			updated = this.mutateFeature.updatePolygon(update);
		} else if (geometry.type === "LineString") {
			updated = this.mutateFeature.updateLineString(update);
		} else {
			throw new Error("Midpoints can only be added to polygons or linestrings");
		}

		if (!updated) {
			throw new Error("Failed to insert midpoint coordinate");
		}

		const featureCoordinates = updated.geometry.coordinates;

		// We need to update the coordinate points to reflect the new midpoint
		const featureProperties = this.readFeature.getProperties(featureId);

		if (featureProperties[COMMON_PROPERTIES.COORDINATE_POINT_IDS]) {
			this.coordinatePointBehavior.createOrUpdate({
				featureId,
				featureCoordinates,
			});
		}

		// TODO: is there a way of just updating the selection points rather
		// than fully deleting / recreating?
		// Recreate the selection points
		this.mutateFeature.deleteFeaturesIfPresent([
			...this.selectionPointBehavior.ids,
			...this._midPoints,
		]);

		// We don't need to check if flags are correct
		// because selection points are prerequisite for midpoints
		this.create({
			featureCoordinates,
			featureId: midPointFeatureId as FeatureId,
		});

		this.selectionPointBehavior.create({
			featureCoordinates,
			featureId: featureId,
		});
	}

	public create({
		featureCoordinates,
		featureId,
	}: {
		featureCoordinates: Position[] | Position[][];
		featureId: FeatureId;
	}) {
		if (!this.readFeature.hasFeature(featureId)) {
			throw new Error("Store does not have feature with this id");
		}

		const coordinates = getClosedCoordinates(featureCoordinates);
		const midpoints = getMidPointCoordinates(
			this.getMidpointConfig(coordinates),
		);

		this._midPoints = this.mutateFeature.createGuidancePoints({
			additionalProperties: (i) => ({
				mode: this.mode,
				midPointSegment: i,
				midPointFeatureId: featureId,
				[SELECT_PROPERTIES.MID_POINT]: true,
			}),
			coordinates: midpoints,
			type: SELECT_PROPERTIES.MID_POINT,
		});
	}

	public delete() {
		if (!this._midPoints.length) {
			return;
		}

		this.mutateFeature.deleteFeaturesIfPresent(this._midPoints);
		this._midPoints = [];
	}

	public updateAllInPlace({
		featureCoordinates,
	}: {
		featureCoordinates: Position[] | Position[][];
	}) {
		if (this._midPoints.length === 0) {
			return undefined;
		}

		const coordinates = getClosedCoordinates(featureCoordinates);
		const midpoints = getMidPointCoordinates(
			this.getMidpointConfig(coordinates),
		);

		this.mutateFeature.updateGuidancePoints(
			this._midPoints.map((id, i) => ({
				featureId: id,
				coordinate: midpoints[i],
			})),
		);
	}

	public updateOneAtIndex(
		index: number,
		featureCoordinates: Position[] | Position[][],
	) {
		if (this._midPoints[index] === undefined) {
			return undefined;
		}
		const coordinates = getClosedCoordinates(featureCoordinates);
		const midpoints = getMidPointCoordinates(
			this.getMidpointConfig(coordinates),
		);

		this.mutateFeature.updateGuidancePoints([
			{
				featureId: this._midPoints[index],
				coordinate: midpoints[index],
			},
		]);
	}
}
