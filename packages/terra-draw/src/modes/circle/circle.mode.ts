import { Feature, Position } from "geojson";
import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	Projection,
	Z_INDEX,
	COMMON_PROPERTIES,
} from "../../common";
import { haversineDistanceKilometers } from "../../geometry/measure/haversine-distance";
import { circle, circleWebMercator } from "../../geometry/shape/create-circle";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { ValidateNonIntersectingPolygonFeature } from "../../validations/polygon.validation";
import { Polygon } from "geojson";
import { calculateWebMercatorDistortion } from "../../geometry/shape/web-mercator-distortion";

type TerraDrawCircleModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };

type CirclePolygonStyling = {
	fillColor: HexColorStyling;
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	fillOpacity: NumericStyling;
};

interface Cursors {
	start?: Cursor;
}

const defaultCursors = {
	start: "crosshair",
} as Required<Cursors>;

interface TerraDrawCircleModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	keyEvents?: TerraDrawCircleModeKeyEvents | null;
	cursors?: Cursors;
	startingRadiusKilometers?: number;
	projection?: Projection;
}

export class TerraDrawCircleMode extends TerraDrawBaseDrawMode<CirclePolygonStyling> {
	mode = "circle";
	private center: Position | undefined;
	private clickCount = 0;
	private currentCircleId: FeatureId | undefined;
	private keyEvents: TerraDrawCircleModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private startingRadiusKilometers = 0.00001;
	private cursorMovedAfterInitialCursorDown = false;

	/**
	 * Create a new circle mode instance
	 * @param options - Options to customize the behavior of the circle mode
	 * @param options.keyEvents - Key events to cancel or finish the mode
	 * @param options.cursors - Cursors to use for the mode
	 * @param options.styles - Custom styling for the circle
	 * @param options.pointerDistance - Distance in pixels to consider a pointer close to a vertex
	 */
	constructor(options?: TerraDrawCircleModeOptions<CirclePolygonStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: TerraDrawCircleModeOptions<CirclePolygonStyling>,
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

		if (options?.startingRadiusKilometers) {
			this.startingRadiusKilometers = options.startingRadiusKilometers;
		}
	}

	private close() {
		if (this.currentCircleId === undefined) {
			return;
		}

		this.store.updateProperty([
			{
				id: this.currentCircleId,
				property: COMMON_PROPERTIES.CURRENTLY_DRAWING,
				value: undefined,
			},
		]);

		const finishedId = this.currentCircleId;

		if (this.validate && finishedId) {
			const currentGeometry = this.store.getGeometryCopy<Polygon>(finishedId);

			const validationResult = this.validate(
				{
					type: "Feature",
					id: finishedId,
					geometry: currentGeometry,
					properties: {},
				},
				{
					project: this.project,
					unproject: this.unproject,
					coordinatePrecision: this.coordinatePrecision,
					updateType: UpdateTypes.Finish,
				},
			);

			if (!validationResult.valid) {
				return;
			}
		}

		this.cursorMovedAfterInitialCursorDown = false;
		this.center = undefined;
		this.currentCircleId = undefined;
		this.clickCount = 0;
		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		// Ensure that any listerers are triggered with the main created geometry
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
	onClick(event: TerraDrawMouseEvent) {
		if (
			(event.button === "right" &&
				this.allowPointerEvent(this.pointerEvents.rightClick, event)) ||
			(event.button === "left" &&
				this.allowPointerEvent(this.pointerEvents.leftClick, event)) ||
			(event.isContextMenu &&
				this.allowPointerEvent(this.pointerEvents.contextMenu, event))
		) {
			if (this.clickCount === 0) {
				this.center = [event.lng, event.lat];
				const startingCircle = circle({
					center: this.center,
					radiusKilometers: this.startingRadiusKilometers,
					coordinatePrecision: this.coordinatePrecision,
				});

				const [createdId] = this.store.create([
					{
						geometry: startingCircle.geometry,
						properties: {
							mode: this.mode,
							radiusKilometers: this.startingRadiusKilometers,
							[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
						},
					},
				]);
				this.currentCircleId = createdId;
				this.clickCount++;
				this.cursorMovedAfterInitialCursorDown = false;
				this.setDrawing();
			} else {
				if (
					this.clickCount === 1 &&
					this.center &&
					this.currentCircleId !== undefined &&
					this.cursorMovedAfterInitialCursorDown
				) {
					this.updateCircle(event);
				}

				// Finish drawing
				this.close();
			}
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.cursorMovedAfterInitialCursorDown = true;
		this.updateCircle(event);
	}

	/** @internal */
	onKeyDown() {}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		} else if (event.key === this.keyEvents.finish) {
			this.close();
		}
	}

	/** @internal */
	onDragStart() {}

	/** @internal */
	onDrag() {}

	/** @internal */
	onDragEnd() {}

	/** @internal */
	cleanUp() {
		const cleanUpId = this.currentCircleId;

		this.center = undefined;
		this.currentCircleId = undefined;
		this.clickCount = 0;
		if (this.state === "drawing") {
			this.setStarted();
		}

		try {
			if (cleanUpId !== undefined) {
				this.store.delete([cleanUpId]);
			}
		} catch {}
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.type === "Feature" &&
			feature.geometry.type === "Polygon" &&
			feature.properties.mode === this.mode
		) {
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

			return styles;
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

	private updateCircle(event: TerraDrawMouseEvent) {
		if (this.clickCount === 1 && this.center && this.currentCircleId) {
			const newRadius = haversineDistanceKilometers(this.center, [
				event.lng,
				event.lat,
			]);

			let updatedCircle: Feature<Polygon>;

			if (this.projection === "web-mercator") {
				// We want to track the mouse cursor, but we need to adjust the radius based
				// on the distortion of the web mercator projection
				const distortion = calculateWebMercatorDistortion(this.center, [
					event.lng,
					event.lat,
				]);

				updatedCircle = circleWebMercator({
					center: this.center,
					radiusKilometers: newRadius * distortion,
					coordinatePrecision: this.coordinatePrecision,
				});
			} else if (this.projection === "globe") {
				updatedCircle = circle({
					center: this.center,
					radiusKilometers: newRadius,
					coordinatePrecision: this.coordinatePrecision,
				});
			} else {
				throw new Error("Invalid projection");
			}

			if (this.validate) {
				const valid = this.validate(
					{
						type: "Feature",
						id: this.currentCircleId,
						geometry: updatedCircle.geometry,
						properties: {
							radiusKilometers: newRadius,
						},
					},
					{
						project: this.project,
						unproject: this.unproject,
						coordinatePrecision: this.coordinatePrecision,
						updateType: UpdateTypes.Provisional,
					},
				);

				if (!valid.valid) {
					return;
				}
			}

			this.store.updateGeometry([
				{ id: this.currentCircleId, geometry: updatedCircle.geometry },
			]);
			this.store.updateProperty([
				{
					id: this.currentCircleId,
					property: "radiusKilometers",
					value: newRadius,
				},
			]);
		}
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures): void {
		// If we are in the middle of drawing a circle and the feature being updated is the current circle,
		// we need to reset the drawing state
		if (this.currentCircleId === feature.id) {
			this.cursorMovedAfterInitialCursorDown = false;
			this.center = undefined;
			this.currentCircleId = undefined;
			this.clickCount = 0;
			if (this.state === "drawing") {
				this.setStarted();
			}
		}
	}
}
