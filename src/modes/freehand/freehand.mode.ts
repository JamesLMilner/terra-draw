import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
} from "../../common";
import { Polygon } from "geojson";

import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { getDefaultStyling } from "../../util/styling";
import { FeatureId, GeoJSONStoreFeatures } from "../../store/store";
import { pixelDistance } from "../../geometry/measure/pixel-distance";
import { isValidPolygonFeature } from "../../geometry/boolean/is-valid-polygon-feature";

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
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		const finishedId = this.currentId;

		this.closingPointId && this.store.delete([this.closingPointId]);
		this.startingClick = false;
		this.currentId = undefined;
		this.closingPointId = undefined;
		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		// Ensure that any listerers are triggered with the main created geometry
		this.onFinish(finishedId);
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

		const [previousLng, previousLat] =
			currentLineGeometry.coordinates[0][
				currentLineGeometry.coordinates[0].length - 2
			];
		const { x, y } = this.project(previousLng, previousLat);
		const distance = pixelDistance(
			{ x, y },
			{ x: event.containerX, y: event.containerY },
		);

		const [closingLng, closingLat] = currentLineGeometry.coordinates[0][0];
		const { x: closingX, y: closingY } = this.project(closingLng, closingLat);
		const closingDistance = pixelDistance(
			{ x: closingX, y: closingY },
			{ x: event.containerX, y: event.containerY },
		);

		if (closingDistance < this.pointerDistance) {
			this.setCursor(this.cursors.close);

			// We want to prohibit drawing new points at or around the closing
			// point as it can be non user friendly
			if (this.preventPointsNearClose) {
				return;
			}
		} else {
			this.setCursor(this.cursors.start);
		}

		// The cusor must have moved a minimum distance
		// before we add another coordinate
		if (distance < this.minDistance) {
			return;
		}

		currentLineGeometry.coordinates[0].pop();

		this.store.updateGeometry([
			{
				id: this.currentId,
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							...currentLineGeometry.coordinates[0],
							[event.lng, event.lat],
							currentLineGeometry.coordinates[0][0],
						],
					],
				},
			},
		]);
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
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
					properties: { mode: this.mode },
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
		try {
			if (this.currentId) {
				this.store.delete([this.currentId]);
			}
			if (this.closingPointId) {
				this.store.delete([this.closingPointId]);
			}
		} catch (error) {}
		this.closingPointId = undefined;
		this.currentId = undefined;
		this.startingClick = false;
		if (this.state === "drawing") {
			this.setStarted();
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

			return styles;
		}

		return styles;
	}

	validateFeature(feature: unknown): feature is GeoJSONStoreFeatures {
		if (super.validateFeature(feature)) {
			return (
				feature.properties.mode === this.mode &&
				isValidPolygonFeature(feature, this.coordinatePrecision)
			);
		} else {
			return false;
		}
	}
}
