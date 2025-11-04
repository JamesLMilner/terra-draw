import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	Z_INDEX,
	COMMON_PROPERTIES,
} from "../../common";
import { Polygon } from "geojson";
import {
	TerraDrawBaseDrawMode,
	BaseModeOptions,
	CustomStyling,
} from "../base.mode";
import { coordinatesIdentical } from "../../geometry/coordinates-identical";
import { getDefaultStyling } from "../../util/styling";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { ValidateNonIntersectingPolygonFeature } from "../../validations/polygon.validation";
import { webMercatorDestination } from "../../geometry/measure/destination";
import { webMercatorBearing } from "../../geometry/measure/bearing";
import { midpointCoordinate } from "../../geometry/midpoint-coordinate";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../../geometry/project/web-mercator";
import { degreesToRadians } from "../../geometry/helpers";
import { determineHalfPlane } from "../../geometry/determine-halfplane";
import { cartesianDistance } from "../../geometry/measure/pixel-distance";
import { calculateRelativeAngle } from "../../geometry/calculate-relative-angle";
import { limitPrecision } from "../../geometry/limit-decimal-precision";

type TerraDrawPolygonModeKeyEvents = {
	cancel?: KeyboardEvent["key"] | null;
	finish?: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };

type PolygonStyling = {
	fillColor: HexColorStyling;
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	fillOpacity: NumericStyling;
};

interface Cursors {
	start?: Cursor;
	close?: Cursor;
}

const defaultCursors = {
	start: "crosshair",
	close: "pointer",
} as Required<Cursors>;

interface TerraDrawAngledRectangleModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	pointerDistance?: number;
	keyEvents?: TerraDrawPolygonModeKeyEvents | null;
	cursors?: Cursors;
}

export class TerraDrawAngledRectangleMode extends TerraDrawBaseDrawMode<PolygonStyling> {
	mode = "angled-rectangle";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private keyEvents: TerraDrawPolygonModeKeyEvents = defaultKeyEvents;

	// Behaviors
	private cursors: Required<Cursors> = defaultCursors;
	private mouseMove = false;

