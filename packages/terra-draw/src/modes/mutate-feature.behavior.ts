import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { FeatureId } from "../extend";
import {
	GeoJSONStoreFeatures,
	GeoJSONStoreGeometries,
	JSONObject,
	JSON,
} from "../store/store";
import { Polygon, Position, LineString, Point } from "geojson";
import {
	Actions,
	GuidancePointProperties,
	UpdateTypes,
	Validation,
} from "../common";
import { ensureRightHandRule } from "../geometry/ensure-right-hand-rule";

type MutateFeatureBehaviorOptions = {
	validate: Validation | undefined;
	onUpdate?: (feature: GeoJSONStoreFeatures) => void;
	onFinish: (featureId: FeatureId, context: FinishContext) => void;
};

export const Mutations = {
	InsertBefore: "insert-before",
	InsertAfter: "insert-after",
	Update: "update",
	Delete: "delete",
	Replace: "replace",
} as const;

// Coordinate mutations assume that the index is relative to the original array
// of coordinates before any mutations are applied.
type InsertBeforeMutation = {
	type: typeof Mutations.InsertBefore;
	index: number;
	coordinate: Position;
};

type InsertAfterMutation = {
	type: typeof Mutations.InsertAfter;
	index: number;
	coordinate: Position;
};

type UpdateMutation = {
	type: typeof Mutations.Update;
	index: number;
	coordinate: Position;
};
type DeleteMutation = { type: typeof Mutations.Delete; index: number };

export type ReplaceMutation<ReplacedGeometry extends GeoJSONStoreGeometries> = {
	type: typeof Mutations.Replace;
	coordinates: ReplacedGeometry["coordinates"];
};

export type CoordinateMutation =
	| InsertBeforeMutation
	| InsertAfterMutation
	| UpdateMutation
	| DeleteMutation;

type ValidProperties = Record<string, JSON | undefined>;

type FinishContext = { updateType: UpdateTypes.Finish; action: Actions };

type MutateContext =
	| FinishContext
	| { updateType: UpdateTypes.Commit | UpdateTypes.Provisional };

export class MutateFeatureBehavior extends TerraDrawModeBehavior {
	constructor(config: BehaviorConfig, options: MutateFeatureBehaviorOptions) {
		super(config);
		this.options = options;
	}

	private options: MutateFeatureBehaviorOptions;

	public createPoint({
		coordinates,
		properties,
		context,
	}: {
		coordinates: Position;
		properties?: JSONObject;
		context?: {
			updateType: UpdateTypes.Finish;
		};
	}) {
		// Create point is slightly different in that creating can also be the finish action
		// because there is only one step to creating a point.
		if (context?.updateType === UpdateTypes.Finish) {
			const valid = this.validateGeometryWithUpdateType({
				geometry: { type: "Point", coordinates },
				properties,
				updateType: UpdateTypes.Finish,
			});

			if (!valid) {
				return;
			}
		}

		return this.createFeatureWithGeometry<Point>({
			geometry: { type: "Point", coordinates },
			properties,
			context,
		});
	}

	public deleteFeature(featureId: FeatureId) {
		this.store.delete([featureId]);
	}

	public updatePoint({
		featureId,
		coordinateMutations,
		propertyMutations,
		context,
	}: {
		featureId: FeatureId;
		coordinateMutations?: ReplaceMutation<Point>;
		propertyMutations?: JSONObject;
		context: MutateContext;
	}) {
		return this.updateGeometry<Point>({
			type: "Point",
			featureId,
			coordinateMutations,
			context,
			propertyMutations,
		});
	}

	public createPolygon({
		coordinates,
		properties,
	}: {
		coordinates: Polygon["coordinates"][0];
		properties?: JSONObject;
	}) {
		const corrected = ensureRightHandRule({
			type: "Polygon",
			coordinates: [coordinates],
		});
		return this.createFeatureWithGeometry<Polygon>({
			geometry: {
				type: "Polygon",
				coordinates: corrected ? corrected.coordinates : [coordinates],
			},
			properties,
		});
	}

