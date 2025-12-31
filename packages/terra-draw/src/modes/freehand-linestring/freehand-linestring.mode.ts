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
import { ValidateLineStringFeature } from "../../validations/linestring.validation";
import { MutateFeatureBehavior, Mutations } from "../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../read-feature.behavior";
import { BehaviorConfig } from "../base.behavior";
import { ClosingPointsBehavior } from "../closing-points.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";

type TerraDrawFreehandLineStringModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };

type FreehandLineStringStyling = {
	lineStringWidth: NumericStyling;
	lineStringColor: HexColorStyling;
	closingPointColor: HexColorStyling;
	closingPointWidth: NumericStyling;
	closingPointOutlineColor: HexColorStyling;
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

interface TerraDrawFreehandLineStringModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	minDistance?: number;
	keyEvents?: TerraDrawFreehandLineStringModeKeyEvents | null;
	cursors?: Cursors;
}

export class TerraDrawFreehandLineStringMode extends TerraDrawBaseDrawMode<FreehandLineStringStyling> {
	mode = "freehand-linestring";

	private canClose = false;
	private currentId: FeatureId | undefined;
	private minDistance: number = 20;
	private keyEvents: TerraDrawFreehandLineStringModeKeyEvents =
		defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private preventNewFeature = false;

	// Behaviors
	private mutateFeature!: MutateFeatureBehavior;
	private readFeature!: ReadFeatureBehavior;
	private pixelDistance!: PixelDistanceBehavior;
	private closingPoints!: ClosingPointsBehavior;

	constructor(
		options?: TerraDrawFreehandLineStringModeOptions<FreehandLineStringStyling>,
	) {
		super(options, true);
		this.updateOptions(options);
	}

	public updateOptions(
		options?: ModeUpdateOptions<
			TerraDrawFreehandLineStringModeOptions<FreehandLineStringStyling>
		>,
	): void {
		super.updateOptions(options);

		if (options?.minDistance) {
			this.minDistance = options.minDistance;
		}

		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else if (options?.keyEvents) {
			this.keyEvents = { ...this.keyEvents, ...options.keyEvents };
		}

		if (options?.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		const updated = this.mutateFeature.updateLineString({
			featureId: this.currentId,
			propertyMutations: {
				[COMMON_PROPERTIES.CURRENTLY_DRAWING]: undefined,
			},
			context: { updateType: UpdateTypes.Finish, action: "draw" },
		});

		if (!updated) {
			return;
		}

		this.closingPoints.delete();

		this.canClose = false;
		this.currentId = undefined;

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
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
			-1,
		);
		const { x: closingX, y: closingY } = this.project(closingLng, closingLat);
		const closingDistance = cartesianDistance(
			{ x: closingX, y: closingY },
			{ x: event.containerX, y: event.containerY },
		);

		if (closingDistance < this.pointerDistance) {
			this.setCursor(this.cursors.close);
		} else {
			this.setCursor(this.cursors.start);
		}

		// The cursor must have moved a minimum distance
		// before we add another coordinate
		if (distance < this.minDistance) {
			return;
		}

		const updated = this.mutateFeature.updateLineString({
			featureId: this.currentId,
			coordinateMutations: [
				{
					type: Mutations.InsertAfter,
					index: -1,
					coordinate: [event.lng, event.lat],
				},
			],
			context: { updateType: UpdateTypes.Provisional },
		});

		if (!updated) {
			return;
		}

		this.closingPoints.update(updated.geometry.coordinates);
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
			if (this.preventNewFeature) {
				return;
			}

			if (this.canClose === false) {
				const { id: createdId, geometry } = this.mutateFeature.createLineString(
					{
						coordinates: [
							[event.lng, event.lat],
							[event.lng, event.lat],
						],
						properties: {
							mode: this.mode,
							[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
						},
					},
				);

				this.closingPoints.create(geometry.coordinates);
				this.currentId = createdId;
				this.canClose = true;

				// We could already be in drawing due to updating the existing linestring
				// via afterFeatureUpdated
				if (this.state !== "drawing") {
					this.setDrawing();
				}

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
	onDragStart() {}

	/** @internal */
	onDrag() {}

	/** @internal */
	onDragEnd() {}

	/** @internal */
	cleanUp() {
		const cleanUpId = this.currentId;

		this.currentId = undefined;
		this.canClose = false;
		if (this.state === "drawing") {
			this.setStarted();
		}

		this.mutateFeature.deleteFeatureIfPresent(cleanUpId);
		this.closingPoints.delete();
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.type === "Feature" &&
			feature.geometry.type === "LineString" &&
			feature.properties.mode === this.mode
		) {
			styles.lineStringColor = this.getHexColorStylingValue(
				this.styles.lineStringColor,
				styles.lineStringColor,
				feature,
			);

			styles.lineStringWidth = this.getNumericStylingValue(
				this.styles.lineStringWidth,
				styles.lineStringWidth,
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

			styles.zIndex = Z_INDEX.LAYER_FIVE;

			return styles;
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidateLineStringFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// NOTE: This handles the case we are currently drawing a linestring
		// We need to reset the drawing state because it is very complicated (impossible?)
		// to recover the drawing state after a feature update
		if (this.currentId === feature.id) {
			this.closingPoints.delete();
			this.canClose = false;
			this.currentId = undefined;
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
		this.pixelDistance = new PixelDistanceBehavior(config);
		this.closingPoints = new ClosingPointsBehavior(
			config,
			this.pixelDistance,
			this.mutateFeature,
			this.readFeature,
		);
	}
}
