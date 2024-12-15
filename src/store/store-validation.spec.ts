import { defaultIdStrategy } from "./store";
import {
	StoreValidationErrors,
	isValidStoreFeature,
	isValidTimestamp,
} from "./store-feature-validation";

describe("isValidStoreFeature", () => {
	const isValidId = defaultIdStrategy.isValidId;

	it("returns valid false with reason on data with non object feature", () => {
		expect(isValidStoreFeature(undefined, isValidId)).toEqual({
			reason: StoreValidationErrors.FeatureIsNotObject,
			valid: false,
		});
		expect(isValidStoreFeature(null, isValidId)).toEqual({
			reason: StoreValidationErrors.FeatureIsNotObject,
			valid: false,
		});
	});

	it("returns valid false with reason on data with no id", () => {
		expect(isValidStoreFeature({ id: undefined }, isValidId)).toEqual({
			reason: StoreValidationErrors.FeatureHasNoId,
			valid: false,
		});
		expect(isValidStoreFeature({ id: null }, isValidId)).toEqual({
			reason: StoreValidationErrors.FeatureHasNoId,
			valid: false,
		});
	});

	it("returns valid false with reason on data with non string id", () => {
		expect(isValidStoreFeature({ id: 1 }, isValidId)).toEqual({
			reason: StoreValidationErrors.FeatureIdIsNotValid,
			valid: false,
		});
	});

	it("returns valid false with reason on data with non uuid4 id", () => {
		expect(isValidStoreFeature({ id: "1" }, isValidId)).toEqual({
			reason: StoreValidationErrors.FeatureIdIsNotValid,
			valid: false,
		});
	});

	it("returns valid false with reason on data with no geometry", () => {
		expect(
			isValidStoreFeature(
				{ id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284" },
				isValidId,
			),
		).toEqual({
			reason: StoreValidationErrors.FeatureHasNoGeometry,
			valid: false,
		});
	});

	it("returns valid false with reason on data with no properties", () => {
		expect(
			isValidStoreFeature(
				{
					id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
					geometry: {},
				} as unknown,
				isValidId,
			),
		).toEqual({
			reason: StoreValidationErrors.FeatureHasNoProperties,
			valid: false,
		});
	});

	it("returns valid false with reason on data with non Point, LineString, Polygon geometry type", () => {
		expect(
			isValidStoreFeature(
				{
					id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
					geometry: {
						type: "MultiLineString",
					},
					properties: {},
				} as unknown,
				isValidId,
			),
		).toEqual({
			reason: StoreValidationErrors.FeatureGeometryNotSupported,
			valid: false,
		});
	});

	it("returns valid false with reason on data with supported geometry with non array coordinate property", () => {
		expect(
			isValidStoreFeature(
				{
					id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
					geometry: {
						type: "Point",
						coordinates: "[]",
					},
					properties: {},
				} as unknown,
				isValidId,
			),
		).toEqual({
			reason: StoreValidationErrors.FeatureCoordinatesNotAnArray,
			valid: false,
		});
	});

	it("returns valid false with reason if mode is not provided as a string", () => {
		expect(
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
		).toEqual({
			reason: StoreValidationErrors.InvalidModeProperty,
			valid: false,
		});
	});

	it("does not throw if mode is provide as a string", () => {
		expect(
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
		).toEqual({
			valid: true,
		});
	});

	it("returns valid false with reason if tracked is explicitly true and tracked properties are not provided", () => {
		expect(isValidTimestamp(undefined)).toEqual(false);
	});

	it("does not throw if tracked is true and tracked properties are provided", () => {
		expect(isValidTimestamp(+new Date())).toEqual(true);
	});
});