	public updatePolygon({
		featureId,
		coordinateMutations,
		context,
		propertyMutations,
	}: {
		featureId: FeatureId;
		context: MutateContext;
		coordinateMutations?: CoordinateMutation[] | ReplaceMutation<Polygon>;
		propertyMutations?: ValidProperties;
	}) {
		return this.updateGeometry<Polygon>({
			type: "Polygon",
			featureId,
			coordinateMutations,
			propertyMutations,
			context:
				context.updateType === UpdateTypes.Finish
					? {
							...context,
							correctRightHandRule: true,
						}
					: {
							...context,
						},
		});
	}

	public epsilonOffset() {
		// We must add a very small epsilon value so that Mapbox GL
		// renders the polygon - There might be a cleaner solution?
		const epsilon = 1 / Math.pow(10, this.coordinatePrecision - 1);
		const offset = Math.max(0.000001, epsilon);
		return offset;
	}

	public createLineString({
		coordinates,
		properties,
	}: {
		coordinates: LineString["coordinates"];
		properties?: JSONObject;
	}) {
		return this.createFeatureWithGeometry<LineString>({
			geometry: { type: "LineString", coordinates },
			properties,
		});
	}

	public updateLineString({
		featureId,
		coordinateMutations,
		context,
		propertyMutations,
	}: {
		featureId: FeatureId;
		coordinateMutations?: CoordinateMutation[] | ReplaceMutation<LineString>;
		propertyMutations?: ValidProperties;
		context: MutateContext;
	}) {
		return this.updateGeometry<LineString>({
			type: "LineString",
			featureId,
			coordinateMutations,
			propertyMutations,
			context,
		});
	}

	public createGuidancePoint(
		coordinate: Position,
		type: GuidancePointProperties,
	) {
		const [id] = this.store.create([
			{
				geometry: { type: "Point", coordinates: coordinate },
				properties: {
					mode: this.mode,
					[type]: true,
				},
			},
		]);
		return id;
	}

	private updateGeometry<G extends GeoJSONStoreGeometries>({
		type,
		featureId,
		coordinateMutations,
		propertyMutations,
		context,
	}: {
		type: G["type"];
		featureId: FeatureId;
		coordinateMutations?: CoordinateMutation[] | ReplaceMutation<G>;
		propertyMutations?: ValidProperties;
		context: MutateContext & { correctRightHandRule?: boolean };
	}) {
		if (!featureId) {
			return null;
		}

		const existingGeometry = this.store.getGeometryCopy(featureId);
		const existingProperties = this.store.getPropertiesCopy(featureId);

		if (existingGeometry.type !== type) {
			throw new Error(
				`${type} geometries cannot be updated on features with ${existingGeometry.type} geometries`,
			);
		}

		if (coordinateMutations) {
			let updatedGeometry = this.applyCoordinateMutations(
				existingGeometry,
				coordinateMutations,
			);

			// For polygons, we may need to enforce the right-hand rule
			if (context.correctRightHandRule && updatedGeometry.type === "Polygon") {
				const correctedGeometry = ensureRightHandRule(updatedGeometry);
				if (correctedGeometry) {
					updatedGeometry = correctedGeometry;
				}
			}

			if (
				!this.validateGeometryWithUpdateType({
					geometry: updatedGeometry,
					properties: existingProperties,
					updateType: context.updateType,
				})
			) {
				return null;
			}

			this.store.updateGeometry([{ id: featureId, geometry: updatedGeometry }]);
		} else if (context.updateType === UpdateTypes.Finish) {
			// Even if no coordinate mutations, we may need to validate on finish
			const existingGeometry = this.store.getGeometryCopy(featureId);
			if (
				!this.validateGeometryWithUpdateType({
					geometry: existingGeometry,
					properties: existingProperties,
					updateType: context.updateType,
				})
			) {
				return null;
			}
		}

		if (propertyMutations) {
			this.applyPropertyMutations(featureId, propertyMutations);
		}

		const updated = this.buildFeatureWithGeometry<G>(featureId);

		this.options.onUpdate && this.options.onUpdate(updated);

		if (context.updateType === UpdateTypes.Finish) {
			this.options.onFinish(featureId, context as FinishContext);
		}

		return updated as GeoJSONStoreFeatures<G>;
	}

