import {
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	TerraDrawMouseEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	Z_INDEX,
	COMMON_PROPERTIES,
	FinishActions,
	Snapping,
} from "../../common";
import { LineString, Polygon, Position } from "geojson";
import {
	BaseModeOptions,
	CustomStyling,
	ModeUpdateOptions,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { BehaviorConfig } from "../base.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { LineSnappingBehavior } from "../line-snapping.behavior";
import { CoordinateSnappingBehavior } from "../coordinate-snapping.behavior";
import { getDefaultStyling } from "../../util/styling";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { ValidateLineStringFeature } from "../../validations/linestring.validation";
import { ValidatePolygonFeature } from "../../validations/polygon.validation";
import { ClosingPointsBehavior } from "../closing-points.behavior";
import { MutateFeatureBehavior, Mutations } from "../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../read-feature.behavior";

type TerraDrawPolyLineModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" } as const;

type PolyLineStyling = {
	lineStringWidth: NumericStyling;
	lineStringColor: HexColorStyling;
	lineStringOpacity: NumericStyling;
	polygonFillColor: HexColorStyling;
	polygonFillOpacity: NumericStyling;
	polygonOutlineColor: HexColorStyling;
	polygonOutlineWidth: NumericStyling;
	polygonOutlineOpacity: NumericStyling;
	closingPointColor: HexColorStyling;
	closingPointWidth: NumericStyling;
	closingPointOpacity: NumericStyling;
	closingPointOutlineColor: HexColorStyling;
	closingPointOutlineWidth: NumericStyling;
	closingPointOutlineOpacity: NumericStyling;
	snappingPointColor: HexColorStyling;
	snappingPointWidth: NumericStyling;
	snappingPointOpacity: NumericStyling;
	snappingPointOutlineColor: HexColorStyling;
	snappingPointOutlineWidth: NumericStyling;
	snappingPointOutlineOpacity: NumericStyling;
};

interface Cursors {
	start?: Cursor;
	close?: Cursor;
}

const defaultCursors = {
	start: "crosshair",
	close: "pointer",
} as Required<Cursors>;

interface TerraDrawPolyLineModeOptions<
	T extends CustomStyling,
> extends BaseModeOptions<T> {
	snapping?: Snapping;
	keyEvents?: TerraDrawPolyLineModeKeyEvents | null;
	cursors?: Cursors;
}

export class TerraDrawPolyLineMode extends TerraDrawBaseDrawMode<PolyLineStyling> {
	mode = "polyline";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private keyEvents: TerraDrawPolyLineModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private mouseMove = false;
	private snapping: Snapping | undefined;
	private snappedPointId: FeatureId | undefined;

	private mutateFeature!: MutateFeatureBehavior;
	private readFeature!: ReadFeatureBehavior;
	private pixelDistance!: PixelDistanceBehavior;
	private closingPoints!: ClosingPointsBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;
	private lineSnapping!: LineSnappingBehavior;
	private coordinateSnapping!: CoordinateSnappingBehavior;

	constructor(options?: TerraDrawPolyLineModeOptions<PolyLineStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: ModeUpdateOptions<TerraDrawPolyLineModeOptions<PolyLineStyling>>,
	) {
		super.updateOptions(options);

		if (options?.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		if (options?.snapping) {
			this.snapping = options.snapping;
		}

		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else if (options?.keyEvents) {
			this.keyEvents = { ...this.keyEvents, ...options.keyEvents };
		}
	}

	/** @internal */
	registerBehaviors(config: BehaviorConfig) {
		this.clickBoundingBox = new ClickBoundingBoxBehavior(config);
		this.pixelDistance = new PixelDistanceBehavior(config);
		this.lineSnapping = new LineSnappingBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
		this.coordinateSnapping = new CoordinateSnappingBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
		this.readFeature = new ReadFeatureBehavior(config);
		this.mutateFeature = new MutateFeatureBehavior(config, {
			validate: this.validate,
		});
		this.closingPoints = new ClosingPointsBehavior(
			config,
			this.pixelDistance,
			this.mutateFeature,
			this.readFeature,
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

	private finishLine() {
		if (!this.currentId) {
			return;
		}

		const updated = this.mutateFeature.updateLineString({
			featureId: this.currentId,
			context: { updateType: UpdateTypes.Finish, action: FinishActions.Draw },
			coordinateMutations: [{ type: Mutations.Delete, index: -1 }],
			propertyMutations: {
				[COMMON_PROPERTIES.CURRENTLY_DRAWING]: undefined,
			},
		});

		if (!updated) {
			return;
		}

		const featureId = this.currentId;
		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.closingPoints.delete();
		this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
		this.snappedPointId = undefined;

		if (this.state === "drawing") {
			this.setStarted();
		}

		this.onFinish(featureId, { mode: this.mode, action: FinishActions.Draw });
	}

	private toPolygonLikeCoordinates(lineCoordinates: Position[]) {
		if (lineCoordinates.length === 0) {
			return [lineCoordinates];
		}

		return [[...lineCoordinates, lineCoordinates[0]]];
	}

	private closeAsPolygon() {
		if (!this.currentId) {
			return;
		}

		const geometry = this.readFeature.getGeometry<LineString>(this.currentId);
		const committed = geometry.coordinates.slice(0, -1);

		if (committed.length < 3) {
			return;
		}

		const featureIdToRemove = this.currentId;
		const closedCoordinates = [...committed, committed[0]];

		this.mutateFeature.deleteFeatureIfPresent(featureIdToRemove);

		const created = this.mutateFeature.createPolygon({
			coordinates: closedCoordinates,
			properties: {
				mode: this.mode,
			},
		});

		if (!created) {
			this.currentCoordinate = 0;
			this.currentId = undefined;
			this.closingPoints.delete();

			if (this.state === "drawing") {
				this.setStarted();
			}

			return;
		}

		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.closingPoints.delete();
		this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
		this.snappedPointId = undefined;

		if (this.state === "drawing") {
			this.setStarted();
		}

		this.onFinish(created.id as FeatureId, {
			mode: this.mode,
			action: FinishActions.Draw,
		});
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.mouseMove = true;
		this.setCursor(this.cursors.start);
		this.updateSnappedCoordinate(event);

		if (!this.currentId || this.currentCoordinate === 0) {
			return;
		}

		const updated = this.mutateFeature.updateLineString({
			featureId: this.currentId,
			coordinateMutations: [
				{
					type: Mutations.Update,
					index: -1,
					coordinate: [event.lng, event.lat],
				},
			],
			context: { updateType: UpdateTypes.Provisional },
		});

		if (!updated) {
			return;
		}

		const { isClosing, isPreviousClosing } =
			this.closingPoints.isPolygonClosingPoints(event);
		if (
			(isClosing && this.currentCoordinate >= 3) ||
			(isPreviousClosing && this.currentCoordinate >= 2)
		) {
			this.setCursor(this.cursors.close);
		}
	}

	private onLeftClick(event: TerraDrawMouseEvent) {
		this.updateSnappedCoordinate(event);
		const clickedCoordinate: Position = [event.lng, event.lat];

		if (this.currentCoordinate === 0) {
			const created = this.mutateFeature.createLineString({
				coordinates: [clickedCoordinate, clickedCoordinate],
				properties: {
					mode: this.mode,
					[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
				},
			});

			this.currentId = created.id as FeatureId;
			this.currentCoordinate = 1;
			this.setDrawing();
			return;
		}

		if (!this.currentId) {
			return;
		}

		const { isClosing, isPreviousClosing } =
			this.closingPoints.isPolygonClosingPoints(event);

		if (isClosing && this.currentCoordinate >= 3) {
			this.closeAsPolygon();
			return;
		}

		if (isPreviousClosing && this.currentCoordinate >= 2) {
			this.finishLine();
			return;
		}

		const updated = this.mutateFeature.updateLineString({
			featureId: this.currentId,
			context: { updateType: UpdateTypes.Commit },
			coordinateMutations: [
				{
					type: Mutations.InsertAfter,
					index: -1,
					coordinate: clickedCoordinate,
				},
			],
		});

		if (!updated) {
			return;
		}

		this.currentCoordinate++;

		if (this.currentCoordinate >= 2) {
			const polygonLikeCoordinates = this.toPolygonLikeCoordinates(
				updated.geometry.coordinates,
			);

			if (this.closingPoints.ids.length === 0) {
				this.closingPoints.create(polygonLikeCoordinates);
			} else {
				this.closingPoints.update(polygonLikeCoordinates);
			}
		}
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		if (
			event.button === "left" &&
			this.allowPointerEvent(this.pointerEvents.leftClick, event)
		) {
			if (this.currentCoordinate > 0 && !this.mouseMove) {
				this.onMouseMove(event);
			}
			this.mouseMove = false;
			this.onLeftClick(event);
		}
	}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		} else if (event.key === this.keyEvents.finish) {
			this.finishLine();
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
		const currentId = this.currentId;
		this.currentId = undefined;
		this.currentCoordinate = 0;

		if (this.state === "drawing") {
			this.setStarted();
		}

		this.mutateFeature.deleteFeatureIfPresent(currentId);
		this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
		this.snappedPointId = undefined;
		this.closingPoints.delete();
	}

	private updateSnappedCoordinate(event: TerraDrawMouseEvent) {
		const snappedCoordinate = this.snapCoordinate(event);

		if (snappedCoordinate) {
			if (this.snappedPointId) {
				this.mutateFeature.updateGuidancePoints([
					{
						featureId: this.snappedPointId,
						coordinate: snappedCoordinate,
					},
				]);
			} else {
				this.snappedPointId = this.mutateFeature.createGuidancePoint({
					coordinate: snappedCoordinate,
					type: COMMON_PROPERTIES.SNAPPING_POINT,
				});
			}

			event.lng = snappedCoordinate[0];
			event.lat = snappedCoordinate[1];
		} else if (this.snappedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
			this.snappedPointId = undefined;
		}
	}

	private snapCoordinate(event: TerraDrawMouseEvent) {
		let snappedCoordinate: Position | undefined;

		if (this.snapping?.toLine) {
			let snapped: Position | undefined;
			if (this.currentId) {
				snapped = this.lineSnapping.getSnappableCoordinate(
					event,
					this.currentId,
				);
			} else {
				snapped = this.lineSnapping.getSnappableCoordinateFirstClick(event);
			}

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		if (this.snapping?.toCoordinate) {
			let snapped: Position | undefined;
			if (this.currentId) {
				snapped = this.coordinateSnapping.getSnappableCoordinate(
					event,
					this.currentId,
				);
			} else {
				snapped =
					this.coordinateSnapping.getSnappableCoordinateFirstClick(event);
			}

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		if (this.snapping?.toCustom) {
			const snapped = this.snapping.toCustom(event, {
				currentCoordinate: this.currentCoordinate,
				currentId: this.currentId,
				getCurrentGeometrySnapshot: this.currentId
					? () =>
							this.readFeature.getGeometry<LineString>(
								this.currentId as FeatureId,
							)
					: () => null,
				project: this.project,
				unproject: this.unproject,
			});

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		return snappedCoordinate;
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (feature.properties.mode !== this.mode) {
			return styles;
		}

		if (feature.geometry.type === "LineString") {
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

			styles.lineStringOpacity = this.getNumericStylingValue(
				this.styles.lineStringOpacity,
				1,
				feature,
			);

			styles.zIndex = Z_INDEX.LAYER_ONE;
			return styles;
		}

		if (feature.geometry.type === "Polygon") {
			styles.polygonFillColor = this.getHexColorStylingValue(
				this.styles.polygonFillColor,
				styles.polygonFillColor,
				feature,
			);

			styles.polygonFillOpacity = this.getNumericStylingValue(
				this.styles.polygonFillOpacity,
				styles.polygonFillOpacity,
				feature,
			);

			styles.polygonOutlineColor = this.getHexColorStylingValue(
				this.styles.polygonOutlineColor,
				styles.polygonOutlineColor,
				feature,
			);

			styles.polygonOutlineWidth = this.getNumericStylingValue(
				this.styles.polygonOutlineWidth,
				styles.polygonOutlineWidth,
				feature,
			);

			styles.polygonOutlineOpacity = this.getNumericStylingValue(
				this.styles.polygonOutlineOpacity,
				1,
				feature,
			);

			styles.zIndex = Z_INDEX.LAYER_ONE;
			return styles;
		}

		if (feature.geometry.type === "Point") {
			const closingPoint =
				feature.properties[COMMON_PROPERTIES.CLOSING_POINT] === true;
			const snappingPoint =
				feature.properties[COMMON_PROPERTIES.SNAPPING_POINT] === true;

			if (!closingPoint && !snappingPoint) {
				return styles;
			}

			styles.pointColor = this.getHexColorStylingValue(
				closingPoint
					? this.styles.closingPointColor
					: this.styles.snappingPointColor,
				styles.pointColor,
				feature,
			);

			styles.pointWidth = this.getNumericStylingValue(
				closingPoint
					? this.styles.closingPointWidth
					: this.styles.snappingPointWidth,
				styles.pointWidth,
				feature,
			);

			styles.pointOpacity = this.getNumericStylingValue(
				closingPoint
					? this.styles.closingPointOpacity
					: this.styles.snappingPointOpacity,
				1,
				feature,
			);

			styles.pointOutlineColor = this.getHexColorStylingValue(
				closingPoint
					? this.styles.closingPointOutlineColor
					: this.styles.snappingPointOutlineColor,
				styles.pointOutlineColor,
				feature,
			);

			styles.pointOutlineWidth = this.getNumericStylingValue(
				closingPoint
					? this.styles.closingPointOutlineWidth
					: this.styles.snappingPointOutlineWidth,
				2,
				feature,
			);

			styles.pointOutlineOpacity = this.getNumericStylingValue(
				closingPoint
					? this.styles.closingPointOutlineOpacity
					: this.styles.snappingPointOutlineOpacity,
				1,
				feature,
			);

			styles.zIndex = Z_INDEX.LAYER_THREE;
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (validatedFeature) => {
			if (validatedFeature.geometry.type === "LineString") {
				return ValidateLineStringFeature(
					validatedFeature,
					this.coordinatePrecision,
				);
			}

			if (validatedFeature.geometry.type === "Polygon") {
				return ValidatePolygonFeature(
					validatedFeature,
					this.coordinatePrecision,
				);
			}

			return {
				valid: false,
				reason: "Only LineString or Polygon features are valid",
			};
		});
	}
}
