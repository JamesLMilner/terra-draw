import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
} from "../../common";
import { LineString, Point, Position } from "geojson";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { cartesianDistance } from "../../geometry/measure/pixel-distance";
import { BehaviorConfig } from "../base.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { SnappingBehavior } from "../snapping.behavior";
import { getDefaultStyling } from "../../util/styling";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	GeoJSONStoreGeometries,
} from "../../store/store";
import { InsertCoordinatesBehavior } from "../insert-coordinates.behavior";
import { haversineDistanceKilometers } from "../../geometry/measure/haversine-distance";
import { coordinatesIdentical } from "../../geometry/coordinates-identical";

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

interface InertCoordinates {
	strategy: "amount"; // In future this could be extended
	value: number;
}

interface TerraDrawLineStringModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	snapping?: boolean;
	pointerDistance?: number;
	keyEvents?: TerraDrawLineStringModeKeyEvents | null;
	cursors?: Cursors;
	insertCoordinates?: InertCoordinates;
}

export class TerraDrawLineStringMode extends TerraDrawBaseDrawMode<LineStringStyling> {
	mode = "linestring";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private closingPointId: FeatureId | undefined;
	private keyEvents: TerraDrawLineStringModeKeyEvents;
	private snappingEnabled: boolean;
	private cursors: Required<Cursors>;
	private mouseMove = false;
	private insertCoordinates: InertCoordinates | undefined;
	private lastCommitedCoordinates: Position[] | undefined;

	// Behaviors
	private snapping!: SnappingBehavior;
	private insertPoint!: InsertCoordinatesBehavior;

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

		this.insertCoordinates = options?.insertCoordinates;
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

		this.updateGeometries(
			[...currentLineGeometry.coordinates],
			undefined,
			UpdateTypes.Commit,
		);

		const finishedId = this.currentId;

