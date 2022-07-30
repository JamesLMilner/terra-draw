import { Feature, Point, Polygon, LineString } from "geojson";
import { uuid4 } from "../util/id";

type JSON = string | number | boolean | null | JSONArray | JSONObject;

interface JSONObject {
  [member: string]: JSON;
}
interface JSONArray extends Array<JSON> {}

export type GeoJSONStoreGeometries = Polygon | LineString | Point;

export type GeoJSONStoreFeatures = Feature<GeoJSONStoreGeometries>;

export type StoreChangeEvents = "delete" | "create" | "update";

export type StoreChangeHandler = (
  ids: string[],
  change: StoreChangeEvents
) => void;

export class GeoJSONStore {
  constructor(config?: { data: GeoJSONStoreFeatures[] }) {
    this.store = {};

    if (config && config.data) {
      config.data.forEach((feature) => {
        this.featureValidation(feature);
        this.store[feature.id] = feature;
      });
    }
  }

  private featureValidation(feature: any) {
    if (!feature || !feature.id) {
      throw new Error("Feature has no id");
    } else if (typeof feature.id !== "string" || feature.id.length !== 36) {
      throw new Error(`Feature must have uuid4 ID ${feature.id}`);
    } else if (!feature.geometry) {
      throw new Error("Feature has no geometry");
    } else if (!feature.properties) {
      throw new Error("Feature has no properties");
    } else if (
      !["Polygon", "LineString", "Point"].includes(feature.geometry.type)
    ) {
      throw new Error("Feature is not Point, LineString or Polygon");
    } else if (!Array.isArray(feature.geometry.coordinates)) {
      throw new Error("Feature coordinates is not an array");
    }
  }

  private store: {
    [key: string]: GeoJSONStoreFeatures;
  };

  private _onChange: StoreChangeHandler;

  private getId(): string {
    return uuid4();
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  registerOnChange(onChange: StoreChangeHandler) {
    this._onChange = (ids, change) => {
      onChange(ids, change);
    };
  }

  getGeometryCopy<T extends GeoJSONStoreGeometries>(id: string): T {
    const feature = this.store[id];
    if (!feature) {
      throw new Error("No feature with this id, can not get geometry copy");
    }
    return this.clone(feature.geometry as T);
  }

  getPropertiesCopy(id: string) {
    const feature = this.store[id];
    if (!feature) {
      throw new Error("No feature with this id, can not get properties copy");
    }
    return this.clone(feature.properties);
  }

  updateProperty(
    propertiesToUpdate: { id: string; property: string; value: JSON }[]
  ): void {
    const ids: string[] = [];
    propertiesToUpdate.forEach(({ id, property, value }) => {
      ids.push(id);
      const feature = this.store[id];

      if (!feature) {
        throw new Error("No feature with this id, can not update geometry");
      }

      feature.properties[property] = value;
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
        throw new Error("No feature with this id, can not update geometry");
      }

      feature.geometry = this.clone(geometry);
    });

    if (this._onChange) {
      this._onChange(ids, "update");
    }
  }

  create(
    features: { geometry: GeoJSONStoreGeometries; properties?: JSON }[]
  ): string[] {
    const ids: string[] = [];
    features.forEach(({ geometry, properties }) => {
      const id = this.getId();
      const feature = {
        id,
        type: "Feature",
        geometry,
        properties: properties ? properties : {},
      } as GeoJSONStoreFeatures;

      this.store[id] = feature;

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
