import { Position } from "geojson";
import { FeatureId, GeoJSONStoreFeatures } from "../store";
import { RBush, Node } from "./rbush";

export class SpatialIndex {
	private tree: RBush;
	private idToNode: Map<FeatureId, Node>;
	private nodeToId: Map<Node, FeatureId>;

	constructor(options?: { maxEntries: number }) {
		this.tree = new RBush(
			options && options.maxEntries ? options.maxEntries : 9,
		);
		this.idToNode = new Map();
		this.nodeToId = new Map();
	}

	private setMaps(feature: GeoJSONStoreFeatures, bbox: Node) {
		this.idToNode.set(feature.id as FeatureId, bbox);
		this.nodeToId.set(bbox, feature.id as FeatureId);
	}

	private toBBox(feature: GeoJSONStoreFeatures) {
		const longitudes: number[] = [];
		const latitudes: number[] = [];

		let coordinates: Position[];
		if (feature.geometry.type === "Polygon") {
			coordinates = feature.geometry.coordinates[0];
		} else if (feature.geometry.type === "LineString") {
			coordinates = feature.geometry.coordinates;
		} else if (feature.geometry.type === "Point") {
			coordinates = [feature.geometry.coordinates];
		} else {
			throw new Error("Not a valid feature to turn into a bounding box");
		}

		for (let i = 0; i < coordinates.length; i++) {
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

	insert(feature: GeoJSONStoreFeatures): void {
		if (this.idToNode.get(String(feature.id))) {
			throw new Error("Feature already exists");
		}
		const bbox = this.toBBox(feature);
		this.setMaps(feature, bbox);
		this.tree.insert(bbox);
	}

	load(features: GeoJSONStoreFeatures[]): void {
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

	update(feature: GeoJSONStoreFeatures): void {
		this.remove(feature.id as FeatureId);
		const bbox = this.toBBox(feature);
		this.setMaps(feature, bbox);
		this.tree.insert(bbox);
	}

	remove(featureId: FeatureId): void {
		const node = this.idToNode.get(featureId);
		if (!node) {
			throw new Error(`${featureId} not inserted into the spatial index`);
		}

		this.tree.remove(node);
	}

	clear(): void {
		this.tree.clear();
	}

	search(feature: GeoJSONStoreFeatures): FeatureId[] {
		const found = this.tree.search(this.toBBox(feature));
		return found.map((node) => {
			return this.nodeToId.get(node) as FeatureId;
		});
	}

	collides(feature: GeoJSONStoreFeatures): boolean {
		return this.tree.collides(this.toBBox(feature));
	}
}
