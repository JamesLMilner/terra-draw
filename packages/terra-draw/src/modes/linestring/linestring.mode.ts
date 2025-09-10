import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	CartesianPoint,
	Z_INDEX,
	Snapping,
	COMMON_PROPERTIES,
} from "../../common";
import { Feature, LineString, Point, Position } from "geojson";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { cartesianDistance } from "../../geometry/measure/pixel-distance";
import { BehaviorConfig } from "../base.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { CoordinateSnappingBehavior } from "../coordinate-snapping.behavior";
import { getDefaultStyling } from "../../util/styling";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	GeoJSONStoreGeometries,
	StoreValidation,
} from "../../store/store";
import { InsertCoordinatesBehavior } from "../insert-coordinates.behavior";
import { haversineDistanceKilometers } from "../../geometry/measure/haversine-distance";
import { coordinatesIdentical } from "../../geometry/coordinates-identical";
import { ValidateLineStringFeature } from "../../validations/linestring.validation";
import { LineSnappingBehavior } from "../line-snapping.behavior";

type TerraDrawLineStringModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" } as const;

type LineStringStyling = {
	lineStringWidth: NumericStyling;
	lineStringColor: HexColorStyling;
	closingPointColor: HexColorStyling;
	closingPointWidth: NumericStyling;
	closingPointOutlineColor: HexColorStyling;
	closingPointOutlineWidth: NumericStyling;
	snappingPointColor: HexColorStyling;
	snappingPointWidth: NumericStyling;
	snappingPointOutlineColor: HexColorStyling;
	snappingPointOutlineWidth: NumericStyling;

	zIndex: NumericStyling;
};

interface Cursors {
	start?: Cursor;
	close?: Cursor;
	dragStart?: Cursor;
	dragEnd?: Cursor;
}

const defaultCursors = {
	start: "crosshair",
	close: "pointer",
	dragStart: "grabbing",
	dragEnd: "crosshair",
} as Required<Cursors>;

interface InertCoordinates {
	strategy: "amount"; // In future this could be extended
	value: number;
}

interface TerraDrawLineStringModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	snapping?: Snapping;
	pointerDistance?: number;
	keyEvents?: TerraDrawLineStringModeKeyEvents | null;
	cursors?: Cursors;
	insertCoordinates?: InertCoordinates;
	editable?: boolean;
}

export class TerraDrawLineStringMode extends TerraDrawBaseDrawMode<LineStringStyling> {
	mode = "linestring" as const;

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private closingPointId: FeatureId | undefined;
	private keyEvents: TerraDrawLineStringModeKeyEvents = defaultKeyEvents;
	private snapping: Snapping | undefined;
	private cursors: Required<Cursors> = defaultCursors;
	private mouseMove = false;
	private insertCoordinates: InertCoordinates | undefined;
	private lastCommittedCoordinates: Position[] | undefined;
	private snappedPointId: FeatureId | undefined;
	private lastMouseMoveEvent: TerraDrawMouseEvent | undefined;

	// Editable properties
	private editable: boolean = false;
	private editedFeatureId: FeatureId | undefined;
	private editedFeatureCoordinateIndex: number | undefined;
	private editedSnapType: "line" | "coordinate" | undefined;
	private editedInsertIndex: number | undefined;
	private editedPointId: FeatureId | undefined;

	// Behaviors
	private coordinateSnapping!: CoordinateSnappingBehavior;
	private insertPoint!: InsertCoordinatesBehavior;
	private lineSnapping!: LineSnappingBehavior;
	private pixelDistance!: PixelDistanceBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;

