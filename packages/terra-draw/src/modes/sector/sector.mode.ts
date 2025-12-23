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
import { Polygon, Position } from "geojson";
import {
	TerraDrawBaseDrawMode,
	BaseModeOptions,
	CustomStyling,
	ModeUpdateOptions,
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
import { BehaviorConfig } from "../base.behavior";
import { ReadFeatureBehavior } from "../read-feature.behavior";
import {
	CoordinateMutation,
	MutateFeatureBehavior,
	Mutations,
	ReplaceMutation,
} from "../mutate-feature.behavior";

type TerraDrawSectorModeKeyEvents = {
	cancel?: KeyboardEvent["key"] | null;
	finish?: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };

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

const defaultCursors = {
	start: "crosshair",
	close: "pointer",
} as Required<Cursors>;

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
	private keyEvents: TerraDrawSectorModeKeyEvents = defaultKeyEvents;
	private direction: "clockwise" | "anticlockwise" | undefined;
	private arcPoints: number = 64;
	private cursors: Required<Cursors> = defaultCursors;
	private mouseMove = false;

	// Behaviors
	private readFeature!: ReadFeatureBehavior;
	private mutateFeature!: MutateFeatureBehavior;

	constructor(options?: TerraDrawSectorModeOptions<SectorPolygonStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: ModeUpdateOptions<
			TerraDrawSectorModeOptions<SectorPolygonStyling>
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

		if (options?.arcPoints) {
			this.arcPoints = options.arcPoints;
		}
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		const updated = this.mutateFeature.updatePolygon({
			featureId: this.currentId,
			propertyMutations: {
				[COMMON_PROPERTIES.CURRENTLY_DRAWING]: undefined,
			},
			coordinateMutations: {
				// Trigger right-hand rule enforcement
				coordinates: this.readFeature.getGeometry<Polygon>(this.currentId)
					.coordinates,
				type: Mutations.Replace,
			},
			context: {
				updateType: UpdateTypes.Finish,
				action: "draw",
			},
		});

		if (!updated) {
			return;
		}

		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.direction = undefined;

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}
	}

	private getSectorCoordinates(event: TerraDrawMouseEvent) {
		const currentPolygonCoordinates = this.readFeature.getCoordinates<Polygon>(
			this.currentId!,
		);
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
		const radius = cartesianDistance(webMercatorCenter, webMercatorArcCoordOne);

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

		return coordinates;
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

		let mutations: CoordinateMutation[] | ReplaceMutation<Polygon>;

		if (this.currentCoordinate === 1) {
			// We must add a very small epsilon value so that Mapbox GL
			// renders the polygon - There might be a cleaner solution?
			const offset = this.mutateFeature.epsilonOffset();

			mutations = [
				{
					type: Mutations.Update,
					index: 1,
					coordinate: [event.lng, event.lat],
				},
				{
					type: Mutations.Update,
					index: 2,
					coordinate: [event.lng, event.lat - offset],
				},
			];
		} else if (this.currentCoordinate === 2) {
			const sectorCoordinates = this.getSectorCoordinates(event);
			if (!sectorCoordinates) {
				return;
			}
			mutations = {
				type: Mutations.Replace,
				coordinates: [sectorCoordinates],
			};
		} else {
			return;
		}

		this.mutateFeature.updatePolygon({
			featureId: this.currentId,
			coordinateMutations: mutations,
			context: {
				updateType: UpdateTypes.Provisional,
			},
		});
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
				const created = this.mutateFeature.createPolygon({
					coordinates: [
						[event.lng, event.lat],
						[event.lng, event.lat],
						[event.lng, event.lat],
						[event.lng, event.lat],
					],
					properties: {
						mode: this.mode,
						[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
					},
				});
				this.currentId = created?.id;
				this.currentCoordinate++;

				// Ensure the state is updated to reflect drawing has started
				this.setDrawing();
			} else if (this.currentCoordinate === 1 && this.currentId) {
				const isIdentical = this.readFeature.coordinateAtIndexIsIdentical({
					featureId: this.currentId,
					index: 0,
					newCoordinate: [event.lng, event.lat],
				});

				if (isIdentical) {
					return;
				}

				const updated = this.mutateFeature.updatePolygon({
					featureId: this.currentId,
					coordinateMutations: [
						{
							type: Mutations.Update,
							index: 1,
							coordinate: [event.lng, event.lat],
						},
						{
							type: Mutations.Update,
							index: 2,
							coordinate: [event.lng, event.lat],
						},
					],
					context: {
						updateType: UpdateTypes.Provisional,
					},
				});

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
			this.close();
		}
	}

	/** @internal */
	onKeyDown() {
		// no-op
	}

	/** @internal */
	onDragStart() {
		// no-op
	}

	/** @internal */
	onDrag() {
		// no-op
	}

	/** @internal */
	onDragEnd() {
		// no-op
	}

	/** @internal */
	cleanUp() {
		try {
			if (this.currentId) {
				this.mutateFeature.deleteFeature(this.currentId);
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
		// If we are in the middle of drawing a sector and the feature being updated is the current sector,
		// we need to reset the drawing state
		if (this.currentId === feature.id) {
			this.currentId = undefined;
			this.direction = undefined;
			this.currentCoordinate = 0;
			if (this.state === "drawing") {
				this.setStarted();
			}
		}
	}

	registerBehaviors(config: BehaviorConfig) {
		this.readFeature = new ReadFeatureBehavior(config);
		this.mutateFeature = new MutateFeatureBehavior(config, {
			validate: this.validate,
			onFinish: (featureId, context) => {
				this.onFinish(featureId, {
					mode: this.mode,
					action: context.action,
				});
			},
		});
	}
}