	constructor(options?: TerraDrawAngledRectangleModeOptions<PolygonStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: Omit<
			TerraDrawAngledRectangleModeOptions<PolygonStyling>,
			"modeName"
		>,
	) {
		super.updateOptions(options);

		if (options?.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else if (options?.keyEvents) {
			this.keyEvents = { ...this.keyEvents, ...options.keyEvents };
		}
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		this.store.updateProperty([
			{
				id: this.currentId,
				property: COMMON_PROPERTIES.CURRENTLY_DRAWING,
				value: undefined,
			},
		]);

		const finishedId = this.currentId;

		this.currentCoordinate = 0;
		this.currentId = undefined;

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		this.onFinish(finishedId, { mode: this.mode, action: "draw" });
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setCursor(this.cursors.start);
	}

	/** @internal */
	stop() {
		this.cleanUp();
		this.setStopped();
		this.setCursor("unset");
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.mouseMove = true;
		this.setCursor(this.cursors.start);

		if (this.currentId === undefined || this.currentCoordinate === 0) {
			return;
		}

		const currentPolygonCoordinates = this.store.getGeometryCopy<Polygon>(
			this.currentId,
		).coordinates[0];

		let updatedCoordinates;

		if (this.currentCoordinate === 1) {
			// We must add a very small epsilon value so that Mapbox GL
			// renders the polygon - There might be a cleaner solution?
			const epsilon = 1 / Math.pow(10, this.coordinatePrecision - 1);
			const offset = Math.max(0.000001, epsilon);

			updatedCoordinates = [
				currentPolygonCoordinates[0],
				[event.lng, event.lat],
				[event.lng, event.lat - offset],
				currentPolygonCoordinates[0],
			];
		} else if (this.currentCoordinate === 2) {
			const firstCoordinate = currentPolygonCoordinates[0];
			const secondCoordinate = currentPolygonCoordinates[1];
			const midpoint = midpointCoordinate(
				firstCoordinate,
				secondCoordinate,
				this.coordinatePrecision,
				this.project,
				this.unproject,
			);

			const A = lngLatToWebMercatorXY(firstCoordinate[0], firstCoordinate[1]);
			const B = lngLatToWebMercatorXY(midpoint[0], midpoint[1]);
			const C = lngLatToWebMercatorXY(secondCoordinate[0], secondCoordinate[1]);
			const D = lngLatToWebMercatorXY(event.lng, event.lat);

			// Determine if the cursor is closer to A or C
			const distanceToA = cartesianDistance(D, A);
			const distanceToB = cartesianDistance(D, C);
			const ACloserThanC = distanceToA < distanceToB ? true : false;

			// We need to work out if the cursor is closer to A or C and then calculate the angle
			// between the cursor and the opposing midpoint
			const relativeAngle = calculateRelativeAngle(A, B, D);
			const theta = ACloserThanC
				? 90 - relativeAngle
				: calculateRelativeAngle(A, B, D) - 90;

			// We want to calculate the adjacent i.e. the calculated distance
			// between the cursor and the opposing midpoint
			const hypotenuse = cartesianDistance(B, D);
			const adjacent = Math.cos(degreesToRadians(theta)) * hypotenuse;

			// Calculate the bearing between the first and second point
			const firstAndSecondPointBearing = webMercatorBearing(A, C);

			// Determine which side of the line the cursor is on
			const side = determineHalfPlane(A, C, D);

			// Determine which direction to draw the rectangle
			const angle = side === "right" ? -90 : 90;

			// Calculate the third and fourth coordinates based on the cursor position
			const rectangleAngle = firstAndSecondPointBearing + angle;
			const thirdCoordinateXY = webMercatorDestination(
				A,
				adjacent,
				rectangleAngle,
			);
			const fourthCoordinateXY = webMercatorDestination(
				C,
				adjacent,
				rectangleAngle,
			);

			// Convert the third and fourth coordinates back to lng/lat
			const thirdCoordinate = webMercatorXYToLngLat(
				thirdCoordinateXY.x,
				thirdCoordinateXY.y,
			);
			const fourthCoordinate = webMercatorXYToLngLat(
				fourthCoordinateXY.x,
				fourthCoordinateXY.y,
			);

			// The final coordinates
			updatedCoordinates = [
				currentPolygonCoordinates[0],
				currentPolygonCoordinates[1],
				[
					limitPrecision(fourthCoordinate.lng, this.coordinatePrecision),
					limitPrecision(fourthCoordinate.lat, this.coordinatePrecision),
				],
				[
					limitPrecision(thirdCoordinate.lng, this.coordinatePrecision),
					limitPrecision(thirdCoordinate.lat, this.coordinatePrecision),
				],
				currentPolygonCoordinates[0],
			];
		}

		if (updatedCoordinates) {
			this.updatePolygonGeometry(
				this.currentId,
				updatedCoordinates,
				UpdateTypes.Provisional,
			);
		}
	}

	private updatePolygonGeometry(
		id: FeatureId,
		coordinates: Polygon["coordinates"][0],
		updateType: UpdateTypes,
	) {
		const updatedGeometry = {
			type: "Polygon",
			coordinates: [coordinates],
		} as Polygon;

		if (this.validate) {
			const validationResult = this.validate(
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
				return false;
			}
		}

		this.store.updateGeometry([{ id, geometry: updatedGeometry }]);

		return true;
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		if (
			(event.button === "right" &&
				this.allowPointerEvent(this.pointerEvents.rightClick, event)) ||
			(event.button === "left" &&
				this.allowPointerEvent(this.pointerEvents.leftClick, event)) ||
			(event.isContextMenu &&
				this.allowPointerEvent(this.pointerEvents.contextMenu, event))
		) {
			// We want pointer devices (mobile/tablet) to have
			// similar behaviour to mouse based devices so we
			// trigger a mousemove event before every click
			// if one has not been triggered to emulate this
			if (this.currentCoordinate > 0 && !this.mouseMove) {
				this.onMouseMove(event);
			}
			this.mouseMove = false;

			if (this.currentCoordinate === 0) {
				const [newId] = this.store.create([
					{
						geometry: {
							type: "Polygon",
							coordinates: [
								[
									[event.lng, event.lat],
									[event.lng, event.lat],
									[event.lng, event.lat],
									[event.lng, event.lat],
								],
							],
						},
						properties: {
							mode: this.mode,
							[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
						},
					},
				]);
				this.currentId = newId;
				this.currentCoordinate++;

				// Ensure the state is updated to reflect drawing has started
				this.setDrawing();
			} else if (this.currentCoordinate === 1 && this.currentId) {
				const currentPolygonGeometry = this.store.getGeometryCopy<Polygon>(
					this.currentId,
				);

				const previousCoordinate = currentPolygonGeometry.coordinates[0][0];
				const isIdentical = coordinatesIdentical(
					[event.lng, event.lat],
					previousCoordinate,
				);

				if (isIdentical) {
					return;
				}

				const updated = this.updatePolygonGeometry(
					this.currentId,
					[
						currentPolygonGeometry.coordinates[0][0],
						[event.lng, event.lat],
						[event.lng, event.lat],
						currentPolygonGeometry.coordinates[0][0],
					],
					UpdateTypes.Commit,
				);

				if (!updated) {
					return;
				}

				this.currentCoordinate++;
			} else if (this.currentCoordinate === 2 && this.currentId) {
				this.close();
			}
		}
	}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		} else if (event.key === this.keyEvents.finish) {
			// We don't want to close a unfinished polygon
			if (this.currentCoordinate < 2) {
				this.cleanUp();
				return;
			}
			this.close();
		}
	}

	/** @internal */
	onKeyDown() {}

	/** @internal */
	onDragStart() {}

	/** @internal */
	onDrag() {}

	/** @internal */
	onDragEnd() {}

	/** @internal */
	cleanUp() {
		try {
			if (this.currentId) {
				this.store.delete([this.currentId]);
			}
		} catch (error) {}
		this.currentId = undefined;
		this.currentCoordinate = 0;
		if (this.state === "drawing") {
			this.setStarted();
		}
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (feature.properties.mode === this.mode) {
			if (feature.geometry.type === "Polygon") {
				styles.polygonFillColor = this.getHexColorStylingValue(
					this.styles.fillColor,
					styles.polygonFillColor,
					feature,
				);

				styles.polygonOutlineColor = this.getHexColorStylingValue(
					this.styles.outlineColor,
					styles.polygonOutlineColor,
					feature,
				);

				styles.polygonOutlineWidth = this.getNumericStylingValue(
					this.styles.outlineWidth,
					styles.polygonOutlineWidth,
					feature,
				);

				styles.polygonFillOpacity = this.getNumericStylingValue(
					this.styles.fillOpacity,
					styles.polygonFillOpacity,
					feature,
				);

				styles.zIndex = Z_INDEX.LAYER_ONE;
			}
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidateNonIntersectingPolygonFeature(
				baseValidatedFeature,
				this.coordinatePrecision,
			),
		);
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures): void {
		// If we are in the middle of drawing a rectangle and the feature being updated is the current rectangle,
		// we need to reset the drawing state
		if (this.currentId === feature.id) {
			this.currentId = undefined;
			this.currentCoordinate = 0;
			if (this.state === "drawing") {
				this.setStarted();
			}
		}
	}
}