	constructor(options?: TerraDrawLineStringModeOptions<LineStringStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	updateOptions(
		options?: TerraDrawLineStringModeOptions<LineStringStyling> | undefined,
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

		if (options?.insertCoordinates) {
			this.insertCoordinates = options.insertCoordinates;
		}

		if (options && options.editable) {
			this.editable = options.editable;
		}
	}

	private updateSnappedCoordinate(event: TerraDrawMouseEvent) {
		const snappedCoordinate = this.snapCoordinate(event);

		if (snappedCoordinate) {
			if (this.snappedPointId) {
				this.store.updateGeometry([
					{
						id: this.snappedPointId,
						geometry: {
							type: "Point",
							coordinates: snappedCoordinate,
						},
					},
				]);
			} else {
				const [snappedPointId] = this.store.create([
					{
						geometry: {
							type: "Point",
							coordinates: snappedCoordinate,
						},
						properties: {
							mode: this.mode,
							[COMMON_PROPERTIES.SNAPPING_POINT]: true,
						},
					},
				]);

				this.snappedPointId = snappedPointId;
			}

			event.lng = snappedCoordinate[0];
			event.lat = snappedCoordinate[1];
		} else if (this.snappedPointId) {
			this.store.delete([this.snappedPointId]);
			this.snappedPointId = undefined;
		}

		return snappedCoordinate;
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

		this.store.updateProperty([
			{
				id: this.currentId,
				property: COMMON_PROPERTIES.CURRENTLY_DRAWING,
				value: undefined,
			},
		]);

		const finishedId = this.currentId;

		// Reset the state back to starting state
		if (this.closingPointId) {
			this.store.delete([this.closingPointId]);
		}

		if (this.snappedPointId) {
			this.store.delete([this.snappedPointId]);
		}

		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.closingPointId = undefined;
		this.snappedPointId = undefined;
		this.lastCommittedCoordinates = undefined;

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
			const validationResult = this.validate(
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

			if (!validationResult.valid) {
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
			this.lastCommittedCoordinates = updatedGeometry.coordinates;
		}

		this.store.updateGeometry(geometries);
	}

	private generateInsertCoordinates(startCoord: Position, endCoord: Position) {
		if (!this.insertCoordinates || !this.lastCommittedCoordinates) {
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
				properties: {
					mode: this.mode,
					[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true, // This is the current line being drawn
				},
			},
		]);
		this.lastCommittedCoordinates = [startingCoord, startingCoord];
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
				properties: {
					mode: this.mode,
					[COMMON_PROPERTIES.CLOSING_POINT]: true,
				},
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

	private updateToLine(updatedCoord: Position, cursorXY: CartesianPoint) {
		if (!this.currentId) {
			return;
		}
		const currentLineGeometry = this.store.getGeometryCopy<LineString>(
			this.currentId,
		);

		const currentCoordinates = currentLineGeometry.coordinates;

		// If we are not inserting points we can get the penultimate coordinated
		const [previousLng, previousLat] = this.lastCommittedCoordinates
			? this.lastCommittedCoordinates[this.lastCommittedCoordinates.length - 1]
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
		this.coordinateSnapping = new CoordinateSnappingBehavior(
			config,
			new PixelDistanceBehavior(config),
			new ClickBoundingBoxBehavior(config),
		);

		this.insertPoint = new InsertCoordinatesBehavior(config);

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
		this.lastMouseMoveEvent = event;

		const snappedCoordinate = this.updateSnappedCoordinate(event);

		const updatedCoord = snappedCoordinate
			? snappedCoordinate
			: [event.lng, event.lat];

		if (this.currentId === undefined || this.currentCoordinate === 0) {
			return;
		}

		const currentLineGeometry = this.store.getGeometryCopy<LineString>(
			this.currentId,
		);

		const currentCoordinates = currentLineGeometry.coordinates;

		// Remove the 'live' point that changes on mouse move
		currentCoordinates.pop();

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
			this.lastCommittedCoordinates
		) {
			const startCoord =
				this.lastCommittedCoordinates[this.lastCommittedCoordinates.length - 1];
			const endCoord = updatedCoord;
			if (!coordinatesIdentical(startCoord, endCoord)) {
				const insertedCoordinates = this.generateInsertCoordinates(
					startCoord,
					endCoord,
				);
				line = [
					...this.lastCommittedCoordinates.slice(0, -1),
					...insertedCoordinates,
					updatedCoord,
				];
			}
		}

		// Update the 'live' point
		this.updateGeometries(line, undefined, UpdateTypes.Provisional);
	}

	private onRightClick(event: TerraDrawMouseEvent) {
		if (!this.editable || this.state !== "started") {
			return;
		}

		const { featureId, featureCoordinateIndex: coordinateIndex } =
			this.coordinateSnapping.getSnappable(event, (feature) =>
				this.lineStringFilter(feature),
			);

		if (!featureId || coordinateIndex === undefined) {
			return;
		}

		const geometry = this.store.getGeometryCopy(featureId);

		let coordinates;
		if (geometry.type === "LineString") {
			coordinates = geometry.coordinates;

			// Prevent creating an invalid linestring
			if (coordinates.length <= 2) {
				return;
			}
		} else {
			return;
		}

		// Remove coordinate from array
		coordinates.splice(coordinateIndex, 1);

		// Validate the new geometry
		if (this.validate) {
			const validationResult = this.validate(
				{
					id: featureId,
					type: "Feature",
					geometry,
					properties: {},
				},
				{
					project: this.project,
					unproject: this.unproject,
					coordinatePrecision: this.coordinatePrecision,
					updateType: UpdateTypes.Commit,
				},
			);
			if (!validationResult.valid) {
				return;
			}
		}

		// The geometry has changed, so if we were snapped to a point we need to remove it
		if (this.snappedPointId) {
			this.store.delete([this.snappedPointId]);
			this.snappedPointId = undefined;
		}

		this.store.updateGeometry([
			{
				id: featureId,
				geometry,
			},
		]);

		this.onFinish(featureId, { mode: this.mode, action: "edit" });
	}

	private onLeftClick(event: TerraDrawMouseEvent) {
		// Reset the snapping point
		if (this.snappedPointId) {
			this.store.delete([this.snappedPointId]);
			this.snappedPointId = undefined;
		}

		const snappedCoordinate = this.snapCoordinate(event);
		const updatedCoordinate = snappedCoordinate
			? snappedCoordinate
			: [event.lng, event.lat];

		if (this.currentCoordinate === 0) {
			this.createLine(updatedCoordinate);
		} else if (this.currentCoordinate === 1 && this.currentId) {
			this.firstUpdateToLine(updatedCoordinate);
		} else if (this.currentId) {
			this.updateToLine(updatedCoordinate, {
				x: event.containerX,
				y: event.containerY,
			});
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
			// We want pointer devices (mobile/tablet) to have
			// similar behaviour to mouse based devices so we
			// trigger a mousemove event before every click
			// if one has not been triggered to emulate this
			if (this.currentCoordinate > 0 && !this.mouseMove) {
				this.onMouseMove(event);
			}
			this.mouseMove = false;

			if (event.button === "right") {
				this.onRightClick(event);
			} else if (event.button === "left") {
				this.onLeftClick(event);
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
	onDragStart(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDragStart, event)) {
			return;
		}

		if (!this.editable) {
			return;
		}

		let snappedCoordinate: Position | undefined = undefined;

		if (this.state === "started") {
			const lineSnapped = this.lineSnapping.getSnappable(event, (feature) =>
				this.lineStringFilter(feature),
			);

			if (lineSnapped.coordinate) {
				this.editedSnapType = "line";
				this.editedFeatureCoordinateIndex = lineSnapped.featureCoordinateIndex;
				this.editedFeatureId = lineSnapped.featureId;
				snappedCoordinate = lineSnapped.coordinate;
			}

			const coordinateSnapped = this.coordinateSnapping.getSnappable(
				event,
				(feature) => this.lineStringFilter(feature),
			);

			if (coordinateSnapped.coordinate) {
				this.editedSnapType = "coordinate";
				this.editedFeatureCoordinateIndex =
					coordinateSnapped.featureCoordinateIndex;
				this.editedFeatureId = coordinateSnapped.featureId;
				snappedCoordinate = coordinateSnapped.coordinate;
			}
		}

		// We only need to stop the map dragging if
		// we actually have something selected
		if (!this.editedFeatureId || !snappedCoordinate) {
			return;
		}

		// Create a point to drag when editing
		if (!this.editedPointId) {
			const [editedPointId] = this.store.create([
				{
					geometry: {
						type: "Point",
						coordinates: snappedCoordinate,
					},
					properties: {
						mode: this.mode,
						[COMMON_PROPERTIES.EDITED]: true,
					},
				},
			]);

			this.editedPointId = editedPointId;
		}

		// Drag Feature
		this.setCursor(this.cursors.dragStart);

		setMapDraggability(false);
	}

	/** @internal */
	onDrag(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDrag, event)) {
			return;
		}

		if (
			this.editedFeatureId === undefined ||
			this.editedFeatureCoordinateIndex === undefined
		) {
			return;
		}

		const featureCopy: LineString = this.store.getGeometryCopy(
			this.editedFeatureId,
		);
		const featureCoordinates = featureCopy.coordinates;

		// Either it's a coordinate drag or a line drag where the line coordinate has already been inserted
		if (
			this.editedSnapType === "coordinate" ||
			(this.editedSnapType === "line" && this.editedInsertIndex !== undefined)
		) {
			featureCoordinates[this.editedFeatureCoordinateIndex] = [
				event.lng,
				event.lat,
			];
		} else if (
			this.editedSnapType === "line" &&
			this.editedInsertIndex === undefined
		) {
			// Splice inserts _before_ the index, so we need to add 1
			this.editedInsertIndex = this.editedFeatureCoordinateIndex + 1;

			// Insert the new dragged snapped line coordinate
			featureCopy.coordinates.splice(this.editedInsertIndex, 0, [
				event.lng,
				event.lat,
			]);

			// We have inserted a point, need to change the edit index
			// so it can be moved correctly when it gets dragged again
			this.editedFeatureCoordinateIndex++;
		}

		const newLineStringGeometry = {
			type: "LineString",
			coordinates: featureCopy.coordinates,
		} as LineString;

		if (this.validate) {
			const validationResult = this.validate(
				{
					type: "Feature",
					geometry: newLineStringGeometry,
					properties: this.store.getPropertiesCopy(this.editedFeatureId),
				} as GeoJSONStoreFeatures,
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

		if (this.snapping && this.snappedPointId) {
			this.store.delete([this.snappedPointId]);
			this.snappedPointId = undefined;
		}

		this.store.updateGeometry([
			{
				id: this.editedFeatureId,
				geometry: newLineStringGeometry,
			},
		]);

		if (this.editedPointId) {
			this.store.updateGeometry([
				{
					id: this.editedPointId,
					geometry: {
						type: "Point",
						coordinates: [event.lng, event.lat],
					},
				},
			]);
		}

		this.store.updateProperty([
			{
				id: this.editedFeatureId,
				property: COMMON_PROPERTIES.EDITED,
				value: true,
			},
		]);
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

		this.setCursor(this.cursors.dragEnd);

		if (this.editedPointId) {
			this.store.delete([this.editedPointId]);
			this.editedPointId = undefined;
		}

		this.store.updateProperty([
			{
				id: this.editedFeatureId,
				property: COMMON_PROPERTIES.EDITED,
				value: false,
			},
		]);

		this.onFinish(this.editedFeatureId, { mode: this.mode, action: "edit" });

		// Reset edit state
		this.editedFeatureId = undefined;
		this.editedFeatureCoordinateIndex = undefined;
		this.editedInsertIndex = undefined;
		this.editedSnapType = undefined;

		setMapDraggability(true);
	}

	/** @internal */
	cleanUp() {
		const cleanUpId = this.currentId;
		const cleanupClosingPointId = this.closingPointId;
		const snappedPointId = this.snappedPointId;

		this.closingPointId = undefined;
		this.snappedPointId = undefined;
		this.currentId = undefined;
		this.currentCoordinate = 0;
		if (this.state === "drawing") {
			this.setStarted();
		}

		try {
			if (cleanUpId !== undefined) {
				this.store.delete([cleanUpId]);
			}
			if (snappedPointId !== undefined) {
				this.store.delete([snappedPointId]);
			}
			if (cleanupClosingPointId !== undefined) {
				this.store.delete([cleanupClosingPointId]);
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

			styles.zIndex = this.getNumericStylingValue(
				this.styles.zIndex,
				Z_INDEX.LAYER_ONE,
				feature,
			);

			return styles;
		} else if (
			feature.type === "Feature" &&
			feature.geometry.type === "Point" &&
			feature.properties.mode === this.mode
		) {
			const isClosingPoint =
				feature.properties[COMMON_PROPERTIES.CLOSING_POINT];

			styles.pointColor = this.getHexColorStylingValue(
				isClosingPoint
					? this.styles.closingPointColor
					: this.styles.snappingPointColor,
				styles.pointColor,
				feature,
			);

			styles.pointWidth = this.getNumericStylingValue(
				isClosingPoint
					? this.styles.closingPointWidth
					: this.styles.snappingPointWidth,
				styles.pointWidth,
				feature,
			);

			styles.pointOutlineColor = this.getHexColorStylingValue(
				isClosingPoint
					? this.styles.closingPointOutlineColor
					: this.styles.snappingPointOutlineColor,
				"#ffffff",
				feature,
			);

			styles.pointOutlineWidth = this.getNumericStylingValue(
				isClosingPoint
					? this.styles.closingPointOutlineWidth
					: this.styles.snappingPointOutlineWidth,
				2,
				feature,
			);

			styles.zIndex = this.getNumericStylingValue(
				this.styles.zIndex,
				Z_INDEX.LAYER_FIVE,
				feature,
			);

			return styles;
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidateLineStringFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}

	private lineStringFilter(feature: Feature) {
		return Boolean(
			feature.geometry.type === "LineString" &&
				feature.properties &&
				feature.properties.mode === this.mode,
		);
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
			if (this.currentId) {
				snappedCoordinate = this.coordinateSnapping.getSnappableCoordinate(
					event,
					this.currentId,
				);
			} else {
				snappedCoordinate =
					this.coordinateSnapping.getSnappableCoordinateFirstClick(event);
			}
		}

		if (this.snapping?.toCustom) {
			snappedCoordinate = this.snapping.toCustom(event, {
				currentCoordinate: this.currentCoordinate,
				currentId: this.currentId,
				getCurrentGeometrySnapshot: this.currentId
					? () =>
							this.store.getGeometryCopy<LineString>(
								this.currentId as FeatureId,
							)
					: () => null,
				project: this.project,
				unproject: this.unproject,
			});
		}

		return snappedCoordinate;
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// Clean up here is important to get right as we need to make a best effort to avoid erroneous
		// internal state.

		// If we are editing a feature by dragging one of its points
		// we want to clear that state up as new polygon might be completely
		// different in terms of it's coordinates
		if (this.editedFeatureId === feature.id && this.editedPointId) {
			this.store.delete([this.editedPointId]);
			this.editedPointId = undefined;
			this.editedFeatureId = undefined;
			this.editedFeatureCoordinateIndex = undefined;
			this.editedSnapType = undefined;
		}

		// We can recalculate the snapped point from the last mouse event if there was one
		if (this.snappedPointId && this.lastMouseMoveEvent) {
			this.updateSnappedCoordinate(
				this.lastMouseMoveEvent as TerraDrawMouseEvent,
			);
		}

		// NOTE: This handles the case we are currently drawing a polygon
		// We need to reset the drawing state because it is very complicated (impossible?)
		// to recover the drawing state after a feature update
		if (this.currentId === feature.id) {
			if (this.closingPointId) {
				this.store.delete([this.closingPointId]);
				this.closingPointId = undefined;
			}

			this.currentCoordinate = 0;
			this.currentId = undefined;

			// Go back to started state
			if (this.state === "drawing") {
				this.setStarted();
			}
		}
	}
}
