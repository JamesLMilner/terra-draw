import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
} from "../../common";
import { Polygon, Position } from "geojson";
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
import {
	normalizeBearing,
	webMercatorBearing,
} from "../../geometry/measure/bearing";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../../geometry/project/web-mercator";
import { cartesianDistance } from "../../geometry/measure/pixel-distance";
import { isClockwiseWebMercator } from "../../geometry/clockwise";
import { limitPrecision } from "../../geometry/limit-decimal-precision";

type TerraDrawSectorModeKeyEvents = {
	cancel?: KeyboardEvent["key"] | null;
	finish?: KeyboardEvent["key"] | null;
};

type SectorPolygonStyling = {
	fillColor: HexColorStyling;
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	fillOpacity: NumericStyling;
};

interface Cursors {
	start?: Cursor;
	close?: Cursor;
}

interface TerraDrawSectorModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	arcPoints?: number;
	pointerDistance?: number;
	keyEvents?: TerraDrawSectorModeKeyEvents | null;
	cursors?: Cursors;
}

export class TerraDrawSectorMode extends TerraDrawBaseDrawMode<SectorPolygonStyling> {
	mode = "sector";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private keyEvents: TerraDrawSectorModeKeyEvents;
	private direction: "clockwise" | "anticlockwise" | undefined;
	private arcPoints: number;

	// Behaviors
	private cursors: Required<Cursors>;
	private mouseMove = false;

	constructor(options?: TerraDrawSectorModeOptions<SectorPolygonStyling>) {
		super(options);

		const defaultCursors = {
			start: "crosshair",
			close: "pointer",
		} as Required<Cursors>;

		if (options && options.cursors) {
			this.cursors = { ...defaultCursors, ...options.cursors };
		} else {
			this.cursors = defaultCursors;
		}

		// We want to have some defaults, but also allow key bindings
		// to be explicitly turned off
		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else {
			const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };
			this.keyEvents =
				options && options.keyEvents
					? { ...defaultKeyEvents, ...options.keyEvents }
					: defaultKeyEvents;
		}

		this.arcPoints = options?.arcPoints || 64;
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		const finishedId = this.currentId;

		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.direction = undefined;

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
			const center = currentPolygonCoordinates[0];
			const arcCoordOne = currentPolygonCoordinates[1];
			const arcCoordTwo = [event.lng, event.lat];

			// Convert coordinates to Web Mercator
			const webMercatorCenter = lngLatToWebMercatorXY(center[0], center[1]);
			const webMercatorArcCoordOne = lngLatToWebMercatorXY(
				arcCoordOne[0],
				arcCoordOne[1],
			);
			const webMercatorArcCoordTwo = lngLatToWebMercatorXY(
				arcCoordTwo[0],
				arcCoordTwo[1],
			);

			// We want to determine the direction of the sector, whether
			// it is clockwise or anticlockwise
			if (this.direction === undefined) {
				const clockwise = isClockwiseWebMercator(
					webMercatorCenter,
					webMercatorArcCoordOne,
					webMercatorArcCoordTwo,
				);
				this.direction = clockwise ? "clockwise" : "anticlockwise";
			}

			// Calculate the radius (distance from center to second point in Web Mercator)
			const radius = cartesianDistance(
				webMercatorCenter,
				webMercatorArcCoordOne,
			);

			// Calculate bearings for the second and third points in Web Mercator
			const startBearing = webMercatorBearing(
				webMercatorCenter,
				webMercatorArcCoordOne,
			);
			const endBearing = webMercatorBearing(
				webMercatorCenter,
				webMercatorArcCoordTwo,
			);

			// Generate points along the arc in Web Mercator
			const numberOfPoints = this.arcPoints; // Number of points to approximate the arc
			const coordinates: Position[] = [center]; // Start with the center (in WGS84)

			// Corrected version to calculate deltaBearing
			const normalizedStart = normalizeBearing(startBearing);
			const normalizedEnd = normalizeBearing(endBearing);

			// Calculate the delta bearing based on the direction
			let deltaBearing;
			if (this.direction === "anticlockwise") {
				deltaBearing = normalizedEnd - normalizedStart;
				if (deltaBearing < 0) {
					deltaBearing += 360; // Adjust for wrap-around
				}
			} else {
				deltaBearing = normalizedStart - normalizedEnd;
				if (deltaBearing < 0) {
					deltaBearing += 360; // Adjust for wrap-around
				}
			}

			const bearingStep =
				((this.direction === "anticlockwise" ? 1 : -1) * deltaBearing) /
				numberOfPoints;

			// Add the first coordinate to the polygon
			coordinates.push(arcCoordOne);

			// Add all the arc points
			for (let i = 0; i <= numberOfPoints; i++) {
				const currentBearing = normalizedStart + i * bearingStep;
				const pointOnArc = webMercatorDestination(
					webMercatorCenter,
					radius,
					currentBearing,
				);
				const { lng, lat } = webMercatorXYToLngLat(pointOnArc.x, pointOnArc.y);

				const nextCoord = [
					limitPrecision(lng, this.coordinatePrecision),
					limitPrecision(lat, this.coordinatePrecision),
				];

				const notIdentical =
					nextCoord[0] !== coordinates[coordinates.length - 1][0] &&
					nextCoord[1] !== coordinates[coordinates.length - 1][1];
				if (notIdentical) {
					coordinates.push(nextCoord);
				}
			}

			// Close the polygon
			coordinates.push(center);

			updatedCoordinates = [...coordinates];
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
					properties: { mode: this.mode },
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

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		} else if (event.key === this.keyEvents.finish) {
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
		this.direction = undefined;
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

				styles.zIndex = 10;
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
}
