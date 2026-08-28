import { Feature, Polygon, Position } from "geojson";
import {
	COMMON_PROPERTIES,
	Cursor,
	DrawInteractions,
	DrawType,
	FinishActions,
	HexColorStyling,
	NumericStyling,
	Projection,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	TerraDrawMouseEvent,
	UpdateTypes,
	Z_INDEX,
} from "../../common";
import { haversineDistanceKilometers } from "../../geometry/measure/haversine-distance";
import {
	ellipse,
	ellipseWebMercator,
} from "../../geometry/shape/create-ellipse";
import { lngLatToWebMercatorXY } from "../../geometry/project/web-mercator";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import { ValidateNonIntersectingPolygonFeature } from "../../validations/polygon.validation";
import { BehaviorConfig } from "../base.behavior";
import { MutateFeatureBehavior, Mutations } from "../mutate-feature.behavior";
import {
	BaseModeOptions,
	CustomStyling,
	ModeUpdateOptions,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import {
	isDrawInteraction,
	isFiniteNonNegativeNumber,
	isNonNullObject,
	isNull,
} from "../../common/checks";

type TerraDrawEllipseModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

type EllipsePolygonStyling = {
	fillColor: HexColorStyling;
	fillOpacity: NumericStyling;
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	outlineOpacity: NumericStyling;
};

interface Cursors {
	start?: Cursor;
}

interface TerraDrawEllipseModeOptions<
	T extends CustomStyling,
> extends BaseModeOptions<T> {
	keyEvents?: TerraDrawEllipseModeKeyEvents | null;
	cursors?: Cursors;
	startingRadiusKilometers?: number;
	projection?: Projection;
	drawInteraction?: DrawInteractions;
	segments?: number;
}

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };
const defaultCursors = { start: "crosshair" } as Required<Cursors>;

export class TerraDrawEllipseMode extends TerraDrawBaseDrawMode<EllipsePolygonStyling> {
	mode = "ellipse";
	private center: Position | undefined;
	private endPosition: Position | undefined;
	private segments = 64;
	private currentEllipseId: FeatureId | undefined;
	private keyEvents: TerraDrawEllipseModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private startingRadiusKilometers = 0.00001;
	private cursorMovedAfterInitialCursorDown = false;
	private drawInteraction: DrawInteractions = "click-move";
	private drawType: DrawType | undefined;
	private minimumSegments = 3;

	// Behaviors
	private mutateFeature!: MutateFeatureBehavior;

	constructor(options?: TerraDrawEllipseModeOptions<EllipsePolygonStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: ModeUpdateOptions<
			TerraDrawEllipseModeOptions<EllipsePolygonStyling>
		>,
	) {
		super.updateOptions(options);

		if (isNonNullObject(options?.cursors)) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		if (isNull(options?.keyEvents)) {
			this.keyEvents = { cancel: null, finish: null };
		} else if (isNonNullObject(options?.keyEvents)) {
			this.keyEvents = { ...this.keyEvents, ...options.keyEvents };
		}

		if (isFiniteNonNegativeNumber(options?.startingRadiusKilometers)) {
			this.startingRadiusKilometers = options.startingRadiusKilometers;
		}

		if (isDrawInteraction(options?.drawInteraction)) {
			this.drawInteraction = options.drawInteraction;
		}

		if (isFiniteNonNegativeNumber(options?.segments)) {
			const integerSegments = Math.trunc(options.segments);

			this.segments =
				integerSegments < this.minimumSegments
					? this.minimumSegments
					: integerSegments;
		}
	}

	private close() {
		if (this.currentEllipseId === undefined || this.endPosition === undefined) {
			return;
		}

		if (!this.updateEllipse(this.endPosition, UpdateTypes.Finish)) {
			return;
		}

		const featureId = this.currentEllipseId;
		this.cursorMovedAfterInitialCursorDown = false;
		this.center = undefined;
		this.currentEllipseId = undefined;
		this.drawType = undefined;

		if (this.state === "drawing") {
			this.setStarted();
		}

		this.onFinish(featureId, { mode: this.mode, action: FinishActions.Draw });
	}

