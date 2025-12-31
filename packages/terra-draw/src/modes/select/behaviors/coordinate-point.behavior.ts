import { Point, Position } from "geojson";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { FeatureId } from "../../../store/store";
import { COMMON_PROPERTIES, UpdateTypes } from "../../../common";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { getUnclosedCoordinates } from "../../../geometry/get-coordinates";

export class CoordinatePointBehavior extends TerraDrawModeBehavior {
	constructor(
		config: BehaviorConfig,
		private readonly readFeature: ReadFeatureBehavior,
		private readonly mutateFeature: MutateFeatureBehavior,
	) {
		super(config);
	}

	public createOrUpdate({
		featureId,
		featureCoordinates,
	}: {
		featureId: FeatureId;
		featureCoordinates: Position[] | Position[][];
	}) {
		// Handle the edge case where the feature is deleted before create or update
		if (!this.readFeature.hasFeature(featureId)) {
			this.deleteOrphanedPoints(featureId);
			return;
		}

		const coordinates = getUnclosedCoordinates(featureCoordinates);

		const existingProperties = this.readFeature.getProperties(featureId);

		const existingCoordinatePointIds =
			existingProperties.coordinatePointIds as FeatureId[];

		// If no existing coordinate points, create them
		if (!existingCoordinatePointIds) {
			const coordinatePointIds = this.createPoints(
				coordinates,
				existingProperties.mode as string,
				featureId,
			);
			this.setFeatureCoordinatePoints(featureId, coordinatePointIds);
		}
		// If the existing coordinate points are present in the store, update them
		else if (
			existingCoordinatePointIds &&
			existingCoordinatePointIds.every((id) => this.readFeature.hasFeature(id))
		) {
			// Check if the coordinates have changed
			const existingCoordinates =
				existingProperties.coordinatePointIds as FeatureId[];
			const existingCoordinatePoints = existingCoordinates.map(
				(id) => this.readFeature.getGeometry(id).coordinates as Position,
			);

			// If the number of coordinates has changed, delete and recreate as it's too
			// complex to update the existing coordinates unless someone is feeling brave
			if (existingCoordinates.length !== coordinates.length) {
				this.deleteCoordinatePoints(existingCoordinates);
				const coordinatePointIds = this.createPoints(
					coordinates,
					existingProperties.mode as string,
					featureId,
				);
				this.setFeatureCoordinatePoints(featureId, coordinatePointIds);
			} else {
				const updates: {
					featureId: FeatureId;
					coordinate: Position;
				}[] = [];
				// Update the coordinates
				coordinates.forEach((coordinate, i) => {
					// If the coordinates are the same, don't update
					if (
						coordinate[0] === existingCoordinatePoints[i][0] &&
						coordinate[1] === existingCoordinatePoints[i][1]
					) {
						return;
					}

					updates.push({
						featureId: existingCoordinates[i],
						coordinate: coordinate,
					});
				});

				this.mutateFeature.updateGuidancePoints(updates);
			}
		}
		// If the existing coordinate points are not present in the store, delete them and recreate
		else {
			// If there are any leftover coordinate points we remove them
			const existingPoints = existingCoordinatePointIds.filter((id) =>
				this.readFeature.hasFeature(id),
			);
			if (existingPoints.length) {
				this.deleteCoordinatePoints(existingPoints);
			}

			// Create new coordinate points
			const coordinatePointIds = this.createPoints(
				coordinates,
				existingProperties.mode as string,
				featureId,
			);
			this.setFeatureCoordinatePoints(featureId, coordinatePointIds);
		}
	}

	public deletePointsByFeatureIds(features: FeatureId[]) {
		for (const featureId of features) {
			this.deleteIfPresent(featureId);
		}
	}

	public updateOneAtIndex(
		featureId: FeatureId,
		index: number,
		updatedCoordinate: Position,
	) {
		const featureProperties = this.readFeature.getProperties(featureId);
		const coordinatePointIds =
			featureProperties.coordinatePointIds as FeatureId[];

		if (
			!coordinatePointIds ||
			coordinatePointIds.length === 0 ||
			coordinatePointIds[index] === undefined
		) {
			return;
		}

		this.mutateFeature.updateGuidancePoints([
			{
				featureId: coordinatePointIds[index],
				coordinate: updatedCoordinate,
			},
		]);
	}

	public updateAllInPlace({
		featureId,
		featureCoordinates,
	}: {
		featureId: FeatureId;
		featureCoordinates: Position[] | Position[][];
	}) {
		const featureProperties = this.readFeature.getProperties(featureId);

		if (!featureProperties.coordinatePointIds) {
			return;
		}

		const coordinates = getUnclosedCoordinates(featureCoordinates);
		const coordinatePointIds =
			featureProperties.coordinatePointIds as FeatureId[];

		if (coordinates.length !== coordinatePointIds.length) {
			return;
		}

		this.mutateFeature.updateGuidancePoints(
			(featureProperties.coordinatePointIds as FeatureId[]).map((id, i) => ({
				featureId: id,
				coordinate: coordinates[i],
			})),
		);
	}

	private createPoints(
		featureCoordinates: Position[],
		mode: string,
		featureId: FeatureId,
	) {
		return this.mutateFeature.createGuidancePoints({
			coordinates: featureCoordinates,
			type: COMMON_PROPERTIES.COORDINATE_POINT,
			additionalProperties: (i) => ({
				mode,
				[COMMON_PROPERTIES.COORDINATE_POINT]: true,
				[COMMON_PROPERTIES.COORDINATE_POINT_FEATURE_ID]: featureId,
				index: i,
			}),
		});
	}

	private setFeatureCoordinatePoints(
		featureId: FeatureId,
		value: FeatureId[] | null,
		updateType:
			| UpdateTypes.Provisional
			| UpdateTypes.Commit = UpdateTypes.Commit,
	) {
		const type = this.readFeature.getGeometryType(featureId);

		const update = {
			featureId,
			propertyMutations: {
				[COMMON_PROPERTIES.COORDINATE_POINT_IDS]: value,
			},
			context: {
				updateType,
			},
		};

		if (type === "Polygon") {
			this.mutateFeature.updatePolygon(update);
		} else if (type === "LineString") {
			this.mutateFeature.updateLineString(update);
		} else {
			throw new Error("Unsupported geometry type for coordinate points");
		}
	}

	private deleteCoordinatePoints(coordinatePointIds: FeatureId[]) {
		// We have to account for someone manually deleting the coordinate points or only partially restoring them
		// from some persistent storage. Essentially we cannot assume they are all present in the store.

		this.mutateFeature.deleteFeaturesIfPresent(coordinatePointIds);
	}

	private deleteIfPresent(featureId: FeatureId) {
		const existingFeatureProps = this.readFeature.getProperties(featureId);
		const coordinatePoints =
			existingFeatureProps.coordinatePointIds as FeatureId[];

		if (coordinatePoints) {
			this.deleteCoordinatePoints(coordinatePoints);
			this.setFeatureCoordinatePoints(featureId, null);
		}
	}

	private deleteOrphanedPoints(featureId: FeatureId) {
		const orphanedCoordinatePointIds = this.readFeature.getAllFeatureIdsWhere(
			(properties) =>
				properties[COMMON_PROPERTIES.COORDINATE_POINT_FEATURE_ID] === featureId,
		);

		this.mutateFeature.deleteFeaturesIfPresent(orphanedCoordinatePointIds);
	}
}
