import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	COMMON_PROPERTIES,
	Z_INDEX,
	FinishActions,
	DrawInteractions,
	DrawType,
} from "../../common";

import {
	BaseModeOptions,
	CustomStyling,
	ModeUpdateOptions,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { getDefaultStyling } from "../../util/styling";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { cartesianDistance } from "../../geometry/measure/pixel-distance";
import { ValidatePolygonFeature } from "../../validations/polygon.validation";
import { MutateFeatureBehavior, Mutations } from "../mutate-feature.behavior";
import { BehaviorConfig } from "../base.behavior";
import { ReadFeatureBehavior } from "../read-feature.behavior";

type TerraDrawFreehandModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };

type FreehandPolygonStyling = {
	fillColor: HexColorStyling;
	fillOpacity: NumericStyling;
	outlineColor: HexColorStyling;
	outlineOpacity: NumericStyling;
	outlineWidth: NumericStyling;
	closingPointColor: HexColorStyling;
	closingPointOpacity: NumericStyling;
	closingPointWidth: NumericStyling;
	closingPointOutlineColor: HexColorStyling;
	closingPointOutlineOpacity: NumericStyling;
	closingPointOutlineWidth: NumericStyling;
};

interface Cursors {
	start?: Cursor;
	close?: Cursor;
}

const defaultCursors = {
	start: "crosshair",
	close: "pointer",
} as Required<Cursors>;

interface TerraDrawFreehandModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	minDistance?: number;
	smoothing?: number;
	preventPointsNearClose?: boolean;
	autoClose?: boolean;
	autoCloseTimeout?: number;
	keyEvents?: TerraDrawFreehandModeKeyEvents | null;
	cursors?: Cursors;
	drawInteraction?: DrawInteractions;
}

export class TerraDrawFreehandMode extends TerraDrawBaseDrawMode<FreehandPolygonStyling> {
	mode = "freehand";

	private canClose = false;
	private currentId: FeatureId | undefined;
	private closingPointId: FeatureId | undefined;
	private minDistance: number = 20;
	private keyEvents: TerraDrawFreehandModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private preventPointsNearClose: boolean = true;
	private autoClose: boolean = false;
	private autoCloseTimeout = 500;
	private hasLeftStartingPoint = false;
	private preventNewFeature = false;
	private drawInteraction = "click-move";
	private drawType: DrawType | undefined;
	private smoothing = 0;

	// Behaviors
	private mutateFeature!: MutateFeatureBehavior;
	private readFeature!: ReadFeatureBehavior;

	constructor(options?: TerraDrawFreehandModeOptions<FreehandPolygonStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	public updateOptions(
		options?: ModeUpdateOptions<
			TerraDrawFreehandModeOptions<FreehandPolygonStyling>
		>,
	): void {
		super.updateOptions(options);

		if (options?.minDistance) {
			this.minDistance = options.minDistance;
		}

		if (options?.smoothing !== undefined) {
			const minimumSmoothing = 0;
			const maximumSmoothing = 0.999;
			this.smoothing = Math.min(
				Math.max(options.smoothing, minimumSmoothing),
				maximumSmoothing,
			);
		}

		if (options?.preventPointsNearClose !== undefined) {
			this.preventPointsNearClose = options.preventPointsNearClose;
		}

		if (options?.autoClose !== undefined) {
			this.autoClose = options.autoClose;
		}

		if (options?.autoCloseTimeout) {
			this.autoCloseTimeout = options.autoCloseTimeout;
		}

		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else if (options?.keyEvents) {
			this.keyEvents = { ...this.keyEvents, ...options.keyEvents };
		}

		if (options?.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		if (options?.drawInteraction) {
			this.drawInteraction = options.drawInteraction;
		}
	}

	private moveDrawAllowed() {
		return (
			this.drawInteraction === "click-move" ||
			this.drawInteraction === "click-move-or-drag"
		);
	}

	private dragDrawAllowed() {
		return (
			this.drawInteraction === "click-drag" ||
			this.drawInteraction === "click-move-or-drag"
		);
	}

	private beginDrawing(
		event: TerraDrawMouseEvent,
		drawType: DrawType = "click",
	) {
		const { id: createdId } = this.mutateFeature.createPolygon({
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

		this.currentId = createdId;
		this.drawType = drawType;

		this.closingPointId = this.mutateFeature.createGuidancePoint({
			coordinate: [event.lng, event.lat],
			type: COMMON_PROPERTIES.CLOSING_POINT,
		});

		this.canClose = true;

		if (this.state !== "drawing") {
			this.setDrawing();
		}
	}

	private addCoordinate(event: TerraDrawMouseEvent) {
		if (this.currentId === undefined || this.canClose === false) {
			this.setCursor(this.cursors.start);
			return;
		}

		const [previousLng, previousLat] = this.readFeature.getCoordinate(
			this.currentId,
			-2,
		);
		const { x, y } = this.project(previousLng, previousLat);
		const distance = cartesianDistance(
			{ x, y },
			{ x: event.containerX, y: event.containerY },
		);

		const [closingLng, closingLat] = this.readFeature.getCoordinate(
			this.currentId,
			0,
		);
		const { x: closingX, y: closingY } = this.project(closingLng, closingLat);
		const closingDistance = cartesianDistance(
			{ x: closingX, y: closingY },
			{ x: event.containerX, y: event.containerY },
		);

		if (closingDistance < this.pointerDistance) {
			if (this.autoClose && this.hasLeftStartingPoint) {
				this.preventNewFeature = true;
				setTimeout(() => {
					this.preventNewFeature = false;
				}, this.autoCloseTimeout);

				this.close();
			}

			this.setCursor(this.cursors.close);

			if (this.preventPointsNearClose) {
				return;
			}
		} else {
			this.hasLeftStartingPoint = true;
			this.setCursor(this.cursors.start);
		}

		if (distance < this.minDistance) {
			return;
		}

		const coordinate = this.getSmoothedCoordinate(
			[previousLng, previousLat],
			[event.lng, event.lat],
		);

		this.mutateFeature.updatePolygon({
			featureId: this.currentId,
			coordinateMutations: [
				{
					type: Mutations.InsertBefore,
					index: -1,
					coordinate,
				},
			],
			context: { updateType: UpdateTypes.Provisional },
		});
	}

	/**
	 * Uses a simple linear interpolation to smooth the coordinates. The smoothing factor determines how
	 * much influence the previous coordinate has on the new coordinate. A smoothing factor of 0 means
	 * no smoothing (the target coordinate is used as is), while a smoothing factor close to 1 means a
	 * lot of smoothing (the new coordinate will be very close to the previous coordinate).
	 * The default value is 0, which means no smoothing.
	 * @param previousCoordinate
	 * @param targetCoordinate
	 * @returns
	 */
	private getSmoothedCoordinate(
		previousCoordinate: [number, number],
		targetCoordinate: [number, number],
	): [number, number] {
		if (this.smoothing === 0) {
			return targetCoordinate;
		}

		const [previousLongitude, previousLatitude] = previousCoordinate;
		const [targetLongitude, targetLatitude] = targetCoordinate;

		return [
			previousLongitude * this.smoothing +
				targetLongitude * (1 - this.smoothing),
			previousLatitude * this.smoothing + targetLatitude * (1 - this.smoothing),
		];
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
			context: { updateType: UpdateTypes.Finish },
		});

		if (!updated) {
			return;
		}

		const featureId = this.currentId;

		this.mutateFeature.deleteFeatureIfPresent(this.closingPointId);

		this.canClose = false;
		this.currentId = undefined;
		this.closingPointId = undefined;
		this.hasLeftStartingPoint = false;
		this.drawType = undefined;
		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		this.onFinish(featureId, {
			mode: this.mode,
			action: FinishActions.Draw,
		});
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
		if (!this.moveDrawAllowed() || this.drawType !== "click") {
			return;
		}

		this.addCoordinate(event);
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
			if (this.preventNewFeature) {
				return;
			}

			if (this.canClose === false) {
				this.beginDrawing(event);

				return;
			}

			this.close();
		}
	}

	/** @internal */
	onKeyDown() {}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		} else if (event.key === this.keyEvents.finish) {
			if (this.canClose === true) {
				this.close();
			}
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

		if (this.preventNewFeature) {
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
			this.addCoordinate(event);
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
			this.preventNewFeature = true;
			setTimeout(() => {
				this.preventNewFeature = false;
			}, this.autoCloseTimeout);

			this.close();
			setMapDraggability(true);
		}
	}