	private applyCoordinateMutations<
		UpdatedGeometry extends LineString | Polygon | Point,
	>(
		updatedGeometry: UpdatedGeometry,
		coordinatesMutations:
			| CoordinateMutation[]
			| ReplaceMutation<UpdatedGeometry>,
	): UpdatedGeometry {
		if (this.isReplaceMutation(coordinatesMutations)) {
			return {
				...updatedGeometry,
				coordinates: coordinatesMutations.coordinates,
			};
		}

		if (updatedGeometry.type === "Point") {
			throw new Error(
				"Coordinate mutations are not supported for Point geometries",
			);
		}

		// Determine the original coordinates array and how to write back
		const isPolygon = updatedGeometry.type === "Polygon";
		const originalCoordinates: Position[] = isPolygon
			? // work on a shallow copy of the exterior ring
				(updatedGeometry as Polygon).coordinates[0].slice()
			: (updatedGeometry as LineString).coordinates.slice();

		const originalLength = originalCoordinates.length;

		// Normalize indices relative to the original array length
		const normalizeIndex = (index: number): number => {
			const normalized = index < 0 ? originalLength + index : index;

			if (normalized < 0 || normalized >= originalLength) {
				throw new RangeError(
					`Index ${index} (normalized to ${normalized}) is out of bounds`,
				);
			}

			return normalized;
		};

		// For each original index i (0..originalLength-1), store
		// the last non-insert mutation (update/delete) that targets i
		const nonInsertByIndex: (CoordinateMutation | undefined)[] = new Array(
			originalLength,
		).fill(undefined);

		// For inserts, we track before/after arrays per index, plus a tailAfter array
		const insertsBeforeByIndex: CoordinateMutation[][] = Array.from(
			{ length: originalLength },
			() => [],
		);
		const insertsAfterByIndex: CoordinateMutation[][] = Array.from(
			{ length: originalLength },
			() => [],
		);
		const tailAfter: CoordinateMutation[] = [];

		// 1) Scan mutations in the order provided
		for (const mutation of coordinatesMutations as CoordinateMutation[]) {
			if (
				mutation.type === Mutations.InsertBefore ||
				mutation.type === Mutations.InsertAfter
			) {
				// Normalize but allow index === originalLength for INSERT_AFTER as tail append
				const rawIndex = mutation.index;
				const normalized = rawIndex < 0 ? originalLength + rawIndex : rawIndex;

				if (normalized < 0 || normalized > originalLength) {
					throw new RangeError(
						`Index ${mutation.index} (normalized to ${normalized}) is out of bounds`,
					);
				}

				if (mutation.type === Mutations.InsertBefore) {
					if (normalized >= originalLength) {
						throw new RangeError(
							`INSERT_BEFORE index ${mutation.index} (normalized to ${normalized}) is out of bounds for length ${originalLength}`,
						);
					}
					insertsBeforeByIndex[normalized].push(mutation);
				} else {
					// INSERT_AFTER
					if (normalized === originalLength) {
						// tail append
						tailAfter.push(mutation);
					} else {
						insertsAfterByIndex[normalized].push(mutation);
					}
				}

				continue;
			}

			// Non-insert: UPDATE/DELETE
			const normalizedIndex = normalizeIndex(mutation.index);

			// For update/delete, the *last* one wins at each original index
			nonInsertByIndex[normalizedIndex] = {
				...mutation,
				index: normalizedIndex,
			};
		}

		// 2) Build the new coordinates array from scratch
		const newCoordinates: Position[] = [];

		for (let i = 0; i < originalLength; i++) {
			// Inserts that go before the element originally at i
			const beforeInserts = insertsBeforeByIndex[i];
			for (const insertMutation of beforeInserts) {
				newCoordinates.push(
					(insertMutation as InsertBeforeMutation).coordinate,
				);
			}

			const mutation = nonInsertByIndex[i];

			if (!mutation) {
				// No update/delete targeting this index: keep the original coordinate
				newCoordinates.push(originalCoordinates[i]);
			} else if (mutation.type === Mutations.Delete) {
				// Skip this original coordinate
			} else {
				// Must be update
				newCoordinates.push((mutation as UpdateMutation).coordinate);
			}

			// Inserts that go after the element originally at i
			const afterInserts = insertsAfterByIndex[i];
			for (const insertMutation of afterInserts) {
				newCoordinates.push((insertMutation as InsertAfterMutation).coordinate);
			}
		}

		// 3) Tail inserts (INSERT_AFTER with index === originalLength)
		for (const insertMutation of tailAfter) {
			newCoordinates.push((insertMutation as InsertAfterMutation).coordinate);
		}

		// 4) Return a new geometry object with the updated coordinates
		if (isPolygon) {
			const polygon = updatedGeometry as Polygon;
			return {
				...polygon,
				coordinates: [newCoordinates, ...polygon.coordinates.slice(1)],
			} as typeof updatedGeometry;
		}

		// Is LineString
		return {
			...updatedGeometry,
			coordinates: newCoordinates,
		} as typeof updatedGeometry;
	}

