import { Feature, Point, Polygon, LineString } from "geojson";
import { uuid4 } from "../util/id";

type JSON = string | number | boolean | null | JSONArray | JSONObject;

interface JSONObject {
  [member: string]: JSON;
}
interface JSONArray extends Array<JSON> {}

type GeoJSONStoreGeometries = Polygon | LineString | Point;

type GeoJSONStoreFeatures = Feature<GeoJSONStoreGeometries>;

export type StoreChangeEvents = "delete" | "create" | "update";

export type StoreChangeHandler = (
  id: string,
  change: StoreChangeEvents
) => void;

export class GeoJSONStore {
  private store: {
    [key: string]: GeoJSONStoreFeatures;
  } = {};

  private _onChange: StoreChangeHandler;

  private getId(): string {
    return uuid4();
  }

  registerOnChange(onChange: StoreChangeHandler) {
    this._onChange = (id, change) => {
      onChange(id, change);
    };
  }

  updateGeometry(id: string, geometry: GeoJSONStoreGeometries): string {
    const feature = this.store[id];

    if (!feature) {
      throw new Error("No feature with this id, can not update geometry");
    }

    feature.geometry = JSON.parse(JSON.stringify(geometry));

    if (this._onChange) {
      this._onChange(id, "update");
    }

    return id;
  }

  getGeometryCopy<T>(id: string): T {
    const feature = this.store[id];
    if (!feature) {
      throw new Error("No feature with this id, can not get geometry copy");
    }
    return JSON.parse(JSON.stringify(feature.geometry));
  }

  create(geometry: GeoJSONStoreGeometries, properties: JSON = {}): string {
    const id = this.getId();
    const feature = {
      id,
      type: "Feature",
      geometry,
      properties,
    } as GeoJSONStoreFeatures;

    this.store[id] = feature;

    if (this._onChange) {
      this._onChange(id, "create");
    }

    return id;
  }

  delete(id: string): void {
    if (this.store[id]) {
      delete this.store[id];
      if (this._onChange) {
        this._onChange(id, "delete");
      }
    } else {
      throw new Error("No feature with this id, can not delete");
    }
  }

  copyAll(): GeoJSONStoreFeatures[] {
    return JSON.parse(
      JSON.stringify(Object.keys(this.store).map((id) => this.store[id]))
    );
  }
}
