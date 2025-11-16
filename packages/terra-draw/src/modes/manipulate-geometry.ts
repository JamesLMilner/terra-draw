import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { FeatureId } from "../extend";
import { GeoJSONStoreFeatures, JSONObject, JSON } from "../store/store";
import { Polygon, Position } from "geojson";
import { UpdateTypes, Validation } from "../common";
import { coordinatesIdentical } from "../geometry/coordinates-identical";
import { ensureRightHandRule } from "../geometry/ensure-right-hand-rule";

type ManipulateGeometryBehaviorOptions = {
	validate: Validation | undefined;
	onSuccess: (feature: GeoJSONStoreFeatures) => void;
};

export const Mutations = {
	INSERT: "insert",
	UPDATE: "update",
	DELETE: "delete",
} as const;

// Coordinate mutations assume that the index is relative to the original array
// of coordinates before any mutations are applied.
export type CoordinateMutation =
	| { type: typeof Mutations.INSERT; index: number; coordinate: Position }
	| { type: typeof Mutations.UPDATE; index: number; coordinate: Position }
	| { type: typeof Mutations.DELETE; index: number };

interface CoordinateMutations {
	mutations: CoordinateMutation[];
}

type ValidProperties = Record<string, JSON | undefined>;

export class ManipulateGeometryBehavior<
	Properties extends ValidProperties,
