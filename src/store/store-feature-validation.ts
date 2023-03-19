import { GeoJSONStoreFeatures } from "./store";

export const StoreValidationErrors = {
	FeatureHasNoId: "Feature has no id",
	FeatureIsNotObject: "Feature is not object",
	InvalidTrackedProperties: "updatedAt and createdAt are not valid timestamps",
	FeatureHasNoMode: "Feature does not have a set mode",
	FeatureIdIsNotUUID4: `Feature must have UUID4 id`,
	FeatureHasNoGeometry: "Feature has no geometry",
	FeatureHasNoProperties: "Feature has no properties",
	FeatureGeometryNotSupported: "Feature is not Point, LineString or Polygon",
	FeatureCoordinatesNotAnArray: "Feature coordinates is not an array",
	InvalidModeProperty: "Feature does not have a valid mode property",
} as const;

function isObject(
	feature: unknown
): feature is Record<string | number, unknown> {
	return Boolean(
		feature &&
			typeof feature === "object" &&
			feature !== null &&
			!Array.isArray(feature)
	);
}

function hasTracked(feature: GeoJSONStoreFeatures): boolean {
	if (
		isNaN(new Date(feature.properties.createdAt as number).valueOf()) ||
		isNaN(new Date(feature.properties.updatedAt as number).valueOf())
	) {
		throw new Error(StoreValidationErrors.InvalidTrackedProperties);
	}

	return true;
}

function hasMode(feature: GeoJSONStoreFeatures): boolean {
	if (!feature.properties.mode || typeof feature.properties.mode !== "string") {
		throw new Error(StoreValidationErrors.InvalidModeProperty);
	}
	return true;
}

function isValidStoreFeature(
	feature: unknown
): feature is GeoJSONStoreFeatures {
	let error;
	if (!isObject(feature)) {
		error = StoreValidationErrors.FeatureIsNotObject;
	} else if (!feature.id) {
		error = StoreValidationErrors.FeatureHasNoId;
	} else if (typeof feature.id !== "string" || feature.id.length !== 36) {
		error = StoreValidationErrors.FeatureIdIsNotUUID4;
	} else if (!isObject(feature.geometry)) {
		error = StoreValidationErrors.FeatureHasNoGeometry;
	} else if (!isObject(feature.properties)) {
		error = StoreValidationErrors.FeatureHasNoProperties;
	} else if (
		typeof feature.geometry.type !== "string" ||
		!["Polygon", "LineString", "Point"].includes(feature.geometry.type)
	) {
		error = StoreValidationErrors.FeatureGeometryNotSupported;
	} else if (!Array.isArray(feature.geometry.coordinates)) {
		error = StoreValidationErrors.FeatureCoordinatesNotAnArray;
	}

	if (error) {
		throw new Error(error);
	}

	return true;
}

export function validateStoreFeature(feature: unknown, tracked?: boolean) {
	if (isValidStoreFeature(feature)) {
		if (tracked) {
			hasTracked(feature);
		}
		hasMode(feature);
	}
}
