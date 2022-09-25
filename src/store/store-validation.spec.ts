import {
  StoreValidationErrors,
  validateStoreFeature,
} from "./store-feature-validation";

describe("validateStoreFeature", () => {
  it("throws on data with non object feature", () => {
    expect(() => validateStoreFeature(undefined)).toThrowError(
      StoreValidationErrors.FeatureIsNotObject
    );
    expect(() => validateStoreFeature(null)).toThrowError(
      StoreValidationErrors.FeatureIsNotObject
    );
  });

  it("throws on data with no id", () => {
    expect(() => validateStoreFeature({ id: undefined })).toThrowError(
      StoreValidationErrors.FeatureHasNoId
    );
    expect(() => validateStoreFeature({ id: null })).toThrowError(
      StoreValidationErrors.FeatureHasNoId
    );
  });

  it("throws on data with non string id", () => {
    expect(() => validateStoreFeature({ id: 1 })).toThrowError(
      StoreValidationErrors.FeatureIdIsNotUUID4
    );
  });

  it("throws on data with non uuid4 id", () => {
    expect(() => validateStoreFeature({ id: "1" })).toThrowError(
      StoreValidationErrors.FeatureIdIsNotUUID4
    );
  });

  it("throws on data with no geometry", () => {
    expect(() =>
      validateStoreFeature({ id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284" })
    ).toThrowError(StoreValidationErrors.FeatureHasNoGeometry);
  });

  it("throws on data with no properties", () => {
    expect(() => {
      validateStoreFeature({
        id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
        geometry: {},
      } as any);
    }).toThrowError(StoreValidationErrors.FeatureHasNoProperties);
  });

  it("throws on data with non Point, LineString, Polygon geometry type", () => {
    expect(() => {
      validateStoreFeature({
        id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
        geometry: {
          type: "MultiLineString",
        },
        properties: {},
      } as any);
    }).toThrowError(StoreValidationErrors.FeatureGeometryNotSupported);
  });

  it("throws on data with supported geometry with non array coordinate property", () => {
    expect(() => {
      validateStoreFeature({
        id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
        geometry: {
          type: "Point",
          coordinates: "[]",
        },
        properties: {},
      });
    }).toThrowError(StoreValidationErrors.FeatureCoordinatesNotAnArray);
  });

  it("throws if mode is not provided as a string", () => {
    expect(() =>
      validateStoreFeature({
        id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {
          mode: 1,
        },
      })
    ).toThrowError(StoreValidationErrors.InvalidModeProperty);
  });

  it("does not throw if mode is provide as a string", () => {
    expect(() =>
      validateStoreFeature({
        id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {
          mode: "test",
        },
      })
    ).not.toThrowError();
  });

  it("throws if tracked is explicitly true and tracked properties are not provided", () => {
    expect(() =>
      validateStoreFeature(
        {
          id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: {
            mode: "test",
          },
        },
        true
      )
    ).toThrowError(StoreValidationErrors.InvalidTrackedProperties);
  });

  it("does not throw if tracked is false and tracked properties are not provided", () => {
    expect(() =>
      validateStoreFeature({
        id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {
          mode: "test",
        },
      })
    ).not.toThrowError();
  });

  it("does not throw if tracked is true and tracked properties are provided", () => {
    expect(() =>
      validateStoreFeature(
        {
          id: "e3ccd3b9-afb1-4f0b-91d8-22a768d5f284",
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: {
            mode: "test",
            updatedAt: +new Date(),
            createdAt: +new Date(),
          },
        },
        true
      )
    ).not.toThrowError();
  });
});
