import { Point, Position } from "geojson";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { FeatureId } from "../../../store/store";
import { COMMON_PROPERTIES } from "../../../common";

export class CoordinatePointBehavior extends TerraDrawModeBehavior {
	constructor(config: BehaviorConfig) {
		super(config);
	}

	public createOrUpdate(featureId: FeatureId) {
		const existingFeature = this.store.getGeometryCopy(featureId);
		const existingProperties = this.store.getPropertiesCopy(featureId);

		let coordinates: Position[];

		if (existingFeature.type === "Polygon") {
			coordinates = existingFeature.coordinates[0].slice(0, -1) as Position[];
		} else if (existingFeature.type === "LineString") {
			coordinates = existingFeature.coordinates as Position[];
		} else {
			return;
		}

		const existingFeatureProps = this.store.getPropertiesCopy(featureId);

		const existingCoordinatePointIds =
			existingFeatureProps.coordinatePointIds as FeatureId[];

		// If no existing coordinate points, create them
		if (!existingCoordinatePointIds) {
			const coordinatePointIds = this.createPoints(
				coordinates,
				existingProperties.mode as string,
			);
			this.setFeatureCoordinatePoints(featureId, coordinatePointIds);
		}
		// If the existing coordinate points are present in the store, update them
		else if (
			existingCoordinatePointIds &&
			existingCoordinatePointIds.every((id) => this.store.has(id))
		) {
			// Check if the coordinates have changed
			const existingCoordinates =
				existingFeatureProps.coordinatePointIds as FeatureId[];
			const existingCoordinatePoints = existingCoordinates.map(
				(id) => this.store.getGeometryCopy(id).coordinates as Position,
			);

			// If the number of coordinates has changed, delete and recreate as it's too
			// complex to update the existing coordinates unless someone is feeling brave
			if (existingCoordinates.length !== coordinates.length) {
				this.deleteCoordinatePoints(existingCoordinates);
				const coordinatePointIds = this.createPoints(
					coordinates,
					existingProperties.mode as string,
				);
				this.setFeatureCoordinatePoints(featureId, coordinatePointIds);
			} else {
				// Update the coordinates
				coordinates.forEach((coordinate, i) => {
					// If the coordinates are the same, don't update
					if (
						coordinate[0] === existingCoordinatePoints[i][0] &&
						coordinate[1] === existingCoordinatePoints[i][1]
					) {
						return;
					}
					// Only update the coordinates that have changed
					this.store.updateGeometry([
						{
							id: existingCoordinates[i],
							geometry: {
								type: "Point",
								coordinates: coordinate,
							} as Point,
						},
					]);
				});
			}
		}
		// If the existing coordinate points are not present in the store, delete them and recreate
		else {
			// If there are any leftover coordinate points we remove them
			const existingPoints = existingCoordinatePointIds.filter((id) =>
				this.store.has(id),
			);
			if (existingPoints.length) {
				this.deleteCoordinatePoints(existingPoints);
			}

			// Create new coordinate points
			const coordinatePointIds = this.createPoints(
				coordinates,
				existingProperties.mode as string,
			);
			this.setFeatureCoordinatePoints(featureId, coordinatePointIds);
		}
	}

	public deletePointsByFeatureIds(features: FeatureId[]) {
		for (const featureId of features) {
			this.deleteIfPresent(featureId);
		}
	}

	public getUpdated(featureId: FeatureId, updatedCoordinates: Position[]) {
		const featureProperties = this.store.getPropertiesCopy(featureId);

		if (!featureProperties.coordinatePointIds) {
			return undefined;
		}

		return (featureProperties.coordinatePointIds as FeatureId[]).map(
			(id, i) => {
				return {
					id,
					geometry: {
						...this.store.getGeometryCopy(id),
						coordinates: updatedCoordinates[i],
					} as Point,
				};
			},
		) as {
			id: FeatureId;
			geometry: Point;
		}[];
	}

	private createPoints(coordinates: Position[], mode: string) {
		return this.store.create(
			coordinates.map((coordinate) => ({
				geometry: {
					type: "Point",
					coordinates: coordinate,
				},
				properties: {
					mode,
					[COMMON_PROPERTIES.COORDINATE_POINT]: true,
				},
			})),
		);
	}

	private setFeatureCoordinatePoints(
		featureId: FeatureId,
		value: FeatureId[] | null,
	) {
		this.store.updateProperty([
			{
				id: featureId,
				property: COMMON_PROPERTIES.COORDINATE_POINT_IDS,
				value: value,
			},
		]);
	}

	private deleteCoordinatePoints(coordinatePointIds: FeatureId[]) {
		// We have to account for someone manually deleting the coordinate points or only partially restoring them
		// from some persistent storage. Essentially we cannot assume they are all present in the store.
		const existingCoordinatePointIds = coordinatePointIds.filter((id) =>
			this.store.has(id),
		) as FeatureId[];
		this.store.delete(existingCoordinatePointIds);
	}

	private deleteIfPresent(featureId: FeatureId) {
		const existingFeatureProps = this.store.getPropertiesCopy(featureId);
		const coordinatePoints =
			existingFeatureProps.coordinatePointIds as FeatureId[];

		if (coordinatePoints) {
			this.deleteCoordinatePoints(coordinatePoints);
			this.setFeatureCoordinatePoints(featureId, null);
		}
	}
}
