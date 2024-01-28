import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
} from "../../common";
import { LineString } from "geojson";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { BehaviorConfig } from "../base.behavior";
import { getDefaultStyling } from "../../util/styling";
import { FeatureId, GeoJSONStoreFeatures } from "../../store/store";
import { greatCircleLine } from "../../geometry/shape/great-circle-line";
import { GreatCircleSnappingBehavior } from "../great-circle-snapping.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";

type TerraDrawGreateCircleModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

type GreateCircleStyling = {
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

interface TerraDrawGreatCircleModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	snapping?: boolean;
	pointerDistance?: number;
	keyEvents?: TerraDrawGreateCircleModeKeyEvents | null;
	cursors?: Cursors;
}

export class TerraDrawGreatCircleMode extends TerraDrawBaseDrawMode<GreateCircleStyling> {
	mode = "greatcircle";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private closingPointId: FeatureId | undefined;
	private keyEvents: TerraDrawGreateCircleModeKeyEvents;
	private snappingEnabled: boolean;
	private cursors: Required<Cursors>;

	// Behaviors
	private snapping!: GreatCircleSnappingBehavior;

	constructor(options?: TerraDrawGreatCircleModeOptions<GreateCircleStyling>) {
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

		this.snappingEnabled =
			options && options.snapping !== undefined ? options.snapping : false;

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

		// Reset the state back to starting state
		this.closingPointId && this.store.delete([this.closingPointId]);
		this.currentCoordinate = 0;
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
	registerBehaviors(config: BehaviorConfig) {
		this.snapping = new GreatCircleSnappingBehavior(
			config,
			new PixelDistanceBehavior(config),
			new ClickBoundingBoxBehavior(config),
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
	onMouseMove(event: TerraDrawMouseEvent) {
		this.setCursor(this.cursors.start);

		if (this.currentId === undefined && this.currentCoordinate === 0) {
			return;
		} else if (
			this.currentId &&
			this.currentCoordinate === 1 &&
			this.closingPointId
		) {
			const snappedCoord =
				this.currentId &&
				this.snappingEnabled &&
				this.snapping.getSnappableCoordinate(event, this.currentId);

			const updatedCoord = snappedCoord ? snappedCoord : [event.lng, event.lat];

			this.store.updateGeometry([
				{
					id: this.closingPointId,
					geometry: { type: "Point", coordinates: updatedCoord },
				},
			]);

			const currentLineGeometry = this.store.getGeometryCopy<LineString>(
				this.currentId,
			);

			// Remove the 'live' point that changes on mouse move
			currentLineGeometry.coordinates.pop();

			// Update the 'live' point
			const greatCircle = greatCircleLine({
				start: currentLineGeometry.coordinates[0],
				end: updatedCoord,
				options: { coordinatePrecision: this.coordinatePrecision },
			});

			if (greatCircle) {
				this.store.updateGeometry([
					{
						id: this.currentId,
						geometry: greatCircle.geometry,
					},
				]);
			}
		}
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		if (this.currentCoordinate === 0) {
			const snappedCoord =
				this.snappingEnabled && this.snapping.getSnappableCoordinate(event);

			const updatedCoord = snappedCoord ? snappedCoord : [event.lng, event.lat];

			const [createdId] = this.store.create([
				{
					geometry: {
						type: "LineString",
						coordinates: [
							updatedCoord,
							updatedCoord, // This is the 'live' point that changes on mouse move
						],
					},
					properties: { mode: this.mode },
				},
			]);
			this.currentId = createdId;

			const [pointId] = this.store.create([
				{
					geometry: {
						type: "Point",
						coordinates: updatedCoord,
					},
					properties: { mode: this.mode },
				},
			]);
			this.closingPointId = pointId;

			this.currentCoordinate++;
			this.setDrawing();
		} else if (this.currentCoordinate === 1 && this.currentId) {
			// We are creating the point so we immediately want
			// to set the point cursor to show it can be closed
			this.setCursor("pointer");
			this.close();
		}
	}

	/** @internal */
	onKeyDown() {}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		}

		if (event.key === this.keyEvents.finish) {
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
		this.currentCoordinate = 0;
		if (this.state === "drawing") {
			this.setStarted();
		}
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

			return styles;
		} else if (
			feature.type === "Feature" &&
			feature.geometry.type === "Point" &&
			feature.properties.mode === this.mode
		) {
			styles.pointColor = this.getHexColorStylingValue(
				this.styles.closingPointColor,
				styles.pointColor,
				feature,
			);

			styles.pointWidth = this.getNumericStylingValue(
				this.styles.closingPointWidth,
				styles.pointWidth,
				feature,
			);

			styles.pointOutlineColor = this.getHexColorStylingValue(
				this.styles.closingPointOutlineColor,
				"#ffffff",
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
				feature.geometry.type === "LineString" &&
				feature.properties.mode === this.mode &&
				feature.geometry.coordinates.length >= 2
			);
		} else {
			return false;
		}
	}
}
