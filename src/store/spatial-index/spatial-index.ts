import { Feature, LineString, Point, Polygon } from "geojson";
import { RBush, Node } from "./rbush";

type AcceptedSpatialIndexGeometries = Point | LineString | Polygon;
export type AcceptedSpatialIndexFeatures = Feature<AcceptedSpatialIndexGeometries>;

export class SpatialIndex {
  private tree: RBush;
  private idToNode: Map<string, Node>;
  private nodeToId: Map<Node, string>;

  constructor(options?: { maxEntries: number }) {
    this.tree = new RBush(
      options && options.maxEntries ? options.maxEntries : 9
    );
    this.idToNode = new Map();
    this.nodeToId = new Map();
  }

  private setMaps(feature: AcceptedSpatialIndexFeatures, bbox: Node) {
    this.idToNode.set(String(feature.id), bbox);
    this.nodeToId.set(bbox, String(feature.id));
  }

  private toBBox(feature: AcceptedSpatialIndexFeatures) {
    const longitudes: number[] = [];
    const latitudes: number[] = [];

    let coordinates;
    if (feature.geometry.type === "Polygon") {
      coordinates = feature.geometry.coordinates[0];
    } else if (feature.geometry.type === "LineString") {
      coordinates = feature.geometry.coordinates;
    } else if (feature.geometry.type === "Point") {
      coordinates = [feature.geometry.coordinates];
    }

    for (var i = 0; i < coordinates.length; i++) {
      latitudes.push(coordinates[i][1]);
      longitudes.push(coordinates[i][0]);
    }

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      minX: minLng,
      minY: minLat,
      maxX: maxLng,
      maxY: maxLat,
    } as Node;
  }

  insert(feature: AcceptedSpatialIndexFeatures): void {
    if (this.idToNode.get(String(feature.id))) {
      throw new Error("Feature already exists");
    }
    const bbox = this.toBBox(feature);
    this.setMaps(feature, bbox);
    this.tree.insert(bbox);
  }

  load(features: AcceptedSpatialIndexFeatures[]): void {
    const load: Node[] = [];
    const seenIds: Set<string> = new Set();
    features.forEach((feature) => {
      const bbox = this.toBBox(feature);
      this.setMaps(feature, bbox);
      if (seenIds.has(String(feature.id))) {
        throw new Error(`Duplicate feature ID found ${feature.id}`);
      }
      seenIds.add(String(feature.id));
      load.push(bbox);
    });
    this.tree.load(load);
  }

  update(feature: AcceptedSpatialIndexFeatures): void {
    this.remove(feature.id as string);
    const bbox = this.toBBox(feature);
    this.setMaps(feature, bbox);
    this.tree.insert(bbox);
  }

  remove(featureId: string): void {
    const node = this.idToNode.get(featureId);
    if (!node) {
      throw new Error(`${featureId} not inserted into the spatial index`);
    }

    this.tree.remove(node);
  }

  clear(): void {
    this.tree.clear();
  }

  search(feature: AcceptedSpatialIndexFeatures): string[] {
    return this.tree.search(this.toBBox(feature)).map((node) => {
      return this.nodeToId.get(node);
    });
  }

  collides(feature: AcceptedSpatialIndexFeatures): boolean {
    return this.tree.collides(this.toBBox(feature));
  }
}