	private beginDrawing(
		event: TerraDrawMouseEvent,
		drawType: DrawType = "click",
	) {
		this.center = [event.lng, event.lat];
		this.endPosition = [event.lng, event.lat];

		const startingEllipse = ellipse({
			center: this.center,
			xRadiusKilometers: this.startingRadiusKilometers,
			yRadiusKilometers: this.startingRadiusKilometers,
			coordinatePrecision: this.coordinatePrecision,
		});

		const created = this.mutateFeature.createPolygon({
			coordinates: startingEllipse.geometry.coordinates[0],
			properties: {
				mode: this.mode,
				xRadiusKilometers: this.startingRadiusKilometers,
				yRadiusKilometers: this.startingRadiusKilometers,
				[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
			},
		});

		if (!created) {
			return;
		}

		this.currentEllipseId = created.id;
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
		const allowed =
			(event.button === "right" &&
				this.allowPointerEvent(this.pointerEvents.rightClick, event)) ||
			(event.button === "left" &&
				this.allowPointerEvent(this.pointerEvents.leftClick, event)) ||
			(event.isContextMenu &&
				this.allowPointerEvent(this.pointerEvents.contextMenu, event));

		if (!this.moveDrawAllowed() || !allowed) {
			return;
		}
		if (!this.center) {
			this.beginDrawing(event);
		} else if (this.currentEllipseId !== undefined) {
			this.endPosition = [event.lng, event.lat];
			this.close();
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.cursorMovedAfterInitialCursorDown = true;
		this.endPosition = [event.lng, event.lat];
		this.updateEllipse(this.endPosition, UpdateTypes.Provisional);
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
		_setMapDraggability: (enabled: boolean) => void,
	) {
		if (
			this.allowPointerEvent(this.pointerEvents.onDrag, event) &&
			this.dragDrawAllowed() &&
			this.drawType === "drag"
		) {
			this.cursorMovedAfterInitialCursorDown = true;
			this.endPosition = [event.lng, event.lat];
			this.updateEllipse(this.endPosition, UpdateTypes.Provisional);
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
			this.close();
			setMapDraggability(true);
		}
	}

	/** @internal */
	cleanUp() {
		const currentId = this.currentEllipseId;
		this.center = undefined;
		this.currentEllipseId = undefined;
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
			styles.polygonOutlineOpacity = this.getNumericStylingValue(
				this.styles.outlineOpacity,
				1,
				feature,
			);
			styles.polygonFillOpacity = this.getNumericStylingValue(
				this.styles.fillOpacity,
				styles.polygonFillOpacity,
				feature,
			);
			styles.zIndex = Z_INDEX.LAYER_ONE;
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

	private updateEllipse(endPosition: Position, updateType: UpdateTypes) {
		if (this.currentEllipseId === undefined || this.center === undefined) {
			return;
		}

		const isFinish = updateType === UpdateTypes.Finish;
		let updatedEllipse: Feature<Polygon> | undefined;
		let xRadiusKilometers: number | undefined;
		let yRadiusKilometers: number | undefined;

		if (this.cursorMovedAfterInitialCursorDown) {
			if (this.projection === "web-mercator") {
				const center = lngLatToWebMercatorXY(this.center[0], this.center[1]);
				const end = lngLatToWebMercatorXY(endPosition[0], endPosition[1]);
				xRadiusKilometers = Math.abs(end.x - center.x) / 1000;
				yRadiusKilometers = Math.abs(end.y - center.y) / 1000;
				updatedEllipse = ellipseWebMercator({
					center: this.center,
					xRadiusKilometers,
					yRadiusKilometers,
					coordinatePrecision: this.coordinatePrecision,
					steps: this.segments,
				});
			} else if (this.projection === "globe") {
				xRadiusKilometers = haversineDistanceKilometers(this.center, [
					endPosition[0],
					this.center[1],
				]);
				yRadiusKilometers = haversineDistanceKilometers(this.center, [
					this.center[0],
					endPosition[1],
				]);
				updatedEllipse = ellipse({
					center: this.center,
					xRadiusKilometers,
					yRadiusKilometers,
					coordinatePrecision: this.coordinatePrecision,
					steps: this.segments,
				});
			} else {
				throw new Error("Invalid projection");
			}
		}

		const propertyMutations: {
			xRadiusKilometers?: number;
			yRadiusKilometers?: number;
			[COMMON_PROPERTIES.CURRENTLY_DRAWING]?: boolean;
		} = {};

		if (
			updatedEllipse &&
			xRadiusKilometers !== undefined &&
			yRadiusKilometers !== undefined
		) {
			propertyMutations.xRadiusKilometers = xRadiusKilometers;
			propertyMutations.yRadiusKilometers = yRadiusKilometers;
		}

		if (isFinish) {
			propertyMutations[COMMON_PROPERTIES.CURRENTLY_DRAWING] = undefined;
		}

		return this.mutateFeature.updatePolygon({
			featureId: this.currentEllipseId,
			coordinateMutations: updatedEllipse
				? {
						type: Mutations.Replace,
						coordinates: updatedEllipse.geometry.coordinates,
					}
				: undefined,
			propertyMutations,
			context: isFinish
				? { updateType, action: FinishActions.Draw }
				: { updateType },
		});
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures): void {
		if (this.currentEllipseId === feature.id) {
			this.cursorMovedAfterInitialCursorDown = false;
			this.center = undefined;
			this.currentEllipseId = undefined;
			this.drawType = undefined;
			if (this.state === "drawing") this.setStarted();
		}
	}

	registerBehaviors(config: BehaviorConfig) {
		this.mutateFeature = new MutateFeatureBehavior(config, {
			validate: this.validate,
		});
	}
}
