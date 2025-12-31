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
	FinishActions,
	DrawInteractions,
	DrawType,
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
	ModeUpdateOptions,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { ValidateNonIntersectingPolygonFeature } from "../../validations/polygon.validation";
import { Polygon } from "geojson";
import { calculateWebMercatorDistortion } from "../../geometry/shape/web-mercator-distortion";
import { BehaviorConfig } from "../base.behavior";
import { MutateFeatureBehavior, Mutations } from "../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../read-feature.behavior";

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
	drawInteraction?: DrawInteractions;
}

export class TerraDrawCircleMode extends TerraDrawBaseDrawMode<CirclePolygonStyling> {
	mode = "circle";
	private center: Position | undefined;
	private endPosition: Position | undefined;

	private currentCircleId: FeatureId | undefined;
	private keyEvents: TerraDrawCircleModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private startingRadiusKilometers = 0.00001;
	private cursorMovedAfterInitialCursorDown = false;
	private drawInteraction = "click-move";
	private drawType: DrawType | undefined;

	// Behaviors
	private readFeature!: ReadFeatureBehavior;
	private mutateFeature!: MutateFeatureBehavior;

	/**
	 * Create a new circle mode instance
	 * @param options - Options to customize the behavior of the circle mode
	 * @param options.keyEvents - Key events to cancel or finish the mode
	 * @param options.cursors - Cursors to use for the mode
	 * @param options.styles - Custom styling for the circle
	 * @param options.pointerDistance - Distance in pixels to consider a pointer close to a vertex
	 * @param options.startingRadiusKilometers - The starting radius of the circle in kilometers
	 * @param options.projection - The map projection being used
	 * @param options.drawInteraction - The type of draw interaction to use
	 *
	 */
	constructor(options?: TerraDrawCircleModeOptions<CirclePolygonStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: ModeUpdateOptions<
			TerraDrawCircleModeOptions<CirclePolygonStyling>
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

		if (options?.startingRadiusKilometers) {
			this.startingRadiusKilometers = options.startingRadiusKilometers;
		}

		if (options?.drawInteraction) {
			this.drawInteraction = options.drawInteraction;
		}
	}

	private close() {
		if (this.currentCircleId === undefined || this.endPosition === undefined) {
			return;
		}

		const updated = this.updateCircle(this.endPosition, UpdateTypes.Finish);

		if (!updated) {
			return;
		}

		this.cursorMovedAfterInitialCursorDown = false;
		this.center = undefined;
		this.currentCircleId = undefined;
		this.drawType = undefined;

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}
	}

	private beginDrawing(
		event: TerraDrawMouseEvent,
		drawType: DrawType = "click",
	): void {
		this.center = [event.lng, event.lat];
		this.endPosition = [event.lng, event.lat];

		const startingCircle = circle({
			center: this.center,
			radiusKilometers: this.startingRadiusKilometers,
			coordinatePrecision: this.coordinatePrecision,
		});

		const created = this.mutateFeature.createPolygon({
			coordinates: startingCircle.geometry.coordinates[0],
			properties: {
				mode: this.mode,
				radiusKilometers: this.startingRadiusKilometers,
				[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
			},
		});

		if (!created) {
			return;
		}

		this.currentCircleId = created.id;
		this.cursorMovedAfterInitialCursorDown = false;
		this.drawType = drawType;
		this.setDrawing();
	}

	private dragDrawAllowed() {
		return (
			this.drawInteraction === "click-drag" ||
			this.drawInteraction === "click-move-or-drag"
		);
	}

	private moveDrawAllowed() {
		return (
			this.drawInteraction === "click-move" ||
			this.drawInteraction === "click-move-or-drag"
		);
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
			this.moveDrawAllowed() &&
			((event.button === "right" &&
				this.allowPointerEvent(this.pointerEvents.rightClick, event)) ||
				(event.button === "left" &&
					this.allowPointerEvent(this.pointerEvents.leftClick, event)) ||
				(event.isContextMenu &&
					this.allowPointerEvent(this.pointerEvents.contextMenu, event)))
		) {
			if (!this.center) {
				this.beginDrawing(event);
			} else if (this.center && this.currentCircleId !== undefined) {
				this.endPosition = [event.lng, event.lat];

				// Finish drawing
				this.close();
			}
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.cursorMovedAfterInitialCursorDown = true;
		this.endPosition = [event.lng, event.lat];
		this.updateCircle(this.endPosition, UpdateTypes.Provisional);
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
	onDragStart(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (this.state === "drawing") {
			return;
		}

		if (
			this.allowPointerEvent(this.pointerEvents.onDragStart, event) &&
			this.dragDrawAllowed()
		) {
			this.beginDrawing(event, "drag");
			setMapDraggability(false);
		}
	}

	/** @internal */
	onDrag(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (
			this.allowPointerEvent(this.pointerEvents.onDrag, event) &&
			this.dragDrawAllowed() &&
			this.drawType === "drag"
		) {
			this.cursorMovedAfterInitialCursorDown = true;
			this.endPosition = [event.lng, event.lat];
			this.updateCircle(this.endPosition, UpdateTypes.Provisional);
		}
	}

	/** @internal */
	onDragEnd(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (
			this.allowPointerEvent(this.pointerEvents.onDragEnd, event) &&
			this.dragDrawAllowed() &&
			this.drawType === "drag"
		) {
			this.endPosition = [event.lng, event.lat];
			// Finish drawing
			this.close();
			setMapDraggability(true);
		}
	}

	/** @internal */
	cleanUp() {
		const currentId = this.currentCircleId;

		this.center = undefined;
		this.currentCircleId = undefined;
		this.drawType = undefined;

		if (this.state === "drawing") {
			this.setStarted();
		}

		this.mutateFeature.deleteFeatureIfPresent(currentId);
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

	private updateCircle(endPosition: Position, updateType: UpdateTypes) {
		if (this.currentCircleId === undefined || this.center === undefined) {
			return;
		}

		const isFinish = updateType === UpdateTypes.Finish;

		let updatedCircle: Feature<Polygon> | undefined;
		let newRadius: number | undefined;

		if (this.cursorMovedAfterInitialCursorDown) {
			newRadius = haversineDistanceKilometers(this.center, endPosition);

			if (this.projection === "web-mercator") {
				// We want to track the mouse cursor, but we need to adjust the radius based
				// on the distortion of the web mercator projection
				const distortion = calculateWebMercatorDistortion(
					this.center,
					endPosition,
				);

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
		}

		const propertyMutations: {
			radiusKilometers?: number;
			[COMMON_PROPERTIES.CURRENTLY_DRAWING]?: boolean;
		} = {};

		if (updatedCircle && newRadius) {
			propertyMutations.radiusKilometers = newRadius;
		}

		if (isFinish) {
			propertyMutations[COMMON_PROPERTIES.CURRENTLY_DRAWING] = undefined;
		}

		return this.mutateFeature.updatePolygon({
			featureId: this.currentCircleId,
			coordinateMutations: updatedCircle
				? {
						type: Mutations.Replace,
						coordinates: updatedCircle.geometry.coordinates,
					}
				: undefined,
			propertyMutations,
			context: isFinish
				? {
						updateType,
						action: FinishActions.Draw,
					}
				: { updateType },
		});
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures): void {
		// If we are in the middle of drawing a circle and the feature being updated is the current circle,
		// we need to reset the drawing state
		if (this.currentCircleId === feature.id) {
			this.cursorMovedAfterInitialCursorDown = false;
			this.center = undefined;
			this.currentCircleId = undefined;
			this.drawType = undefined;
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
