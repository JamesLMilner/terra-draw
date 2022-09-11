import { Feature, Point, Polygon, LineString } from "geojson";
import { uuid4 } from "../util/id";
import { SpatialIndex } from "./spatial-index/spatial-index";

type JSON = string | number | boolean | null | JSONArray | JSONObject;

export interface JSONObject {
  [member: string]: JSON;
}
interface JSONArray extends Array<JSON> {}

type DefinedProperties = Record<string, JSON>;

export type GeoJSONStoreGeometries = Polygon | LineString | Point;

export type BBoxPolygon = Feature<Polygon, DefinedProperties>;

export type GeoJSONStoreFeatures = Feature<
  GeoJSONStoreGeometries,
  DefinedProperties
>;

export type StoreChangeEvents = "delete" | "create" | "update";

export type StoreChangeHandler = (
  ids: string[],
  change: StoreChangeEvents
) => void;

export type GeoJSONStoreConfig = {
  data?: GeoJSONStoreFeatures[];
  tracked?: boolean;
};

export class GeoJSONStore {
  constructor(config?: GeoJSONStoreConfig) {
    this.store = {};
    this.spatialIndex = new SpatialIndex();

    // Setting tracked has to happen first
    // because we use it in featureValidation
    this.tracked = config && config.tracked === false ? false : true;

    if (config && config.data) {
      this.load(config.data);
    }
  }

  private tracked: boolean;

  private spatialIndex: SpatialIndex;

  private store: {
    [key: string]: GeoJSONStoreFeatures;
  };

  // Default to no-op
  private _onChange: StoreChangeHandler = () => {};

  private getId(): string {
    return uuid4();
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private isObject(
    feature: unknown
  ): feature is Record<string | number, unknown> {
    return (
      feature &&
      typeof feature === "object" &&
      feature !== null &&
      !Array.isArray(feature)
    );
  }

  private featureValidation(feature: unknown) {
    if (!this.isObject(feature)) {
      throw new Error("Feature is not object");
    } else if (!feature.id) {
      throw new Error("Feature has no id");
    } else if (typeof feature.id !== "string" || feature.id.length !== 36) {
      throw new Error(`Feature must have uuid4 ID ${feature.id}`);
    } else if (!this.isObject(feature.geometry)) {
      throw new Error("Feature has no geometry");
    } else if (!this.isObject(feature.properties)) {
      throw new Error("Feature has no properties");
    } else if (
      typeof feature.geometry.type !== "string" ||
      !["Polygon", "LineString", "Point"].includes(feature.geometry.type)
    ) {
      throw new Error("Feature is not Point, LineString or Polygon");
    } else if (!Array.isArray(feature.geometry.coordinates)) {
      throw new Error("Feature coordinates is not an array");
    }

    if (this.tracked) {
      if (
        isNaN(new Date(feature.properties.createdAt as number).valueOf()) ||
        isNaN(new Date(feature.properties.updatedAt as number).valueOf())
      ) {
        throw new Error("updatedAt and createdAt are not valid timestamps");
      }
    }

    if (!feature.properties.mode) {
      throw new Error("Feature does not have a set mode");
    }
  }

  load(data: GeoJSONStoreFeatures[]) {
    // We don't want to update the original data
    const clonedData = this.clone(data);

    // We try to be a bit forgiving here as many users
    // may not set a feature id as UUID or createdAt/updatedAt
    clonedData.forEach((feature) => {
      if (!feature.id) {
        feature.id = uuid4();
      }

      if (!feature.properties.createdAt) {
        feature.properties.createdAt = +new Date();
      }

      if (!feature.properties.updatedAt) {
        feature.properties.updatedAt = +new Date();
      }
    });

    const changes: string[] = [];
    clonedData.forEach((feature) => {
      this.featureValidation(feature);
      this.store[feature.id as string] = feature;
      changes.push(feature.id as string);
    });
    this.spatialIndex.load(clonedData);
    this._onChange(changes, "create");
  }

  search(
    bbox: BBoxPolygon,
    filter?: (feature: GeoJSONStoreFeatures) => boolean
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

  getGeometryCopy<T extends GeoJSONStoreGeometries>(id: string): T {
    const feature = this.store[id];
    if (!feature) {
      throw new Error(
        `No feature with this id (${id}), can not get geometry copy`
      );
    }
    return this.clone(feature.geometry as T);
  }

  getPropertiesCopy(id: string) {
    const feature = this.store[id];
    if (!feature) {
      throw new Error(
        `No feature with this id (${id}), can not get properties copy`
      );
    }
    return this.clone(feature.properties);
  }

  updateProperty(
    propertiesToUpdate: { id: string; property: string; value: JSON }[]
  ): void {
    const ids: string[] = [];
    propertiesToUpdate.forEach(({ id, property, value }) => {
      const feature = this.store[id];

      if (!feature) {
        throw new Error(
          `No feature with this (${id}), can not update geometry`
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
    geometriesToUpdate: { id: string; geometry: GeoJSONStoreGeometries }[]
  ): void {
    const ids: string[] = [];
    geometriesToUpdate.forEach(({ id, geometry }) => {
      ids.push(id);

      const feature = this.store[id];

      if (!feature) {
        throw new Error(
          `No feature with this (${id}), can not update geometry`
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

  create(
    features: { geometry: GeoJSONStoreGeometries; properties?: JSONObject }[]
  ): string[] {
    const ids: string[] = [];
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

    return ids;
  }

  delete(ids: string[]): void {
    ids.forEach((id) => {
      if (this.store[id]) {
        delete this.store[id];
        this.spatialIndex.remove(id as string);
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
}
