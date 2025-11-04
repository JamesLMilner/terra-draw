import { Polygon, Position } from "geojson";
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
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { ValidateNonIntersectingPolygonFeature } from "../../validations/polygon.validation";
import { ensureRightHandRule } from "../../geometry/ensure-right-hand-rule";

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
}

export class TerraDrawRectangleMode extends TerraDrawBaseDrawMode<RectanglePolygonStyling> {
	mode = "rectangle";
	private center: Position | undefined;
	private clickCount = 0;
	private currentRectangleId: FeatureId | undefined;
	private keyEvents: TerraDrawRectangleModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;

	constructor(
		options?: TerraDrawRectangleModeOptions<RectanglePolygonStyling>,
	) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: Omit<
			TerraDrawRectangleModeOptions<RectanglePolygonStyling>,
			"modeName"
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
	}

	private updateRectangle(event: TerraDrawMouseEvent, updateType: UpdateTypes) {
		if (this.clickCount === 1 && this.center && this.currentRectangleId) {
			const geometry = this.store.getGeometryCopy(this.currentRectangleId);

			const firstCoord = (geometry.coordinates as Position[][])[0][0];

			const newGeometry = {
				type: "Polygon",
				coordinates: [
					[
						firstCoord,
						[event.lng, firstCoord[1]],
						[event.lng, event.lat],
						[firstCoord[0], event.lat],
						firstCoord,
					],
				],
			} as Polygon;

			if (this.validate) {
				const validationResult = this.validate(
					{
						id: this.currentRectangleId,
						geometry: newGeometry,
					} as GeoJSONStoreFeatures,
					{
						project: this.project,
						unproject: this.unproject,
						coordinatePrecision: this.coordinatePrecision,
						updateType,
					},
				);

				if (!validationResult.valid) {
					return;
				}
			}

			this.store.updateGeometry([
				{
					id: this.currentRectangleId,
					geometry: newGeometry,
				},
			]);
		}
	}

	private close() {
		const finishedId = this.currentRectangleId;

		// Fix right hand rule if necessary
		if (finishedId) {
			const correctedGeometry = ensureRightHandRule(
				this.store.getGeometryCopy<Polygon>(finishedId),
			);
			if (correctedGeometry) {
				this.store.updateGeometry([
					{ id: finishedId, geometry: correctedGeometry },
				]);
			}
			this.store.updateProperty([
				{
					id: finishedId,
					property: COMMON_PROPERTIES.CURRENTLY_DRAWING,
					value: undefined,
				},
			]);
		}

		this.center = undefined;
		this.currentRectangleId = undefined;
		this.clickCount = 0;
		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		if (finishedId !== undefined) {
			this.onFinish(finishedId, { mode: this.mode, action: "draw" });
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
				const [createdId] = this.store.create([
					{
						geometry: {
							type: "Polygon",
							coordinates: [
								[
									[event.lng, event.lat],
									[event.lng, event.lat],
									[event.lng, event.lat],
									[event.lng, event.lat],
								],
							],
						},
						properties: {
							mode: this.mode,
							[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
						},
					},
				]);
				this.currentRectangleId = createdId;
				this.clickCount++;
				this.setDrawing();
			} else {
				this.updateRectangle(event, UpdateTypes.Finish);
				// Finish drawing
				this.close();
			}
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.updateRectangle(event, UpdateTypes.Provisional);
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
		const cleanUpId = this.currentRectangleId;

		this.center = undefined;
		this.currentRectangleId = undefined;
		this.clickCount = 0;

		if (this.state === "drawing") {
			this.setStarted();
		}

		if (cleanUpId !== undefined) {
			this.store.delete([cleanUpId]);
		}
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
			this.center = undefined;
			this.currentRectangleId = undefined;
			this.clickCount = 0;
			if (this.state === "drawing") {
				this.setStarted();
			}
		}
	}
}
