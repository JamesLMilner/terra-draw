import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	NumericStyling,
	HexColorStyling,
	Cursor,
	UpdateTypes,
	COMMON_PROPERTIES,
	Z_INDEX,
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
import { ValidatePointFeature } from "../../validations/point.validation";
import { BehaviorConfig } from "../base.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { PointSearchBehavior } from "../point-search.behavior";
import { MutateFeatureBehavior, Mutations } from "../mutate-feature.behavior";

type PointModeStyling = {
	pointWidth: NumericStyling;
	pointColor: HexColorStyling;
	pointOutlineColor: HexColorStyling;
	pointOutlineWidth: NumericStyling;
	editedPointColor: HexColorStyling;
	editedPointWidth: NumericStyling;
	editedPointOutlineColor: HexColorStyling;
	editedPointOutlineWidth: NumericStyling;
};

interface Cursors {
	create?: Cursor;
	dragStart?: Cursor;
	dragEnd?: Cursor;
}

const defaultCursors = {
	create: "crosshair",
	dragStart: "grabbing",
	dragEnd: "crosshair",
} as Required<Cursors>;

interface TerraDrawPointModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	cursors?: Cursors;
	editable?: boolean;
}

export class TerraDrawPointMode extends TerraDrawBaseDrawMode<PointModeStyling> {
	mode = "point";

	// Options
	private cursors: Required<Cursors> = defaultCursors;
	private editable: boolean = false;

	// Internal state
	private editedFeatureId: FeatureId | undefined;

	// Behaviors
	private pixelDistance!: PixelDistanceBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;
	private pointSearch!: PointSearchBehavior;
	private mutateFeature!: MutateFeatureBehavior;

	constructor(options?: TerraDrawPointModeOptions<PointModeStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	updateOptions(
		options?: ModeUpdateOptions<TerraDrawPointModeOptions<PointModeStyling>>,
	): void {
		super.updateOptions(options);

		if (options?.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		if (options?.editable) {
			this.editable = options.editable;
		}
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setCursor(this.cursors.create);
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
			(event.isContextMenu &&
				this.allowPointerEvent(this.pointerEvents.contextMenu, event))
		) {
			this.onRightClick(event);
			return;
		} else if (
			event.button === "left" &&
			this.allowPointerEvent(this.pointerEvents.leftClick, event)
		) {
			this.onLeftClick(event);
			return;
		}
	}

	/** @internal */
	onMouseMove() {}

	/** @internal */
	onKeyDown() {}

	/** @internal */
	onKeyUp() {}

	/** @internal */
	cleanUp() {
		this.editedFeatureId = undefined;
	}

	onDragStart(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDragStart, event)) {
			return;
		}

		if (this.editable) {
			const nearestPointFeature =
				this.pointSearch.getNearestPointFeature(event);
			this.editedFeatureId = nearestPointFeature?.id;
		}

		// We only need to stop the map dragging if
		// we actually have something selected
		if (!this.editedFeatureId) {
			return;
		}

		// Drag Feature
		this.setCursor(this.cursors.dragStart);

		setMapDraggability(false);
	}

	/** @internal */
	onDrag(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDrag, event)) {
			return;
		}

		if (this.editedFeatureId === undefined) {
			return;
		}

		this.mutateFeature.updatePoint({
			featureId: this.editedFeatureId,
			coordinateMutations: {
				type: Mutations.Replace,
				coordinates: [event.lng, event.lat],
			},
			propertyMutations: {
				[COMMON_PROPERTIES.EDITED]: true,
			},
			context: { updateType: UpdateTypes.Provisional },
		});
	}

	/** @internal */
	onDragEnd(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDragEnd, event)) {
			return;
		}

		if (this.editedFeatureId === undefined) {
			return;
		}

		const updated = this.mutateFeature.updatePoint({
			featureId: this.editedFeatureId,
			propertyMutations: {
				mode: this.mode,
				[COMMON_PROPERTIES.EDITED]: false,
			},
			context: { updateType: UpdateTypes.Finish, action: "edit" },
		});

		if (!updated) {
			return;
		}

		this.setCursor(this.cursors.dragEnd);
		this.editedFeatureId = undefined;
		setMapDraggability(true);
	}

	registerBehaviors(config: BehaviorConfig) {
		this.pixelDistance = new PixelDistanceBehavior(config);
		this.clickBoundingBox = new ClickBoundingBoxBehavior(config);
		this.pointSearch = new PointSearchBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
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

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.type === "Feature" &&
			feature.geometry.type === "Point" &&
			feature.properties.mode === this.mode
		) {
			const isEdited = Boolean(
				feature.id && this.editedFeatureId === feature.id,
			);

			styles.pointWidth = this.getNumericStylingValue(
				isEdited ? this.styles.editedPointWidth : this.styles.pointWidth,
				styles.pointWidth,
				feature,
			);

			styles.pointColor = this.getHexColorStylingValue(
				isEdited ? this.styles.editedPointColor : this.styles.pointColor,
				styles.pointColor,
				feature,
			);

			styles.pointOutlineColor = this.getHexColorStylingValue(
				isEdited
					? this.styles.editedPointOutlineColor
					: this.styles.pointOutlineColor,
				styles.pointOutlineColor,
				feature,
			);

			styles.pointOutlineWidth = this.getNumericStylingValue(
				isEdited
					? this.styles.editedPointOutlineWidth
					: this.styles.pointOutlineWidth,
				2,
				feature,
			);

			styles.zIndex = Z_INDEX.LAYER_THREE;
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePointFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}

	private onLeftClick(event: TerraDrawMouseEvent) {
		this.mutateFeature.createPoint({
			coordinates: [event.lng, event.lat],
			properties: {
				mode: this.mode,
				[COMMON_PROPERTIES.MARKER]: true,
			},
			context: { updateType: UpdateTypes.Finish, action: FinishActions.Draw },
		});
	}

	private onRightClick(event: TerraDrawMouseEvent) {
		// We only want to be able to delete points if the mode is editable
		if (!this.editable) {
			return;
		}

		const clickedFeature = this.pointSearch.getNearestPointFeature(event);

		if (clickedFeature) {
			this.mutateFeature.deleteFeature(clickedFeature.id as FeatureId);
		}
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// If we are editing a point by dragging it we want to clear that state
		// up as new point location might be completely  different in terms of it's location
		if (this.editedFeatureId === feature.id) {
			this.editedFeatureId = undefined;
			this.setCursor(this.cursors.create);
		}
	}
}
