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
import { LineString } from "geojson";

import {
	BaseModeOptions,
	CustomStyling,
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

	private startingClick = false;
	private currentId: FeatureId | undefined;
	private closingPointId: FeatureId | undefined;
	private minDistance: number = 20;
	private keyEvents: TerraDrawFreehandLineStringModeKeyEvents =
		defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private preventNewFeature = false;

	constructor(
		options?: TerraDrawFreehandLineStringModeOptions<FreehandLineStringStyling>,
	) {
		super(options, true);
		this.updateOptions(options);
	}

	public updateOptions(
		options?: Omit<
			TerraDrawFreehandLineStringModeOptions<FreehandLineStringStyling>,
			"modeName"
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

		// Fix right hand rule if necessary
		if (this.currentId) {
			this.store.updateProperty([
				{
					id: this.currentId,
					property: COMMON_PROPERTIES.CURRENTLY_DRAWING,
					value: undefined,
				},
			]);
		}

		const finishedId = this.currentId;

		if (this.validate && finishedId) {
			const currentGeometry =
				this.store.getGeometryCopy<LineString>(finishedId);

			const validationResult = this.validate(
				{
					type: "Feature",
					id: finishedId,
					geometry: currentGeometry,
					properties: {},
				},
				{
					project: this.project,
					unproject: this.unproject,
					coordinatePrecision: this.coordinatePrecision,
					updateType: UpdateTypes.Finish,
				},
			);

			if (!validationResult.valid) {
				return;
			}
		}

		if (this.closingPointId) {
			this.store.delete([this.closingPointId]);
		}
		this.startingClick = false;
		this.currentId = undefined;
		this.closingPointId = undefined;

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		// Ensure that any listerers are triggered with the main created geometry
		this.onFinish(finishedId, { mode: this.mode, action: "draw" });
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
		if (this.currentId === undefined || this.startingClick === false) {
			this.setCursor(this.cursors.start);
			return;
		}

		const currentLineGeometry = this.store.getGeometryCopy<LineString>(
			this.currentId,
		);

		const previousIndex = currentLineGeometry.coordinates.length - 2;
		const [previousLng, previousLat] =
			currentLineGeometry.coordinates[previousIndex];
		const { x, y } = this.project(previousLng, previousLat);
		const distance = cartesianDistance(
			{ x, y },
			{ x: event.containerX, y: event.containerY },
		);

		const [closingLng, closingLat] =
			currentLineGeometry.coordinates[
				currentLineGeometry.coordinates.length - 1
			];
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

		// The cusor must have moved a minimum distance
		// before we add another coordinate
		if (distance < this.minDistance) {
			return;
		}

		const newGeometry = {
			type: "LineString",
			coordinates: [...currentLineGeometry.coordinates, [event.lng, event.lat]],
		} as LineString;

		if (this.validate) {
			const validationResult = this.validate(
				{
					type: "Feature",
					id: this.currentId,
					geometry: newGeometry,
					properties: {},
				},
				{
					project: this.project,
					unproject: this.unproject,
					coordinatePrecision: this.coordinatePrecision,
					updateType: UpdateTypes.Provisional,
				},
			);

			if (!validationResult.valid) {
				return;
			}
		}

		this.store.updateGeometry([
			{
				id: this.currentId,
				geometry: newGeometry,
			},
		]);

		if (this.closingPointId) {
			this.store.updateGeometry([
				{
					id: this.closingPointId,
					geometry: {
						type: "Point",
						coordinates: [event.lng, event.lat],
					},
				},
			]);
		}
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

			if (this.startingClick === false) {
				const [createdId, closingPointId] = this.store.create([
					{
						geometry: {
							type: "LineString",
							coordinates: [
								[event.lng, event.lat],
								[event.lng, event.lat],
							],
						},
						properties: {
							mode: this.mode,
							[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
						},
					},
					{
						geometry: {
							type: "Point",
							coordinates: [event.lng, event.lat],
						},
						properties: {
							mode: this.mode,
							[COMMON_PROPERTIES.CLOSING_POINT]: true,
						},
					},
				]);

				this.currentId = createdId;
				this.closingPointId = closingPointId;
				this.startingClick = true;

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
			if (this.startingClick === true) {
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
		this.startingClick = false;
		if (this.state === "drawing") {
			this.setStarted();
		}

		try {
			if (cleanUpId !== undefined) {
				this.store.delete([cleanUpId]);
			}
			if (cleanUpClosingPointId !== undefined) {
				this.store.delete([cleanUpClosingPointId]);
			}
		} catch (error) {}
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
			if (this.closingPointId) {
				this.store.delete([this.closingPointId]);
			}
			this.startingClick = false;
			this.currentId = undefined;
			this.closingPointId = undefined;
		}
	}
}
