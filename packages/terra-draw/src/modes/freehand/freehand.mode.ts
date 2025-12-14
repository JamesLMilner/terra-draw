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
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	fillOpacity: NumericStyling;
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

interface TerraDrawFreehandModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	minDistance?: number;
	preventPointsNearClose?: boolean;
	autoClose?: boolean;
	autoCloseTimeout?: number;
	keyEvents?: TerraDrawFreehandModeKeyEvents | null;
	cursors?: Cursors;
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
			context: { updateType: UpdateTypes.Finish, action: "draw" },
		});

		if (!updated) {
			return;
		}

		this.canClose = false;
		this.currentId = undefined;
		this.closingPointId = undefined;
		this.hasLeftStartingPoint = false;
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
			0,
		);
		const { x: closingX, y: closingY } = this.project(closingLng, closingLat);
		const closingDistance = cartesianDistance(
			{ x: closingX, y: closingY },
			{ x: event.containerX, y: event.containerY },
		);

		if (closingDistance < this.pointerDistance) {
			// We only want to close the polygon if the users cursor has left the
			// region of the starting point
			if (this.autoClose && this.hasLeftStartingPoint) {
				// If we have an autoCloseTimeout, we want to prevent new features
				// being created by accidental clicks for a short period of time
				this.preventNewFeature = true;
				setTimeout(() => {
					this.preventNewFeature = false;
				}, this.autoCloseTimeout);

				this.close();
			}

			this.setCursor(this.cursors.close);

			// We want to prohibit drawing new points at or around the closing
			// point as it can be non user friendly
			if (this.preventPointsNearClose) {
				return;
			}
		} else {
			this.hasLeftStartingPoint = true;
			this.setCursor(this.cursors.start);
		}

		// The cusor must have moved a minimum distance
		// before we add another coordinate
		if (distance < this.minDistance) {
			return;
		}

		this.mutateFeature.updatePolygon({
			featureId: this.currentId,
			coordinateMutations: [
				{
					type: Mutations.InsertBefore,
					index: -1,
					coordinate: [event.lng, event.lat],
				},
			],
			context: { updateType: UpdateTypes.Provisional },
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
			if (this.preventNewFeature) {
				return;
			}

			if (this.canClose === false) {
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

				this.closingPointId = this.mutateFeature.createGuidancePoint(
					[event.lng, event.lat],
					COMMON_PROPERTIES.CLOSING_POINT,
				);

				this.canClose = true;

				// We could already be in drawing due to updating the existing polygon
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
		const cleanUpClosingPointId = this.closingPointId;

		this.closingPointId = undefined;
		this.currentId = undefined;
		this.canClose = false;
		if (this.state === "drawing") {
			this.setStarted();
		}

		try {
			if (cleanUpId !== undefined) {
				this.mutateFeature.deleteFeature(cleanUpId);
			}
			if (cleanUpClosingPointId !== undefined) {
				this.mutateFeature.deleteFeature(cleanUpClosingPointId);
			}
		} catch (error) {}
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
			ValidatePolygonFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// NOTE: This handles the case we are currently drawing a polygon
		// We need to reset the drawing state because it is very complicated (impossible?)
		// to recover the drawing state after a feature update
		if (this.currentId === feature.id) {
			if (this.closingPointId) {
				this.mutateFeature.deleteFeature(this.closingPointId);
			}
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
			onUpdate: ({ id }) => {},
			onFinish: (featureId, context) => {
				this.onFinish(featureId, {
					mode: this.mode,
					action: context.action,
				});
				if (this.closingPointId) {
					this.mutateFeature.deleteFeature(this.closingPointId);
				}
			},
		});
	}
}
