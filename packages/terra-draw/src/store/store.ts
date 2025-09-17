import { Feature, Point, Polygon, LineString } from "geojson";
import { uuid4 } from "../util/id";
import { SpatialIndex } from "./spatial-index/spatial-index";
import { isValidTimestamp } from "./store-feature-validation";
import { Validation } from "../common";

export type JSON = string | number | boolean | null | JSONArray | JSONObject;

export interface JSONObject {
	[member: string]: JSON;
}
type JSONArray = Array<JSON>;

type DefinedProperties = Record<string, JSON>;

export type GeoJSONStoreGeometries = Polygon | LineString | Point;

export type BBoxPolygon = Feature<Polygon, DefinedProperties>;

export type GeoJSONStoreFeatures = Feature<
	GeoJSONStoreGeometries,
	DefinedProperties
>;

export type StoreValidation = {
	id?: FeatureId;
} & ReturnType<Validation>;

type StoreChangeEvents = "delete" | "create" | "update" | "styling";

export type StoreChangeHandler<OnChangeContext> = (
	ids: FeatureId[],
	change: StoreChangeEvents,
	context?: OnChangeContext,
) => void;

export type FeatureId = string | number;

export type IdStrategy<Id extends FeatureId> = {
	isValidId: (id: Id) => boolean;
	getId: () => Id;
};

type GeoJSONStoreConfig<Id extends FeatureId> = {
	idStrategy?: IdStrategy<Id>;
	tracked?: boolean;
};

export const defaultIdStrategy = {
	getId: <FeatureId>() => uuid4() as FeatureId,
	isValidId: (id: FeatureId) => typeof id === "string" && id.length === 36,
};

export class GeoJSONStore<
	OnChangeContext extends Record<string, JSON> | undefined,
	Id extends FeatureId = FeatureId,