	/** @internal */
	cleanUp() {
		const cleanUpId = this.currentId;
		const cleanUpClosingPointId = this.closingPointId;

		this.closingPointId = undefined;
		this.currentId = undefined;
		this.canClose = false;
		this.hasLeftStartingPoint = false;
		this.drawType = undefined;
		if (this.state === "drawing") {
			this.setStarted();
		}

		this.mutateFeature.deleteFeatureIfPresent(cleanUpId);
		this.mutateFeature.deleteFeatureIfPresent(cleanUpClosingPointId);
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

			styles.polygonOutlineOpacity = this.getNumericStylingValue(
				this.styles.outlineOpacity,
				1,
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
		} else if (
			feature.type === "Feature" &&
			feature.geometry.type === "Point" &&
			feature.properties.mode === this.mode
		) {
			styles.pointWidth = this.getNumericStylingValue(
				this.styles.closingPointWidth,
				styles.pointWidth,
				feature,
			);

			styles.pointColor = this.getHexColorStylingValue(
				this.styles.closingPointColor,
				styles.pointColor,
				feature,
			);

			styles.pointOpacity = this.getNumericStylingValue(
				this.styles.closingPointOpacity,
				styles.pointOpacity === undefined ? 1 : styles.pointOpacity,
				feature,
			);

			styles.pointOutlineColor = this.getHexColorStylingValue(
				this.styles.closingPointOutlineColor,
				styles.pointOutlineColor,
				feature,
			);

			styles.pointOutlineWidth = this.getNumericStylingValue(
				this.styles.closingPointOutlineWidth,
				2,
				feature,
			);

			styles.pointOutlineOpacity = this.getNumericStylingValue(
				this.styles.closingPointOutlineOpacity,
				styles.pointOutlineOpacity === undefined
					? 1
					: styles.pointOutlineOpacity,
				feature,
			);

			styles.zIndex = Z_INDEX.LAYER_FIVE;

			return styles;
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePolygonFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// NOTE: This handles the case we are currently drawing a polygon
		// We need to reset the drawing state because it is very complicated (impossible?)
		// to recover the drawing state after a feature update
		if (this.currentId === feature.id) {
			this.mutateFeature.deleteFeatureIfPresent(this.closingPointId);
			this.canClose = false;
			this.currentId = undefined;
			this.closingPointId = undefined;
			this.hasLeftStartingPoint = false;
		}
	}

	registerBehaviors(config: BehaviorConfig) {
		this.readFeature = new ReadFeatureBehavior(config);
		this.mutateFeature = new MutateFeatureBehavior(config, {
			validate: this.validate,
		});
	}
}
