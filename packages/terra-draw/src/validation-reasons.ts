import {
	ValidationReasonModeMismatch,
	ValidationReasonFeatureNotPolygon,
} from "./validations/common-validations";
import { ValidationReasonFeatureLessThanMinSize } from "./validations/min-size.validation";
import {
	ValidationReasonFeatureNotPolygonOrLineString,
	ValidationReasonFeatureSelfIntersects,
} from "./validations/not-self-intersecting.validation";
import {
	ValidationReasonFeatureInvalidCoordinates,
	ValidationReasonFeatureNotPoint,
	ValidationReasonFeatureInvalidCoordinatePrecision,
} from "./validations/point.validation";
import {
	ValidationReasonFeatureHasHoles,
	ValidationReasonFeatureLessThanFourCoordinates,
	ValidationReasonFeatureHasInvalidCoordinates,
	ValidationReasonFeatureCoordinatesNotClosed,
} from "./validations/polygon.validation";

export const ValidationReasons = {
	ValidationReasonFeatureNotPoint,
	ValidationReasonFeatureInvalidCoordinates,
	ValidationReasonFeatureInvalidCoordinatePrecision,
	ValidationReasonFeatureNotPolygon,
	ValidationReasonFeatureHasHoles,
	ValidationReasonFeatureLessThanFourCoordinates,
	ValidationReasonFeatureHasInvalidCoordinates,
	ValidationReasonFeatureCoordinatesNotClosed,
	ValidationReasonFeatureNotPolygonOrLineString,
	ValidationReasonFeatureSelfIntersects,
	ValidationReasonFeatureLessThanMinSize,
	ValidationReasonModeMismatch,
};