		// Reset the state back to starting state
		this.closingPointId && this.store.delete([this.closingPointId]);
		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.closingPointId = undefined;
		this.lastCommitedCoordinates = undefined;

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		// Ensure that any listeners are triggered with the main created geometry
		this.onFinish(finishedId, { mode: this.mode, action: "draw" });
	}

	private updateGeometries(
		coordinates: LineString["coordinates"],
		closingPointCoordinate: Point["coordinates"] | undefined,
		updateType: UpdateTypes,
	) {
		if (!this.currentId) {
			return;
		}

		const updatedGeometry = { type: "LineString", coordinates } as LineString;

		if (this.validate) {
			const valid = this.validate(
				{
					type: "Feature",
					geometry: updatedGeometry,
				} as GeoJSONStoreFeatures,
				{
					project: this.project,
					unproject: this.unproject,
					coordinatePrecision: this.coordinatePrecision,
					updateType: updateType,
				},
			);

			if (!valid) {
				return;
			}
		}

		const geometries = [
			{
				id: this.currentId,
				geometry: updatedGeometry,
			},
		] as {
			id: FeatureId;
			geometry: GeoJSONStoreGeometries;
		}[];

		if (this.closingPointId && closingPointCoordinate) {
			geometries.push({
				id: this.closingPointId,
				geometry: {
					type: "Point",
					coordinates: closingPointCoordinate,
				},
			});
		}

		if (updateType === "commit") {
			this.lastCommitedCoordinates = updatedGeometry.coordinates;
		}

		this.store.updateGeometry(geometries);
	}

	private generateInsertCoordinates(startCoord: Position, endCoord: Position) {
		if (!this.insertCoordinates || !this.lastCommitedCoordinates) {
			throw new Error("Not able to insert coordinates");
		}

		// Other strategies my be implemented in the future
		if (this.insertCoordinates.strategy !== "amount") {
			throw new Error("Strategy does not exist");
		}

		const distance = haversineDistanceKilometers(startCoord, endCoord);
		const segmentDistance = distance / (this.insertCoordinates.value + 1);
		let insertedCoordinates: Position[] = [];

		if (this.projection === "globe") {
			insertedCoordinates =
				this.insertPoint.generateInsertionGeodesicCoordinates(
					startCoord,
					endCoord,
					segmentDistance,
				);
		} else if (this.projection === "web-mercator") {
			insertedCoordinates = this.insertPoint.generateInsertionCoordinates(
				startCoord,
				endCoord,
				segmentDistance,
			);
		}

		return insertedCoordinates;
	}

	private createLine(startingCoord: Position) {
		const [createdId] = this.store.create([
			{
				geometry: {
					type: "LineString",
					coordinates: [
						startingCoord,
						startingCoord, // This is the 'live' point that changes on mouse move
					],
				},
				properties: { mode: this.mode },
			},
		]);
		this.lastCommitedCoordinates = [startingCoord, startingCoord];
		this.currentId = createdId;
		this.currentCoordinate++;
		this.setDrawing();
	}

	private firstUpdateToLine(updatedCoord: Position) {
		if (!this.currentId) {
			return;
		}

		const currentLineGeometry = this.store.getGeometryCopy<LineString>(
			this.currentId,
		);

		const currentCoordinates = currentLineGeometry.coordinates;

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

		const initialLineCoordinates = [...currentCoordinates, updatedCoord];
		const closingPointCoordinate = undefined; // We don't need this until second click

		this.updateGeometries(
			initialLineCoordinates,
			closingPointCoordinate,
			UpdateTypes.Commit,
		);

		this.currentCoordinate++;
	}

	private updateToLine(
		updatedCoord: Position,
		cursorXY: { x: number; y: number },
	) {
		if (!this.currentId) {
			return;
		}
		const currentLineGeometry = this.store.getGeometryCopy<LineString>(
			this.currentId,
		);

		const currentCoordinates = currentLineGeometry.coordinates;

		// If we are not inserting points we can get the penultimate coordinated
		const [previousLng, previousLat] = this.lastCommitedCoordinates
			? this.lastCommitedCoordinates[this.lastCommitedCoordinates.length - 1]
			: currentCoordinates[currentCoordinates.length - 2];

		// Determine if the click closes the line and finished drawing
		const { x, y } = this.project(previousLng, previousLat);
		const distance = cartesianDistance(
			{ x, y },
			{ x: cursorXY.x, y: cursorXY.y },
		);
		const isClosingClick = distance < this.pointerDistance;

		if (isClosingClick) {
			this.close();
			return;
		}

		// The cursor will immediately change to closing because the
		// closing point will be underneath the cursor
		this.setCursor(this.cursors.close);

		const updatedLineCoordinates = [...currentCoordinates, updatedCoord];
		const updatedClosingPointCoordinate =
			currentCoordinates[currentCoordinates.length - 1];

		this.updateGeometries(
			updatedLineCoordinates,
			updatedClosingPointCoordinate,
			UpdateTypes.Commit,
		);

		this.currentCoordinate++;
	}

	/** @internal */
	registerBehaviors(config: BehaviorConfig) {
		this.snapping = new SnappingBehavior(
			config,
			new PixelDistanceBehavior(config),
			new ClickBoundingBoxBehavior(config),
		);

		this.insertPoint = new InsertCoordinatesBehavior(config);
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

		const currentCoordinates = currentLineGeometry.coordinates;

		// Remove the 'live' point that changes on mouse move
		currentCoordinates.pop();

		const snappedCoord =
			this.snappingEnabled &&
			this.snapping.getSnappableCoordinate(event, this.currentId);
		const updatedCoord = snappedCoord ? snappedCoord : [event.lng, event.lat];

		// We want to ensure that when we are hovering over
		// the closing point that the pointer cursor is shown
		if (this.closingPointId) {
			const [previousLng, previousLat] =
				currentCoordinates[currentCoordinates.length - 1];
			const { x, y } = this.project(previousLng, previousLat);
			const distance = cartesianDistance(
				{ x, y },
				{ x: event.containerX, y: event.containerY },
			);

			const isClosingClick = distance < this.pointerDistance;

			if (isClosingClick) {
				this.setCursor(this.cursors.close);
			}
		}

		let line = [...currentCoordinates, updatedCoord];

		if (
			this.insertCoordinates &&
			this.currentId &&
			this.lastCommitedCoordinates
		) {
			const startCoord =
				this.lastCommitedCoordinates[this.lastCommitedCoordinates.length - 1];
			const endCoord = updatedCoord;
			if (!coordinatesIdentical(startCoord, endCoord)) {
				const insertedCoordinates = this.generateInsertCoordinates(
					startCoord,
					endCoord,
				);
				line = [
					...this.lastCommitedCoordinates.slice(0, -1),
					...insertedCoordinates,
					updatedCoord,
				];
			}
		}

		// Update the 'live' point
		this.updateGeometries(line, undefined, UpdateTypes.Provisional);
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
			this.createLine(updatedCoord);
		} else if (this.currentCoordinate === 1 && this.currentId) {
			this.firstUpdateToLine(updatedCoord);
		} else if (this.currentId) {
			this.updateToLine(updatedCoord, {
				x: event.containerX,
				y: event.containerY,
			});
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
		const cleanUpId = this.currentId;

		this.closingPointId = undefined;
		this.currentId = undefined;
		this.currentCoordinate = 0;
		if (this.state === "drawing") {
			this.setStarted();
		}

		try {
			if (cleanUpId !== undefined) {
				this.store.delete([cleanUpId]);
			}
			if (this.closingPointId !== undefined) {
				this.store.delete([this.closingPointId]);
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

			styles.zIndex = 10;

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

			styles.zIndex = 40;

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
