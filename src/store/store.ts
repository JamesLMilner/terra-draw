import { Feature, Point, Polygon, LineString } from "geojson";
import { uuid4 } from "../util/id";
import { SpatialIndex } from "./spatial-index/spatial-index";
import { isValidTimestamp } from "./store-feature-validation";

type JSON = string | number | boolean | null | JSONArray | JSONObject;

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

export type StoreChangeEvents = "delete" | "create" | "update" | "styling";

export type StoreChangeHandler = (
	ids: FeatureId[],
	change: StoreChangeEvents,
) => void;

export type FeatureId = string | number;

export type IdStrategy<Id extends FeatureId> = {
	isValidId: (id: Id) => boolean;
	getId: () => Id;
};

export type GeoJSONStoreConfig<Id extends FeatureId> = {
	idStrategy?: IdStrategy<Id>;
	tracked?: boolean;
};

export const defaultIdStrategy = {
	getId: <FeatureId>() => uuid4() as FeatureId,
	isValidId: (id: FeatureId) => typeof id === "string" && id.length === 36,
};

export class GeoJSONStore<Id extends FeatureId = FeatureId> {
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
	private _onChange: StoreChangeHandler = () => {};

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
		featureValidation?: (feature: unknown, tracked?: boolean) => boolean,
	) {
		if (data.length === 0) {
			return;
		}

		// We don't want to update the original data
		const clonedData = this.clone(data);

		// We try to be a bit forgiving here as many users
		// may not set a feature id as UUID or createdAt/updatedAt
		clonedData.forEach((feature) => {
			if (feature.id === undefined || feature.id === null) {
				feature.id = this.idStrategy.getId();
			}

			if (this.tracked) {
				if (!feature.properties.createdAt) {
					feature.properties.createdAt = +new Date();
				} else {
					isValidTimestamp(feature.properties.createdAt);
				}

				if (!feature.properties.updatedAt) {
					feature.properties.updatedAt = +new Date();
				} else {
					isValidTimestamp(feature.properties.updatedAt);
				}
			}
		});

		const changes: FeatureId[] = [];
		clonedData.forEach((feature) => {
			const id = feature.id as FeatureId;
			if (featureValidation) {
				const isValid = featureValidation(feature);

				// Generic error handling if the featureValidation function
				// does not throw something more specific itself
				if (!isValid) {
					throw new Error(
						`Feature is not ${id} valid: ${JSON.stringify(feature)}`,
					);
				}
			}

			// We have to be sure that the feature does not already exist with this ID
			if (this.has(id)) {
				throw new Error(`Feature already exists with this id: ${id}`);
			}

			this.store[id] = feature;
			changes.push(id);
		});
		this.spatialIndex.load(clonedData);
		this._onChange(changes, "create");
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

	registerOnChange(onChange: StoreChangeHandler) {
		this._onChange = (ids, change) => {
			onChange(ids, change);
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
		propertiesToUpdate: { id: FeatureId; property: string; value: JSON }[],
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

			feature.properties[property] = value;

			// Update the time the feature was updated
			if (this.tracked) {
				feature.properties.updatedAt = +new Date();
			}
		});

		if (this._onChange) {
			this._onChange(ids, "update");
		}
	}

	updateGeometry(
		geometriesToUpdate: { id: FeatureId; geometry: GeoJSONStoreGeometries }[],
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
			this._onChange(ids, "update");
		}
	}

	create<Id extends FeatureId>(
		features: {
			geometry: GeoJSONStoreGeometries;
			properties?: JSONObject;
		}[],
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
			this._onChange([...ids], "create");
		}

		return ids as Id[];
	}

	delete(ids: FeatureId[]): void {
		ids.forEach((id) => {
			if (this.store[id]) {
				delete this.store[id];
				this.spatialIndex.remove(id as FeatureId);
			} else {
				throw new Error("No feature with this id, can not delete");
			}
		});

		if (this._onChange) {
			this._onChange([...ids], "delete");
		}
	}

	copyAll(): GeoJSONStoreFeatures[] {
		return this.clone(Object.keys(this.store).map((id) => this.store[id]));
	}

	clear(): void {
		this.store = {};
		this.spatialIndex.clear();
	}

	size(): number {
		return Object.keys(this.store).length;
	}
}
