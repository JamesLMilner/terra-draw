import { defaultIdStrategy } from "./store";
import {
	StoreValidationErrors,
	isValidStoreFeature,
	isValidTimestamp,
} from "./store-feature-validation";

describe("isValidStoreFeature", () => {
	const isValidId = defaultIdStrategy.isValidId;

	it("throws on data with non object feature", () => {
		expect(() => isValidStoreFeature(undefined, isValidId)).toThrowError(
			StoreValidationErrors.FeatureIsNotObject,
		);
		expect(() => isValidStoreFeature(null, isValidId)).toThrowError(
			StoreValidationErrors.FeatureIsNotObject,
		);
	});

	it("throws on data with no id", () => {
		expect(() =>
			isValidStoreFeature({ id: undefined }, isValidId),
		).toThrowError(StoreValidationErrors.FeatureHasNoId);
		expect(() => isValidStoreFeature({ id: null }, isValidId)).toThrowError(
			StoreValidationErrors.FeatureHasNoId,
		);
	});

	it("throws on data with non string id", () => {
		expect(() => isValidStoreFeature({ id: 1 }, isValidId)).toThrowError(
			StoreValidationErrors.FeatureIdIsNotValid,
		);
	});

	it("throws on data with non uuid4 id", () => {
		expect(() => isValidStoreFeature({ id: "1" }, isValidId)).toThrowError(
			StoreValidationErrors.FeatureIdIsNotValid,
		);
	});

	it("throws on data with no geometry", () => {
		expect(() =>
			isValidStoreFeature(
				{ id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284" },
				isValidId,
			),
		).toThrowError(StoreValidationErrors.FeatureHasNoGeometry);
	});

	it("throws on data with no properties", () => {
		expect(() => {
			isValidStoreFeature(
				{
					id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
					geometry: {},
				} as any,
				isValidId,
			);
		}).toThrowError(StoreValidationErrors.FeatureHasNoProperties);
	});

	it("throws on data with non Point, LineString, Polygon geometry type", () => {
		expect(() => {
			isValidStoreFeature(
				{
					id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
					geometry: {
						type: "MultiLineString",
					},
					properties: {},
				} as any,
				isValidId,
			);
		}).toThrowError(StoreValidationErrors.FeatureGeometryNotSupported);
	});

	it("throws on data with supported geometry with non array coordinate property", () => {
		expect(() => {
			isValidStoreFeature(
				{
					id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
					geometry: {
						type: "Point",
						coordinates: "[]",
					},
					properties: {},
				},
				isValidId,
			);
		}).toThrowError(StoreValidationErrors.FeatureCoordinatesNotAnArray);
	});

	it("throws if mode is not provided as a string", () => {
		expect(() =>
			isValidStoreFeature(
				{
					id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
					type: "Feature",
					geometry: { type: "Point", coordinates: [0, 0] },
					properties: {
						mode: 1,
					},
				},
				isValidId,
			),
		).toThrowError(StoreValidationErrors.InvalidModeProperty);
	});

	it("does not throw if mode is provide as a string", () => {
		expect(() =>
			isValidStoreFeature(
				{
					id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
					type: "Feature",
					geometry: { type: "Point", coordinates: [0, 0] },
					properties: {
						mode: "test",
					},
				},
				isValidId,
			),
		).not.toThrowError();
	});

	it("throws if tracked is explicitly true and tracked properties are not provided", () => {
		expect(() => isValidTimestamp(undefined)).toThrowError(
			StoreValidationErrors.InvalidTrackedProperties,
		);
	});

	it("does not throw if tracked is true and tracked properties are provided", () => {
		expect(() => isValidTimestamp(+new Date())).not.toThrowError();
	});
});
