import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	COMMON_PROPERTIES,
} from "../../common";
import { Polygon } from "geojson";

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
import { ValidatePolygonFeature } from "../../validations/polygon.validation";

type TerraDrawFreehandModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

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

	private startingClick = false;
	private currentId: FeatureId | undefined;
	private closingPointId: FeatureId | undefined;
	private minDistance: number;
	private keyEvents: TerraDrawFreehandModeKeyEvents;
	private cursors: Required<Cursors>;
	private preventPointsNearClose: boolean;
	private autoClose: boolean;
	private autoCloseTimeout = 500;
	private hasLeftStartingPoint = false;
	private preventNewFeature = false;

	constructor(options?: TerraDrawFreehandModeOptions<FreehandPolygonStyling>) {
		super(options);

		const defaultCursors = {
			start: "crosshair",
			close: "pointer",
		} as Required<Cursors>;

		if (options && options.cursors) {
			this.cursors = { ...defaultCursors, ...options.cursors };
		} else {
			this.cursors = defaultCursors;
		}

		this.preventPointsNearClose =
			(options && options.preventPointsNearClose) || true;

		if (options && options.autoCloseTimeout && !options.autoClose) {
			throw new Error("autoCloseTimeout is set, but autoClose is not enabled");
		}

		this.autoClose = (options && options.autoClose) || false;

		this.autoCloseTimeout = (options && options.autoCloseTimeout) || 500;

		this.minDistance = (options && options.minDistance) || 20;

		// We want to have some defaults, but also allow key bindings
		// to be explicitly turned off
		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else {
			const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };
			this.keyEvents =
				options && options.keyEvents
					? { ...defaultKeyEvents, ...options.keyEvents }
					: defaultKeyEvents;
		}

		this.validate = options?.validation;
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		const finishedId = this.currentId;

		if (this.validate && finishedId) {
			const currentGeometry = this.store.getGeometryCopy<Polygon>(finishedId);

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
		this.hasLeftStartingPoint = false;
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
			return;
		}

		const currentLineGeometry = this.store.getGeometryCopy<Polygon>(
			this.currentId,
		);

		const previousIndex = currentLineGeometry.coordinates[0].length - 2;
		const [previousLng, previousLat] =
			currentLineGeometry.coordinates[0][previousIndex];
		const { x, y } = this.project(previousLng, previousLat);
		const distance = cartesianDistance(
			{ x, y },
			{ x: event.containerX, y: event.containerY },
		);

		const [closingLng, closingLat] = currentLineGeometry.coordinates[0][0];
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

		currentLineGeometry.coordinates[0].pop();

		const newGeometry = {
			type: "Polygon",
			coordinates: [
				[
					...currentLineGeometry.coordinates[0],
					[event.lng, event.lat],
					currentLineGeometry.coordinates[0][0],
				],
			],
		} as Polygon;

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
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		if (this.preventNewFeature) {
			return;
		}

		if (this.startingClick === false) {
			const [createdId, closingPointId] = this.store.create([
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
					properties: { mode: this.mode },
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
			this.setDrawing();

			return;
		}

		this.close();
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

			styles.zIndex = 10;

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

			styles.zIndex = 40;

			return styles;
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePolygonFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}
}
