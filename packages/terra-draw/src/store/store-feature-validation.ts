import { Validation } from "../common";
import { FeatureId, IdStrategy } from "./store";

export const StoreValidationErrors = {
	FeatureHasNoId: "Feature has no id",
	FeatureIsNotObject: "Feature is not object",
	InvalidTrackedProperties: "updatedAt and createdAt are not valid timestamps",
	FeatureHasNoMode: "Feature does not have a set mode",
	FeatureIdIsNotValidGeoJSON: `Feature must be string or number as per GeoJSON spec`,
	FeatureIdIsNotValid: `Feature must match the id strategy (default is UUID4)`,
	FeatureHasNoGeometry: "Feature has no geometry",
	FeatureHasNoProperties: "Feature has no properties",
	FeatureGeometryNotSupported: "Feature is not Point, LineString or Polygon",
	FeatureCoordinatesNotAnArray: "Feature coordinates is not an array",
	InvalidModeProperty: "Feature does not have a valid mode property",
} as const;

function isObject(
	feature: unknown,
): feature is Record<string | number, unknown> {
	return Boolean(
		feature &&
			typeof feature === "object" &&
			feature !== null &&
			!Array.isArray(feature),
	);
}

export function hasModeProperty(
	feature: unknown,
): feature is { properties: { mode: string } } {
	return Boolean(
		feature &&
			typeof feature === "object" &&
			"properties" in feature &&
			typeof feature.properties === "object" &&
			feature.properties !== null &&
			"mode" in feature.properties,
	);
}

function dateIsValid(timestamp: unknown): boolean {
	return (
		typeof timestamp === "number" &&
		!isNaN(new Date(timestamp as number).valueOf())
	);
}

export function isValidTimestamp(timestamp: unknown): boolean {
	if (!dateIsValid(timestamp)) {
		return false;
	}

	return true;
}

export function isValidStoreFeature(
	feature: unknown,
	isValidId: IdStrategy<FeatureId>["isValidId"],
): ReturnType<Validation> {
	let error;
	if (!isObject(feature)) {
		error = StoreValidationErrors.FeatureIsNotObject;
	} else if (feature.id === null || feature.id === undefined) {
		error = StoreValidationErrors.FeatureHasNoId;
	} else if (typeof feature.id !== "string" && typeof feature.id !== "number") {
		error = StoreValidationErrors.FeatureIdIsNotValidGeoJSON;
	} else if (!isValidId(feature.id)) {
		error = StoreValidationErrors.FeatureIdIsNotValid;
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
	} else if (
		!feature.properties.mode ||
		typeof feature.properties.mode !== "string"
	) {
		return { valid: false, reason: StoreValidationErrors.InvalidModeProperty };
	}

	if (error) {
		return { valid: false, reason: error };
	}

	return { valid: true };
}