> {
	constructor(config?: GeoJSONStoreConfig<Id>) {
		this.store = {};
		this.spatialIndex = new SpatialIndex();

		// Setting tracked has to happen first
		// because we use it in featureValidation
		this.tracked = config && config.tracked === false ? false : true;
		this.idStrategy =
			config && config.idStrategy ? config.idStrategy : defaultIdStrategy;
	}

	public idStrategy: IdStrategy<Id>;

	private tracked: boolean;

	private spatialIndex: SpatialIndex;

	private store: {
		[key: FeatureId]: GeoJSONStoreFeatures;
	};

	// Default to no-op
	private _onChange: StoreChangeHandler<OnChangeContext | undefined> = () => {};

	private clone<T>(obj: T): T {
		return JSON.parse(JSON.stringify(obj));
	}

	getId(): FeatureId {
		return this.idStrategy.getId();
	}

	has(id: FeatureId): boolean {
		return Boolean(this.store[id]);
	}

	load(
		data: GeoJSONStoreFeatures[],
		featureValidation?: (
			feature: unknown,
			tracked?: boolean,
		) => StoreValidation,
		afterFeatureAdded?: (feature: GeoJSONStoreFeatures) => void,
		context?: OnChangeContext,
	): StoreValidation[] {
		if (data.length === 0) {
			return [];
		}

		// We don't want to update the original data
		let clonedInputFeatures = this.clone(data);

		const validations: StoreValidation[] = []; // The list of validations that we will return
		const createdFeatures: GeoJSONStoreFeatures[] = []; // Keep track of the features we created

		// We filter out the features that are not valid and do not add them to the store
		clonedInputFeatures = clonedInputFeatures.filter((feature) => {
			if (feature.id === undefined || feature.id === null) {
				feature.id = this.idStrategy.getId();
			}

			const id = feature.id as FeatureId;
			if (featureValidation) {
				const validation = featureValidation(feature);

				// Generic error handling if the featureValidation function
				// does not throw something more specific itself
				if (!validation.valid) {
					validations.push({ id, valid: false, reason: validation.reason });
					return false;
				}
			}

			if (this.tracked) {
				if (!feature.properties.createdAt) {
					feature.properties.createdAt = +new Date();
				} else {
					const valid = isValidTimestamp(feature.properties.createdAt);
					if (!valid) {
						validations.push({
							id: feature.id as FeatureId,
							valid: false,
							reason: "createdAt is not a valid numeric timestamp",
						});
						return false;
					}
				}

				if (!feature.properties.updatedAt) {
					feature.properties.updatedAt = +new Date();
				} else {
					const valid = isValidTimestamp(feature.properties.updatedAt);
					if (!valid) {
						validations.push({
							id: feature.id as FeatureId,
							valid: false,
							reason: "updatedAt is not a valid numeric timestamp",
						});
						return false;
					}
				}
			}

			// We have to be sure that the feature does not already exist with this ID
			if (this.has(id)) {
				validations.push({
					id,
					valid: false,
					reason: `Feature already exists with this id: ${id}`,
				});
				return false;
			}

			this.store[id] = feature;

			createdFeatures.push(feature);

			validations.push({ id, valid: true });

			// Feature is valid so keep it in the list
			return true;
		});

		this.spatialIndex.load(clonedInputFeatures);

		// The list of changes that we will trigger to onChange
		const changes = createdFeatures.map(({ id }) => id as FeatureId);

		// Only trigger onChange with a 'create' change type if we have actually created features
		if (changes.length > 0) {
			this._onChange(changes, "create", context);

			if (afterFeatureAdded) {
				createdFeatures.forEach((feature) => {
					afterFeatureAdded(feature);
				});
			}
		}

		return validations;
	}

	search(
		bbox: BBoxPolygon,
		filter?: (feature: GeoJSONStoreFeatures) => boolean,
	) {
		const features = this.spatialIndex.search(bbox).map((id) => this.store[id]);
		if (filter) {
			return this.clone(features.filter(filter));
		} else {
			return this.clone(features);
		}
	}

	registerOnChange(onChange: StoreChangeHandler<OnChangeContext | undefined>) {
		this._onChange = (ids, change, context) => {
			onChange(ids, change, context);
		};
	}

	getGeometryCopy<T extends GeoJSONStoreGeometries>(id: FeatureId): T {
		const feature = this.store[id];
		if (!feature) {
			throw new Error(
				`No feature with this id (${id}), can not get geometry copy`,
			);
		}
		return this.clone(feature.geometry as T);
	}

	getPropertiesCopy(id: FeatureId) {
		const feature = this.store[id];
		if (!feature) {
			throw new Error(
				`No feature with this id (${id}), can not get properties copy`,
			);
		}
		return this.clone(feature.properties);
	}

	updateProperty(
		propertiesToUpdate: {
			id: FeatureId;
			property: string;
			value: JSON | undefined;
		}[],
		context?: OnChangeContext,
	): void {
		const ids: FeatureId[] = [];
		propertiesToUpdate.forEach(({ id, property, value }) => {
			const feature = this.store[id];

			if (!feature) {
				throw new Error(
					`No feature with this (${id}), can not update geometry`,
				);
			}

			ids.push(id);

			if (value === undefined) {
				delete feature.properties[property];
			} else {
				feature.properties[property] = value;
			}

			// Update the time the feature was updated
			if (this.tracked) {
				feature.properties.updatedAt = +new Date();
			}
		});

		if (this._onChange) {
			this._onChange(ids, "update", context);
		}
	}

	updateGeometry(
		geometriesToUpdate: { id: FeatureId; geometry: GeoJSONStoreGeometries }[],
		context?: OnChangeContext,
	): void {
		const ids: FeatureId[] = [];
		geometriesToUpdate.forEach(({ id, geometry }) => {
			ids.push(id);

			const feature = this.store[id];

			if (!feature) {
				throw new Error(
					`No feature with this (${id}), can not update geometry`,
				);
			}

			feature.geometry = this.clone(geometry);

			this.spatialIndex.update(feature);

			// Update the time the feature was updated
			if (this.tracked) {
				feature.properties.updatedAt = +new Date();
			}
		});

		if (this._onChange) {
			this._onChange(ids, "update", context);
		}
	}

	create<Id extends FeatureId>(
		features: {
			geometry: GeoJSONStoreGeometries;
			properties?: JSONObject;
		}[],
		context?: OnChangeContext,
	): Id[] {
		const ids: FeatureId[] = [];
		features.forEach(({ geometry, properties }) => {
			let createdAt;
			let createdProperties = { ...properties };

			if (this.tracked) {
				createdAt = +new Date();

				if (properties) {
					createdProperties.createdAt =
						typeof properties.createdAt === "number"
							? properties.createdAt
							: createdAt;
					createdProperties.updatedAt =
						typeof properties.updatedAt === "number"
							? properties.updatedAt
							: createdAt;
				} else {
					createdProperties = { createdAt, updatedAt: createdAt };
				}
			}

			const id = this.getId();
			const feature = {
				id,
				type: "Feature",
				geometry,
				properties: createdProperties,
			} as GeoJSONStoreFeatures;

			this.store[id] = feature;
			this.spatialIndex.insert(feature);

			ids.push(id);
		});

		if (this._onChange) {
			this._onChange([...ids], "create", context);
		}

		return ids as Id[];
	}

	delete(ids: FeatureId[], context?: OnChangeContext): void {
		ids.forEach((id) => {
			if (this.store[id]) {
				delete this.store[id];
				this.spatialIndex.remove(id as FeatureId);
			} else {
				throw new Error(`No feature with id ${id}, can not delete`);
			}
		});

		if (this._onChange) {
			this._onChange([...ids], "delete", context);
		}
	}

	copy(id: FeatureId): GeoJSONStoreFeatures {
		return this.clone(this.store[id]);
	}

	copyAll(): GeoJSONStoreFeatures[] {
		return this.clone(Object.keys(this.store).map((id) => this.store[id]));
	}

	copyAllWhere(
		equals: (properties: JSONObject) => boolean,
	): GeoJSONStoreFeatures[] {
		return this.clone(
			Object.keys(this.store)
				.map((id) => this.store[id])
				.filter((feature) => {
					return feature.properties && equals(feature.properties);
				}),
		);
	}

	clear(): void {
		this.store = {};
		this.spatialIndex.clear();
	}

	size(): number {
		return Object.keys(this.store).length;
	}
}
