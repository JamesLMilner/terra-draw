import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
} from "../../common";
import { LineString, Point, Polygon, Position } from "geojson";
import {
	TerraDrawBaseDrawMode,
	BaseModeOptions,
	CustomStyling,
} from "../base.mode";
// import { coordinatesIdentical } from "../../geometry/coordinates-identical";
import { getDefaultStyling } from "../../util/styling";
import { FeatureId, GeoJSONStoreFeatures } from "../../store/store";
import { ValidatePolygonFeature } from "../../validations/polygon.validation";
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
import { determineHalfPlane } from "../../geometry/determine-halfplane";
// import { getMidPointCoordinates } from "../../geometry/get-midpoints";
// import { midpointCoordinate } from "../../geometry/midpoint-coordinate";
// import { midpointCoordinate } from "../../geometry/midpoint-coordinate";

type TerraDrawSectorModeKeyEvents = {
	cancel?: KeyboardEvent["key"] | null;
	finish?: KeyboardEvent["key"] | null;
};

type SectorPolygonStyling = {
	centerColor: HexColorStyling;
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

export class TerraDrawSensorMode extends TerraDrawBaseDrawMode<SectorPolygonStyling> {
	mode = "sensor";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private currentInitialArcId: FeatureId | undefined;
	private currentStartingPointId: FeatureId | undefined;
	private keyEvents: TerraDrawSectorModeKeyEvents;
	private innerDirection: "clockwise" | "anticlockwise" | undefined;
	private outerDirection: "clockwise" | "anticlockwise" | undefined;
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
		if (this.currentStartingPointId === undefined) {
			return;
		}

		const finishedCurrentStartingPointId = this.currentStartingPointId;
		const finishedInitialArcId = this.currentInitialArcId;
		const finishedCurrentId = this.currentId;

		if (finishedCurrentStartingPointId) {
			this.store.delete([finishedCurrentStartingPointId]);
		}

		if (finishedInitialArcId) {
			this.store.delete([finishedInitialArcId]);
		}

		this.currentCoordinate = 0;
		this.currentStartingPointId = undefined;
		this.currentInitialArcId = undefined;
		this.currentId = undefined;
		this.innerDirection = undefined;
		this.outerDirection = undefined;

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		if (finishedCurrentId) {
			this.onFinish(finishedCurrentId, { mode: this.mode, action: "draw" });
		}
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

		if (
			this.currentInitialArcId === undefined ||
			this.currentStartingPointId === undefined ||
			this.currentCoordinate === 0
		) {
			return;
		}

		// let updatedCoordinates: Position[] | undefined;

		// console.log('this.currentCoordinate', this.currentCoordinate);

		if (this.currentCoordinate === 2) {
			const currentPolygonCoordinates = this.store.getGeometryCopy<LineString>(
				this.currentInitialArcId,
			).coordinates;
			const center = this.store.getGeometryCopy<Point>(
				this.currentStartingPointId,
			).coordinates;

			const arcCoordOne = currentPolygonCoordinates[0];
			const arcCoordTwo = [event.lng, event.lat];

			const webMercatorArcCoordOne = lngLatToWebMercatorXY(
				arcCoordOne[0],
				arcCoordOne[1],
			);
			const webMercatorArcCoordTwo = lngLatToWebMercatorXY(
				arcCoordTwo[0],
				arcCoordTwo[1],
			);
			const webMercatorCenter = lngLatToWebMercatorXY(center[0], center[1]);

			const radius = cartesianDistance(
				webMercatorCenter,
				webMercatorArcCoordOne,
			);

			// We want to determine the direction of the sector, whether
			// it is clockwise or anticlockwise
			if (this.innerDirection === undefined) {
				const clockwise = isClockwiseWebMercator(
					webMercatorCenter,
					webMercatorArcCoordOne,
					webMercatorArcCoordTwo,
				);
				this.innerDirection = clockwise ? "clockwise" : "anticlockwise";
			}

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
			const coordinates: Position[] = [arcCoordOne];

			// Corrected version to calculate deltaBearing
			const normalizedStart = normalizeBearing(startBearing);
			const normalizedEnd = normalizeBearing(endBearing);

			// Calculate the delta bearing based on the direction
			let deltaBearing;
			if (this.innerDirection === "anticlockwise") {
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
				((this.innerDirection === "anticlockwise" ? 1 : -1) * deltaBearing) /
				numberOfPoints;

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

			this.updateLineStringGeometry(
				this.currentInitialArcId,
				coordinates,
				UpdateTypes.Provisional,
			);
		} else if (this.currentCoordinate === 3) {
			console.log("this.currentCoordinate", this.currentCoordinate);
			const coordinates = this.store.getGeometryCopy<LineString>(
				this.currentInitialArcId,
			).coordinates;

			if (coordinates.length < 2) {
				// TODO: This should not happen, but we should handle it
				console.error("this should not happen?");
				return;
			}

			const center = this.store.getGeometryCopy<Point>(
				this.currentStartingPointId,
			).coordinates;

			const firstCoord = coordinates[0];
			const lastCoord = coordinates[coordinates.length - 1];
			const midpoint = coordinates[Math.floor(this.arcPoints / 2)];

			const webMercatorCursor = lngLatToWebMercatorXY(event.lng, event.lat);
			const webMercatorCoordOne = lngLatToWebMercatorXY(
				firstCoord[0],
				firstCoord[1],
			);
			const webMercatorCoordTwo = lngLatToWebMercatorXY(
				lastCoord[0],
				lastCoord[1],
			);
			const webMercatorMidpoint = lngLatToWebMercatorXY(
				midpoint[0],
				midpoint[1],
			);
			const webMercatorCenter = lngLatToWebMercatorXY(center[0], center[1]);

			const innerRadius = cartesianDistance(
				webMercatorCenter,
				webMercatorCoordOne,
			);
			const outerRadius = cartesianDistance(
				webMercatorCenter,
				webMercatorCursor,
			);

			// Determine which side of the line the cursor is on
			const side = determineHalfPlane(
				webMercatorCursor,
				webMercatorCoordTwo,
				webMercatorCoordOne,
			);

			console.log({ side, outerDirection: this.outerDirection });

			if (
				outerRadius < innerRadius ||
				(side === "right" && this.outerDirection === "anticlockwise") ||
				(side === "left" && this.outerDirection === "clockwise")
			) {
				return;
			}

			const distance = cartesianDistance(
				webMercatorMidpoint,
				webMercatorCursor,
			);

			const fullDistance = cartesianDistance(
				webMercatorCenter,
				webMercatorCursor,
			);

			console.log({ fullDistance, distance, innerRadius, outerRadius });

			const bearing = webMercatorBearing(
				webMercatorCenter,
				webMercatorCoordOne,
			);
			const nextCoord = webMercatorDestination(
				webMercatorCoordOne,
				distance,
				bearing,
			);

			const bearingTwo = webMercatorBearing(
				webMercatorCenter,
				webMercatorCoordTwo,
			);
			const finalCoord = webMercatorDestination(
				webMercatorCoordTwo,
				distance,
				bearingTwo,
			);

			// We want to determine the direction of the sector, whether
			// it is clockwise or anticlockwise
			if (this.outerDirection === undefined) {
				const clockwise = isClockwiseWebMercator(
					webMercatorCenter,
					nextCoord,
					finalCoord,
				);
				this.outerDirection = clockwise ? "clockwise" : "anticlockwise";
			}

			// Calculate bearings for the second and third points in Web Mercator
			const startBearing = webMercatorBearing(webMercatorCenter, nextCoord);
			const endBearing = webMercatorBearing(webMercatorCenter, finalCoord);

			// Generate points along the arc in Web Mercator
			const numberOfPoints = this.arcPoints; // Number of points to approximate the arc

			// Corrected version to calculate deltaBearing
			const normalizedStart = normalizeBearing(startBearing);
			const normalizedEnd = normalizeBearing(endBearing);

			// Calculate the delta bearing based on the direction
			let deltaBearing;
			if (this.outerDirection === "anticlockwise") {
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

			console.log({ deltaBearing });

			const bearingStep =
				((this.outerDirection === "anticlockwise" ? 1 : -1) * deltaBearing) /
				numberOfPoints;

			// Add all the arc points
			const finalArc = [];
			for (let i = 0; i <= numberOfPoints; i++) {
				const currentBearing = normalizedStart + i * bearingStep;
				const pointOnArc = webMercatorDestination(
					webMercatorCenter,
					fullDistance,
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
					finalArc.push(nextCoord);
				}
			}

			finalArc.reverse();

			coordinates.push(...finalArc);

			// coordinates.push([lng, lat]);
			coordinates.push(coordinates[0]);

			if (!this.currentId) {
				[this.currentId] = this.store.create([
					{
						geometry: {
							type: "Polygon",
							coordinates: [coordinates],
						},
						properties: { mode: this.mode },
					},
				]);
			} else {
				this.updatePolygonGeometry(
					this.currentId,
					coordinates,
					UpdateTypes.Provisional,
				);
			}
		}
	}

	private updateLineStringGeometry(
		id: FeatureId,
		coordinates: LineString["coordinates"],
		updateType: UpdateTypes,
	) {
		const updatedGeometry = {
			type: "LineString",
			coordinates,
		} as LineString;

		if (this.validate) {
			const valid = this.validate(
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

			if (!valid) {
				return false;
			}
		}

		this.store.updateGeometry([{ id, geometry: updatedGeometry }]);

		return true;
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
			const valid = this.validate(
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

			if (!valid) {
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
		// if one has not been trigged to emulate this
		if (this.currentCoordinate > 0 && !this.mouseMove) {
			this.onMouseMove(event);
		}
		this.mouseMove = false;

		if (this.currentCoordinate === 0) {
			const [newId] = this.store.create([
				{
					geometry: { type: "Point", coordinates: [event.lng, event.lat] },
					properties: { mode: this.mode },
				},
			]);
			this.currentStartingPointId = newId;
			this.currentCoordinate++;

			// Ensure the state is updated to reflect drawing has started
			this.setDrawing();
		} else if (this.currentCoordinate === 1 && this.currentStartingPointId) {
			const [newId] = this.store.create([
				{
					geometry: {
						type: "LineString",
						coordinates: [
							[event.lng, event.lat],
							[event.lng, event.lat],
						],
					},
					properties: { mode: this.mode },
				},
			]);
			this.currentInitialArcId = newId;
			this.currentCoordinate++;
		} else if (this.currentCoordinate === 2 && this.currentStartingPointId) {
			this.currentCoordinate++;
			// pass
		} else if (this.currentCoordinate === 3 && this.currentStartingPointId) {
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
			if (this.currentStartingPointId) {
				this.store.delete([this.currentStartingPointId]);
			}
			if (this.currentInitialArcId) {
				this.store.delete([this.currentInitialArcId]);
			}
			if (this.currentId) {
				this.store.delete([this.currentId]);
			}
		} catch (error) {}
		this.currentStartingPointId = undefined;
		this.innerDirection = undefined;
		this.outerDirection = undefined;
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

				styles.zIndex = 10;
			} else if (feature.geometry.type === "Point") {
				styles.pointColor = this.getHexColorStylingValue(
					this.styles.centerColor,
					styles.pointColor,
					feature,
				);

				styles.zIndex = 20;
			}
		}

		return styles;
	}

	validateFeature(feature: unknown): feature is GeoJSONStoreFeatures {
		if (super.validateFeature(feature)) {
			return (
				feature.properties.mode === this.mode &&
				ValidatePolygonFeature(feature, this.coordinatePrecision)
			);
		} else {
			return false;
		}
	}
}