> extends TerraDrawModeBehavior {
	constructor(
		config: BehaviorConfig,
		options: {
			validate: Validation | undefined;
			onSuccess: (feature: GeoJSONStoreFeatures) => void;
		},
	) {
		super(config);
		this.options = options;
	}

	private options: ManipulateGeometryBehaviorOptions;

	public coordinateAtIndexIsIdentical({
		featureId,
		newCoordinate,
		index,
	}: {
		featureId: FeatureId;
		newCoordinate: Position;
		index: number;
	}) {
		const geometry = this.store.getGeometryCopy(featureId);

		let coordinate;

		if (geometry.type === "Polygon") {
			coordinate = geometry.coordinates[0][index];
		} else if (geometry.type === "LineString") {
			coordinate = geometry.coordinates[index];
		} else {
			if (index !== 0) {
				throw new Error("Point geometries only have one coordinate at index 0");
			}
			coordinate = geometry.coordinates;
		}

		return coordinatesIdentical(newCoordinate, coordinate);
	}

	public createPolygonGeometry({
		coordinates,
		properties,
	}: {
		coordinates: Polygon["coordinates"][0];
		properties?: JSONObject;
	}) {
		const newGeometry = {
			type: "Polygon",
			coordinates: [coordinates],
		} as Polygon;

		const [id] = this.store.create([
			{ geometry: newGeometry, properties: properties ? properties : {} },
		]);

		const created = {
			id,
			type: "Feature",
			properties: this.store.getPropertiesCopy(id),
			geometry: this.store.getGeometryCopy<Polygon>(id),
		} as GeoJSONStoreFeatures;

		this.options.onSuccess(created);

		return created;
	}

	public updatePolygon({
		featureId,
		coordinateMutations,
		updateType,
		propertyMutations,
	}: {
		featureId: FeatureId;
		updateType: UpdateTypes;
		coordinateMutations?: CoordinateMutation[];
		propertyMutations?: Properties;
	}) {
		if (!featureId) {
			return null;
		}

		if (coordinateMutations) {
			const existingGeometry = this.store.getGeometryCopy(featureId);

			if (existingGeometry.type !== "Polygon") {
				return null;
			}

			const updatedGeometry = this.applyCoordinateMutations(existingGeometry, {
				mutations: coordinateMutations,
			});

			if (this.options.validate) {
				const validationResult = this.options.validate(
					{
						type: "Feature",
						geometry: updatedGeometry,
					} as GeoJSONStoreFeatures,
					{
						project: this.project,
						unproject: this.unproject,
						coordinatePrecision: this.coordinatePrecision,
						updateType,
					},
				);

				if (!validationResult.valid) {
					return null;
				}
			}

			this.store.updateGeometry([{ id: featureId, geometry: updatedGeometry }]);
		}

		if (propertyMutations) {
			const properties = Object.keys(propertyMutations);
			this.store.updateProperty(
				properties.map((key: string) => ({
					id: featureId,
					property: key,
					value: propertyMutations[key] as JSON | undefined,
				})),
			);
		}

		const updated = {
			id: featureId,
			type: "Feature",
			properties: this.store.getPropertiesCopy(featureId),
			geometry: this.store.getGeometryCopy<Polygon>(featureId),
		} as GeoJSONStoreFeatures<Polygon>;

		this.options.onSuccess(updated);

		return updated;
	}

	private applyCoordinateMutations(
		updatedGeometry: GeoJSON.Polygon,
		coordinatesMutations: CoordinateMutations,
	): GeoJSON.Polygon {
		const ring = updatedGeometry.coordinates[0];
		const originalLength = ring.length;

		// Normalize indices relative to the original array length
		const normalizeIndex = (idx: number): number => {
			const n = idx < 0 ? originalLength + idx : idx;
			if (n < 0 || n > originalLength) {
				// for inserts, we allow n === originalLength (append)
				throw new RangeError(
					`Index ${idx} (normalized to ${n}) is out of bounds`,
				);
			}
			return n;
		};

		// For each original index i (0..originalLength-1), store:
		// - the last non-insert mutation (update/delete) that targets i
		const nonInsertByIndex: (CoordinateMutation | undefined)[] = new Array(
			originalLength,
		).fill(undefined);

		// For inserts, we allow indices 0..originalLength.
		// insertsByIndex[i] = array of insert mutations that happen *before* original element i
		// insertsByIndex[originalLength] = inserts that go at the end
		const insertsByIndex: CoordinateMutation[][] = Array.from(
			{ length: originalLength + 1 },
			() => [],
		);

		// 1) Scan mutations in the order provided
		for (const mutation of coordinatesMutations.mutations) {
			const normalizedIndex = normalizeIndex(mutation.index);

			if (mutation.type === "insert") {
				// Insert "before" the element that was originally at this index.
				// If index === originalLength, this means "append at end".
				insertsByIndex[normalizedIndex].push(mutation);
				continue;
			}

			// update/delete point to original elements 0..originalLength-1
			if (normalizedIndex >= originalLength) {
				throw new RangeError(
					`update/delete index ${mutation.index} is out of range for original length ${originalLength}`,
				);
			}

			// For update/delete, the *last* one wins at each original index
			nonInsertByIndex[normalizedIndex] = {
				...mutation,
				index: normalizedIndex,
			};
		}

		// 2) Build the new ring from scratch
		const newRing: Position[] = [];

		for (let i = 0; i < originalLength; i++) {
			// inserts that go before the element originally at i
			const insertsHere = insertsByIndex[i];
			for (const ins of insertsHere) {
				// type is guaranteed "insert" here
				newRing.push(
					(ins as Extract<CoordinateMutation, { type: "insert" }>).coordinate,
				);
			}

			const m = nonInsertByIndex[i];

			if (!m) {
				// No update/delete targeting this index: keep the original coordinate
				newRing.push(ring[i]);
				continue;
			}

			if (m.type === "delete") {
				// Skip this original coordinate
				continue;
			}

			// Must be update
			newRing.push(
				(m as Extract<CoordinateMutation, { type: "update" }>).coordinate,
			);
		}

		// 3) Tail inserts (index === originalLength)
		const tailInserts = insertsByIndex[originalLength];
		for (const ins of tailInserts) {
			newRing.push(
				(ins as Extract<CoordinateMutation, { type: "insert" }>).coordinate,
			);
		}

		// 4) Return a new geometry object (or mutate in place if you prefer)
		return {
			...updatedGeometry,
			coordinates: [newRing, ...updatedGeometry.coordinates.slice(1)],
		};
	}

	public epsilonOffset() {
		// We must add a very small epsilon value so that Mapbox GL
		// renders the polygon - There might be a cleaner solution?
		const epsilon = 1 / Math.pow(10, this.coordinatePrecision - 1);
		const offset = Math.max(0.000001, epsilon);
		return offset;
	}

	public correctPolygon(featureId: FeatureId) {
		const correctedGeometry = ensureRightHandRule(
			this.store.getGeometryCopy<Polygon>(featureId),
		);

		if (correctedGeometry) {
			this.store.updateGeometry([
				{ id: featureId, geometry: correctedGeometry },
			]);

			const corrected = {
				id: featureId,
				type: "Feature",
				properties: this.store.getPropertiesCopy(featureId),
				geometry: this.store.getGeometryCopy<Polygon>(featureId),
			} as GeoJSONStoreFeatures<Polygon>;

			this.options.onSuccess(corrected);

			return corrected;
		} else {
			return null;
		}
	}
}
