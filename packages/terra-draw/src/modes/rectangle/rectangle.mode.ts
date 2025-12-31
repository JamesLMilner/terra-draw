import { Position } from "geojson";
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
	FinishActions,
	DrawInteractions,
	DrawType,
} from "../../common";
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
import { BehaviorConfig } from "../base.behavior";
import { MutateFeatureBehavior, Mutations } from "../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../read-feature.behavior";

type TerraDrawRectangleModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };

type RectanglePolygonStyling = {
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

interface TerraDrawRectangleModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	keyEvents?: TerraDrawRectangleModeKeyEvents | null;
	cursors?: Cursors;
	drawInteraction?: DrawInteractions;
}

export class TerraDrawRectangleMode extends TerraDrawBaseDrawMode<RectanglePolygonStyling> {
	mode = "rectangle";
	private startPosition: Position | undefined;
	private endPosition: Position | undefined;
	private currentRectangleId: FeatureId | undefined;
	private keyEvents: TerraDrawRectangleModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private drawInteraction = "click-move";
	private drawType: DrawType | undefined;

	// Behaviors
	private mutateFeature!: MutateFeatureBehavior;
	private readFeature!: ReadFeatureBehavior;

	constructor(
		options?: TerraDrawRectangleModeOptions<RectanglePolygonStyling>,
	) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: ModeUpdateOptions<
			TerraDrawRectangleModeOptions<RectanglePolygonStyling>
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

		if (options?.drawInteraction) {
			this.drawInteraction = options.drawInteraction;
		}
	}

	private updateRectangle(endPosition: Position, updateType: UpdateTypes) {
		if (!this.startPosition || !this.currentRectangleId) {
			return;
		}

		const isFinish = updateType === UpdateTypes.Finish;

		return this.mutateFeature.updatePolygon({
			featureId: this.currentRectangleId,
			coordinateMutations: [
				{
					type: Mutations.Update,
					index: 1,
					coordinate: [endPosition[0], this.startPosition[1]],
				},
				{
					type: Mutations.Update,
					index: 2,
					coordinate: endPosition,
				},
				{
					type: Mutations.Update,
					index: 3,
					coordinate: [this.startPosition[0], endPosition[1]],
				},
			],
			propertyMutations: isFinish
				? {
						[COMMON_PROPERTIES.CURRENTLY_DRAWING]: undefined,
					}
				: {},
			context: isFinish
				? {
						updateType,
						action: FinishActions.Draw,
					}
				: { updateType },
		});
	}

	private close() {
		if (!this.endPosition) {
			return;
		}

		const updated = this.updateRectangle(this.endPosition, UpdateTypes.Finish);

		if (!updated) {
			return;
		}

		this.startPosition = undefined;
		this.currentRectangleId = undefined;
		this.drawType = undefined;
		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}
	}

	private beginDrawing(
		event: TerraDrawMouseEvent,
		drawType: DrawType = "click",
	) {
		this.startPosition = [event.lng, event.lat];
		this.endPosition = [event.lng, event.lat];

		const feature = this.mutateFeature.createPolygon({
			coordinates: [
				[event.lng, event.lat],
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
		this.currentRectangleId = feature.id;

		this.drawType = drawType;
		this.setDrawing();
	}

	/** TODO: Probably should be private? */
	/** @internal */
	moveDrawAllowed() {
		return (
			this.drawInteraction === "click-move" ||
			this.drawInteraction === "click-move-or-drag"
		);
	}

	/** TODO: Probably should be private? */
	/** @internal */
	dragDrawAllowed() {
		return (
			this.drawInteraction === "click-drag" ||
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
			if (!this.startPosition) {
				this.beginDrawing(event);
			} else {
				this.endPosition = [event.lng, event.lat];
				// Finish drawing
				this.close();
			}
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.endPosition = [event.lng, event.lat];
		this.updateRectangle(this.endPosition, UpdateTypes.Provisional);
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
			this.endPosition = [event.lng, event.lat];
			this.updateRectangle(this.endPosition, UpdateTypes.Provisional);
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
		const cleanUpId = this.currentRectangleId;

		this.startPosition = undefined;
		this.currentRectangleId = undefined;

		this.drawType = undefined;

		if (this.state === "drawing") {
			this.setStarted();
		}

		this.mutateFeature.deleteFeatureIfPresent(cleanUpId);
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

	afterFeatureUpdated(feature: GeoJSONStoreFeatures): void {
		// If we are in the middle of drawing a rectangle and the feature being updated is the current rectangle,
		// we need to reset the drawing state
		if (this.currentRectangleId === feature.id) {
			this.startPosition = undefined;
			this.currentRectangleId = undefined;
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
