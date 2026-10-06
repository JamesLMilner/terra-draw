import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	COMMON_PROPERTIES,
	Z_INDEX,
	UrlStyling,
	MarkerAnchorStyling,
	MARKER_URL_DEFAULT,
	FinishActions,
	OneDimensionalSnapping,
} from "../../common";
import { CursorValues } from "../../common/cursors";
import { Position } from "geojson";
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
import { MutateFeatureBehavior, Mutations } from "../mutate-feature.behavior";
import { PointSearchBehavior } from "../point-search.behavior";
import { isBoolean, isNonNullObject } from "../../common/checks";
import { CoordinateSnappingBehavior } from "../coordinate-snapping.behavior";
import { LineSnappingBehavior } from "../line-snapping.behavior";
import { FeatureSnappingBehavior } from "../feature-snapping.behavior";

type MarkerModeStyling = {
	/** Marker must be a PNG or JPG  */
	markerUrl: UrlStyling;
	markerHeight: NumericStyling;
	markerWidth: NumericStyling;
	markerAnchor: MarkerAnchorStyling;
};

interface Cursors {
	create?: Cursor;
	dragStart?: Cursor;
	dragEnd?: Cursor;
}

const defaultCursors = {
	create: CursorValues.Crosshair,
	dragStart: CursorValues.Grabbing,
	dragEnd: CursorValues.Crosshair,
} as Required<Cursors>;

interface TerraDrawMarkerModeOptions<
	T extends CustomStyling,
> extends BaseModeOptions<T> {
	snapping?: OneDimensionalSnapping;
	cursors?: Cursors;
	editable?: boolean;
}

export class TerraDrawMarkerMode extends TerraDrawBaseDrawMode<MarkerModeStyling> {
	mode = "marker" as const;

	// Options
	private cursors: Required<Cursors> = defaultCursors;
	private editable: boolean = false;
	private snapping: OneDimensionalSnapping | undefined;

	// Internal state
	private editedFeatureId: FeatureId | undefined;

	// Behaviors
	private pixelDistance!: PixelDistanceBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;
	private pointSearch!: PointSearchBehavior;
	private mutateFeature!: MutateFeatureBehavior;
	private coordinateSnapping!: CoordinateSnappingBehavior;
	private lineSnapping!: LineSnappingBehavior;
	private featureSnapping!: FeatureSnappingBehavior;

	constructor(options?: TerraDrawMarkerModeOptions<MarkerModeStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	updateOptions(
		options?: ModeUpdateOptions<TerraDrawMarkerModeOptions<MarkerModeStyling>>,
	): void {
		super.updateOptions(options);

		if (isNonNullObject(options?.cursors)) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		if (isNonNullObject(options?.snapping)) {
			this.snapping = options.snapping;
		}

		if (isBoolean(options?.editable)) {
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
		this.setCursor(CursorValues.Unset);
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
		_setMapDraggability: (enabled: boolean) => void,
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
				coordinates: this.snapCoordinate(event, this.editedFeatureId),
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

		const featureId = this.editedFeatureId;

		this.setCursor(this.cursors.dragEnd);
		this.editedFeatureId = undefined;
		setMapDraggability(true);

		this.onFinish(featureId, {
			mode: this.mode,
			action: FinishActions.Draw,
		});
	}

	registerBehaviors(config: BehaviorConfig) {
		this.pixelDistance = new PixelDistanceBehavior(config);
		this.clickBoundingBox = new ClickBoundingBoxBehavior(config);
		this.pointSearch = new PointSearchBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
		this.coordinateSnapping = new CoordinateSnappingBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
		this.lineSnapping = new LineSnappingBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
		this.featureSnapping = new FeatureSnappingBehavior(
			this.coordinateSnapping,
			this.lineSnapping,
		);
		this.mutateFeature = new MutateFeatureBehavior(config, {
			validate: this.validate,
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
			styles.zIndex = Z_INDEX.LAYER_THREE;
			styles.markerHeight = this.getNumericStylingValue(
				this.styles?.markerHeight,
				40,
				feature,
			);
			styles.markerWidth = this.getNumericStylingValue(
				this.styles?.markerWidth,
				32,
				feature,
			);
			styles.markerUrl = this.getUrlStylingValue(
				this.styles?.markerUrl,
				MARKER_URL_DEFAULT,
				feature,
			);
			styles.markerAnchor = this.getMarkerAnchorStylingValue(feature);
		}

		return styles;
	}

	private getMarkerAnchorStylingValue(feature: GeoJSONStoreFeatures) {
		const markerAnchor = this.styles?.markerAnchor;

		if (typeof markerAnchor === "function") {
			return markerAnchor(feature) ?? "bottom";
		}

		return markerAnchor ?? "bottom";
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePointFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}

	private onLeftClick(event: TerraDrawMouseEvent) {
		const feature = this.mutateFeature.createPoint({
			coordinates: this.snapCoordinate(event),
			properties: {
				mode: this.mode,
				[COMMON_PROPERTIES.MARKER]: true,
			},
			context: { updateType: UpdateTypes.Finish, action: FinishActions.Draw },
		});

		if (feature) {
			this.onFinish(feature.id, {
				mode: this.mode,
				action: FinishActions.Draw,
			});
		}
	}

	private snapCoordinate(
		event: TerraDrawMouseEvent,
		currentFeatureId?: FeatureId,
	): Position {
		let snappedCoordinate: Position = [event.lng, event.lat];

		if (this.snapping?.toCoordinate) {
			const snapped = currentFeatureId
				? this.coordinateSnapping.getSnappableCoordinate(
						event,
						currentFeatureId,
					)
				: this.coordinateSnapping.getSnappableCoordinateFirstClick(event);

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		if (this.snapping?.toFeature) {
			const snappable = this.featureSnapping.getSnappable(
				event,
				currentFeatureId,
				this.snapping.toFeature.filter,
				{
					toLine: this.snapping.toFeature.toLine,
					toCoordinate: this.snapping.toFeature.toCoordinate,
				},
			);

			if (snappable.coordinate) {
				snappedCoordinate = snappable.coordinate;
			}
		}

		if (this.snapping?.toCustom) {
			const snapped = this.snapping.toCustom(event, {
				currentCoordinate: 0,
				currentId: currentFeatureId,
				getCurrentGeometrySnapshot: () => null,
				project: this.project,
				unproject: this.unproject,
			});

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		return snappedCoordinate;
	}

	private onRightClick(event: TerraDrawMouseEvent) {
		// We only want to be able to delete points if the mode is editable
		if (!this.editable) {
			return;
		}

		const clickedFeature = this.pointSearch.getNearestPointFeature(event);

		if (clickedFeature) {
			this.mutateFeature.deleteFeatureIfPresent(clickedFeature.id as FeatureId);
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