	private isReplaceMutation<G extends GeoJSONStoreGeometries>(
		mutation: CoordinateMutation[] | ReplaceMutation<G>,
	): mutation is ReplaceMutation<G> {
		return (mutation as ReplaceMutation<G>).type === Mutations.Replace;
	}

	// Shared helpers for LineString / Polygon logic
	private createFeatureWithGeometry<G extends GeoJSONStoreGeometries>({
		geometry,
		properties,
		context,
	}: {
		geometry: G;
		properties?: JSONObject;
		context?: {
			updateType: UpdateTypes.Finish;
		};
	}) {
		const [id] = this.store.create([
			{ geometry, properties: properties ? properties : {} },
		]);

		const created = {
			id,
			type: "Feature",
			properties: this.store.getPropertiesCopy(id),
			geometry: this.store.getGeometryCopy<G>(id),
		} as GeoJSONStoreFeatures<G>;

		if (context?.updateType === UpdateTypes.Finish) {
			this.options.onFinish(id, {
				updateType: context.updateType,
				action: "draw",
			});
		} else {
			this.options.onUpdate &&
				this.options.onUpdate(created as GeoJSONStoreFeatures);
		}

		return created;
	}

	private validateGeometryWithUpdateType({
		geometry,
		properties,
		updateType,
	}: {
		geometry: GeoJSONStoreGeometries;
		properties?: ValidProperties;
		updateType: UpdateTypes;
	}): boolean {
		if (!this.options.validate) {
			return true;
		}

		const validationResult = this.options.validate(
			{
				type: "Feature",
				geometry,
				properties: properties ? properties : {},
			} as GeoJSONStoreFeatures,
			{
				project: this.project,
				unproject: this.unproject,
				coordinatePrecision: this.coordinatePrecision,
				updateType,
			},
		);

		return validationResult.valid;
	}

	private applyPropertyMutations(
		featureId: FeatureId,
		propertyMutations: ValidProperties,
	) {
		const properties = Object.keys(propertyMutations);
		this.store.updateProperty(
			properties.map((key: string) => ({
				id: featureId,
				property: key,
				value: propertyMutations[key] as JSON | undefined,
			})),
		);
	}

	private buildFeatureWithGeometry<G extends GeoJSONStoreGeometries>(
		featureId: FeatureId,
	) {
		return {
			id: featureId,
			type: "Feature",
			properties: this.store.getPropertiesCopy(featureId),
			geometry: this.store.getGeometryCopy<G>(featureId),
		} as GeoJSONStoreFeatures<G>;
	}
}
