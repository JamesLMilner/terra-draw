import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
} from "../../common";
import { LineString } from "geojson";
import { selfIntersects } from "../../geometry/boolean/self-intersects";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { pixelDistance } from "../../geometry/measure/pixel-distance";
import { BehaviorConfig } from "../base.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { SnappingBehavior } from "../snapping.behavior";
import { getDefaultStyling } from "../../util/styling";
import { FeatureId, GeoJSONStoreFeatures } from "../../store/store";

type TerraDrawLineStringModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

type LineStringStyling = {
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

interface TerraDrawLineStringModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	snapping?: boolean;
	allowSelfIntersections?: boolean;
	pointerDistance?: number;
	keyEvents?: TerraDrawLineStringModeKeyEvents | null;
	cursors?: Cursors;
}

export class TerraDrawLineStringMode extends TerraDrawBaseDrawMode<LineStringStyling> {
	mode = "linestring";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private closingPointId: FeatureId | undefined;
	private allowSelfIntersections;
	private keyEvents: TerraDrawLineStringModeKeyEvents;
	private snappingEnabled: boolean;
	private cursors: Required<Cursors>;
	private mouseMove = false;

	// Behaviors
	private snapping!: SnappingBehavior;

	constructor(options?: TerraDrawLineStringModeOptions<LineStringStyling>) {
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

		this.allowSelfIntersections =
			options && options.allowSelfIntersections !== undefined
				? options.allowSelfIntersections
				: true;

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

		const currentLineGeometry = this.store.getGeometryCopy<LineString>(
			this.currentId,
		);

		// Finish off the drawing
		currentLineGeometry.coordinates.pop();
		this.store.updateGeometry([
			{
				id: this.currentId,
				geometry: {
					type: "LineString",
					coordinates: [...currentLineGeometry.coordinates],
				},
			},
		]);

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
		this.snapping = new SnappingBehavior(
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
		this.mouseMove = true;
		this.setCursor(this.cursors.start);

		if (this.currentId === undefined || this.currentCoordinate === 0) {
			return;
		}
		const currentLineGeometry = this.store.getGeometryCopy<LineString>(
			this.currentId,
		);

		// Remove the 'live' point that changes on mouse move
		currentLineGeometry.coordinates.pop();

		const snappedCoord =
			this.snappingEnabled &&
			this.snapping.getSnappableCoordinate(event, this.currentId);
		const updatedCoord = snappedCoord ? snappedCoord : [event.lng, event.lat];

		// We want to ensure that when we are hovering over
		// the losign point that the pointer cursor is shown
		if (this.closingPointId) {
			const [previousLng, previousLat] =
				currentLineGeometry.coordinates[
					currentLineGeometry.coordinates.length - 1
				];
			const { x, y } = this.project(previousLng, previousLat);
			const distance = pixelDistance(
				{ x, y },
				{ x: event.containerX, y: event.containerY },
			);

			const isClosingClick = distance < this.pointerDistance;

			if (isClosingClick) {
				this.setCursor(this.cursors.close);
			}
		}

		// Update the 'live' point
		this.store.updateGeometry([
			{
				id: this.currentId,
				geometry: {
					type: "LineString",
					coordinates: [...currentLineGeometry.coordinates, updatedCoord],
				},
			},
		]);
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		// We want pointer devices (mobile/tablet) to have
		// similar behaviour to mouse based devices so we
		// trigger a mousemove event before every click
		// if one has not been trigged to emulate this
		if (this.currentCoordinate > 0 && !this.mouseMove) {
			this.onMouseMove(event);
		}
		this.mouseMove = false;

		const snappedCoord =
			this.currentId &&
			this.snappingEnabled &&
			this.snapping.getSnappableCoordinate(event, this.currentId);
		const updatedCoord = snappedCoord ? snappedCoord : [event.lng, event.lat];

		if (this.currentCoordinate === 0) {
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
			this.currentCoordinate++;
			this.setDrawing();
		} else if (this.currentCoordinate === 1 && this.currentId) {
			const currentLineGeometry = this.store.getGeometryCopy<LineString>(
				this.currentId,
			);

			const [pointId] = this.store.create([
				{
					geometry: {
						type: "Point",
						coordinates: [...updatedCoord],
					},
					properties: { mode: this.mode },
				},
			]);
			this.closingPointId = pointId;

			// We are creating the point so we immediately want
			// to set the point cursor to show it can be closed
			this.setCursor(this.cursors.close);

			this.store.updateGeometry([
				{
					id: this.currentId,
					geometry: {
						type: "LineString",
						coordinates: [
							currentLineGeometry.coordinates[0],
							updatedCoord,
							updatedCoord,
						],
					},
				},
			]);

			this.currentCoordinate++;
		} else if (this.currentId) {
			const currentLineGeometry = this.store.getGeometryCopy<LineString>(
				this.currentId,
			);

			const [previousLng, previousLat] =
				currentLineGeometry.coordinates[
					currentLineGeometry.coordinates.length - 2
				];
			const { x, y } = this.project(previousLng, previousLat);
			const distance = pixelDistance(
				{ x, y },
				{ x: event.containerX, y: event.containerY },
			);

			const isClosingClick = distance < this.pointerDistance;

			if (isClosingClick) {
				this.close();
			} else {
				// If not close to the final point, keep adding points
				const newLineString = {
					type: "LineString",
					coordinates: [...currentLineGeometry.coordinates, updatedCoord],
				} as LineString;

				if (!this.allowSelfIntersections) {
					const hasSelfIntersections = selfIntersects({
						type: "Feature",
						geometry: newLineString,
						properties: {},
					});

					if (hasSelfIntersections) {
						return;
					}
				}

				if (this.closingPointId) {
					this.setCursor(this.cursors.close);

					this.store.updateGeometry([
						{ id: this.currentId, geometry: newLineString },
						{
							id: this.closingPointId,
							geometry: {
								type: "Point",
								coordinates:
									currentLineGeometry.coordinates[
										currentLineGeometry.coordinates.length - 1
									],
							},
						},
					]);
					this.currentCoordinate++;
				}
			}
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
