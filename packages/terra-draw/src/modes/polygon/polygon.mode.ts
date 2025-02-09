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
import { Polygon, Position } from "geojson";
import {
	TerraDrawBaseDrawMode,
	BaseModeOptions,
	CustomStyling,
} from "../base.mode";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { BehaviorConfig } from "../base.behavior";
import { createPolygon } from "../../util/geoms";
import { coordinatesIdentical } from "../../geometry/coordinates-identical";
import { ClosingPointsBehavior } from "./behaviors/closing-points.behavior";
import { getDefaultStyling } from "../../util/styling";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { ValidatePolygonFeature } from "../../validations/polygon.validation";
import { LineSnappingBehavior } from "../line-snapping.behavior";
import { CoordinateSnappingBehavior } from "../coordinate-snapping.behavior";

type TerraDrawPolygonModeKeyEvents = {
	cancel?: KeyboardEvent["key"] | null;
	finish?: KeyboardEvent["key"] | null;
};

type PolygonStyling = {
	fillColor: HexColorStyling;
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	fillOpacity: NumericStyling;
	closingPointWidth: NumericStyling;
	closingPointColor: HexColorStyling;
	closingPointOutlineWidth: NumericStyling;
	closingPointOutlineColor: HexColorStyling;
	snappingPointWidth: NumericStyling;
	snappingPointColor: HexColorStyling;
	snappingPointOutlineWidth: NumericStyling;
	snappingPointOutlineColor: HexColorStyling;
	editedPointWidth: NumericStyling;
	editedPointColor: HexColorStyling;
	editedPointOutlineWidth: NumericStyling;
	editedPointOutlineColor: HexColorStyling;
};

interface Cursors {
	start?: Cursor;
	close?: Cursor;
	dragStart?: Cursor;
	dragEnd?: Cursor;
}

interface Snapping {
	toLine?: boolean;
	toCoordinate?: boolean;
	toCustom?: (event: TerraDrawMouseEvent) => Position | undefined;
}

interface TerraDrawPolygonModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	snapping?: Snapping;
	pointerDistance?: number;
	keyEvents?: TerraDrawPolygonModeKeyEvents | null;
	cursors?: Cursors;
	editable?: boolean;
}

export class TerraDrawPolygonMode extends TerraDrawBaseDrawMode<PolygonStyling> {
	mode = "polygon";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private keyEvents: TerraDrawPolygonModeKeyEvents;
	private cursors: Required<Cursors>;
	private mouseMove = false;

	// Snapping
	private snapping: Snapping | undefined;
	private snappedPointId: FeatureId | undefined;

	// Editable
	private editable: boolean;
	private editedFeatureId: FeatureId | undefined;
	private editedFeatureCoordinateIndex: number | undefined;
	private editedSnapType: "line" | "coordinate" | undefined;
	private editedInsertIndex: number | undefined;
	private editedPointId: FeatureId | undefined;

	// Behaviors
	private lineSnapping!: LineSnappingBehavior;
	private coordinateSnapping!: CoordinateSnappingBehavior;
	private pixelDistance!: PixelDistanceBehavior;
	private closingPoints!: ClosingPointsBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;

	constructor(options?: TerraDrawPolygonModeOptions<PolygonStyling>) {
		super(options);

		const defaultCursors = {
			start: "crosshair",
			close: "pointer",
			dragStart: "grabbing",
			dragEnd: "crosshair",
		} as Required<Cursors>;

		if (options && options.cursors) {
			this.cursors = { ...defaultCursors, ...options.cursors };
		} else {
			this.cursors = defaultCursors;
		}

		this.snapping = options && options.snapping ? options.snapping : undefined;

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

		if (options && options.editable) {
			this.editable = options.editable;
		} else {
			this.editable = false;
		}
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		const currentPolygonCoordinates = this.store.getGeometryCopy<Polygon>(
			this.currentId,
		).coordinates[0];

		// We don't want to allow closing if there is not enough
		// coordinates. We have extra because we insert them on mouse
		// move
		if (currentPolygonCoordinates.length < 5) {
			return;
		}

		const updated = this.updatePolygonGeometry(
			[...currentPolygonCoordinates.slice(0, -2), currentPolygonCoordinates[0]],
			UpdateTypes.Finish,
		);

		if (!updated) {
			return;
		}

		const finishedId = this.currentId;

		if (this.snappedPointId) {
			this.store.delete([this.snappedPointId]);
		}

		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.snappedPointId = undefined;
		this.closingPoints.delete();

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		this.onFinish(finishedId, { mode: this.mode, action: "draw" });
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
		this.closingPoints = new ClosingPointsBehavior(config, this.pixelDistance);
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

		if (this.currentId === undefined || this.currentCoordinate === 0) {
			return;
		}

		const currentPolygonCoordinates = this.store.getGeometryCopy<Polygon>(
			this.currentId,
		).coordinates[0];

		let updatedCoordinates;

		if (this.currentCoordinate === 1) {
			// We must add a very small epsilon value so that Mapbox GL
			// renders the polygon - There might be a cleaner solution?
			const epsilon = 1 / Math.pow(10, this.coordinatePrecision - 1);
			const offset = Math.max(0.000001, epsilon);

			updatedCoordinates = [
				currentPolygonCoordinates[0],
				[event.lng, event.lat],
				[event.lng, event.lat - offset],
				currentPolygonCoordinates[0],
			];
		} else if (this.currentCoordinate === 2) {
			updatedCoordinates = [
				currentPolygonCoordinates[0],
				currentPolygonCoordinates[1],
				[event.lng, event.lat],
				currentPolygonCoordinates[0],
			];
		} else {
			const { isClosing, isPreviousClosing } =
				this.closingPoints.isClosingPoint(event);

			if (isPreviousClosing || isClosing) {
				if (this.snappedPointId) {
					this.store.delete([this.snappedPointId]);
					this.snappedPointId = undefined;
				}

				this.setCursor(this.cursors.close);

				updatedCoordinates = [
					...currentPolygonCoordinates.slice(0, -2),
					currentPolygonCoordinates[0],
					currentPolygonCoordinates[0],
				];
			} else {
				updatedCoordinates = [
					...currentPolygonCoordinates.slice(0, -2),
					[event.lng, event.lat],
					currentPolygonCoordinates[0],
				];
			}
		}

		this.updatePolygonGeometry(updatedCoordinates, UpdateTypes.Provisional);
	}

	private updatePolygonGeometry(
		coordinates: Polygon["coordinates"][0],
		updateType: UpdateTypes,
	) {
		if (!this.currentId) {
			return false;
		}

		const updatedGeometry = {
			type: "Polygon",
			coordinates: [coordinates],
		} as Polygon;

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
					updateType,
				},
			);

			if (!validationResult.valid) {
				return false;
			}
		}

		this.store.updateGeometry([
			{ id: this.currentId, geometry: updatedGeometry },
		]);

		return true;
	}

	private snapCoordinate(event: TerraDrawMouseEvent): undefined | Position {
		let snappedCoordinate: Position | undefined = undefined;

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
			let snapped: Position | undefined = undefined;
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
			snappedCoordinate = this.snapping.toCustom(event);
		}

		return snappedCoordinate;
	}

	private onRightClick(event: TerraDrawMouseEvent) {
		if (!this.editable) {
			return;
		}

		const { featureId, featureCoordinateIndex: coordinateIndex } =
			this.coordinateSnapping.getSnappable(event, (feature) => {
				return feature.geometry.type === "Polygon";
			});

		if (!featureId || coordinateIndex === undefined) {
			return;
		}

		const geometry = this.store.getGeometryCopy(featureId);

		let coordinates;
		if (geometry.type === "Polygon") {
			coordinates = geometry.coordinates[0];

			// Prevent creating an invalid polygon
			if (coordinates.length <= 4) {
				return;
			}
		} else {
			return;
		}

		const isFinalPolygonCoordinate =
			geometry.type === "Polygon" &&
			(coordinateIndex === 0 || coordinateIndex === coordinates.length - 1);

		if (isFinalPolygonCoordinate) {
			// Deleting the final coordinate in a polygon breaks it
			// because GeoJSON expects a duplicate, so we need to fix
			// it by adding the new first coordinate to the end
			coordinates.shift();
			coordinates.pop();
			coordinates.push([coordinates[0][0], coordinates[0][1]]);
		} else {
			// Remove coordinate from array
			coordinates.splice(coordinateIndex, 1);
		}

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
	}

	private onLeftClick(event: TerraDrawMouseEvent) {
		// Reset the snapping point
		if (this.snappedPointId) {
			this.store.delete([this.snappedPointId]);
			this.snappedPointId = undefined;
		}

		if (this.currentCoordinate === 0) {
			const snappedCoordinate = this.snapCoordinate(event);

			if (snappedCoordinate) {
				event.lng = snappedCoordinate[0];
				event.lat = snappedCoordinate[1];
			}

			const [newId] = this.store.create([
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
			]);
			this.currentId = newId;
			this.currentCoordinate++;

			// Ensure the state is updated to reflect drawing has started
			this.setDrawing();
		} else if (this.currentCoordinate === 1 && this.currentId) {
			const snappedCoordinate = this.snapCoordinate(event);

			if (snappedCoordinate) {
				event.lng = snappedCoordinate[0];
				event.lat = snappedCoordinate[1];
			}

			const currentPolygonGeometry = this.store.getGeometryCopy<Polygon>(
				this.currentId,
			);

			const previousCoordinate = currentPolygonGeometry.coordinates[0][0];
			const isIdentical = coordinatesIdentical(
				[event.lng, event.lat],
				previousCoordinate,
			);

			if (isIdentical) {
				return;
			}

			const updated = this.updatePolygonGeometry(
				[
					currentPolygonGeometry.coordinates[0][0],
					[event.lng, event.lat],
					[event.lng, event.lat],
					currentPolygonGeometry.coordinates[0][0],
				],
				UpdateTypes.Commit,
			);

			if (!updated) {
				return;
			}

			this.currentCoordinate++;
		} else if (this.currentCoordinate === 2 && this.currentId) {
			const snappedCoordinate = this.snapCoordinate(event);

			if (snappedCoordinate) {
				event.lng = snappedCoordinate[0];
				event.lat = snappedCoordinate[1];
			}

			const currentPolygonCoordinates = this.store.getGeometryCopy<Polygon>(
				this.currentId,
			).coordinates[0];

			const previousCoordinate = currentPolygonCoordinates[1];
			const isIdentical = coordinatesIdentical(
				[event.lng, event.lat],
				previousCoordinate,
			);

			if (isIdentical) {
				return;
			}

			const updated = this.updatePolygonGeometry(
				[
					currentPolygonCoordinates[0],
					currentPolygonCoordinates[1],
					[event.lng, event.lat],
					[event.lng, event.lat],
					currentPolygonCoordinates[0],
				],
				UpdateTypes.Commit,
			);

			if (!updated) {
				return;
			}

			if (this.currentCoordinate === 2) {
				this.closingPoints.create(currentPolygonCoordinates, "polygon");
			}

			this.currentCoordinate++;
		} else if (this.currentId) {
			const currentPolygonCoordinates = this.store.getGeometryCopy<Polygon>(
				this.currentId,
			).coordinates[0];

			const { isClosing, isPreviousClosing } =
				this.closingPoints.isClosingPoint(event);

			if (isPreviousClosing || isClosing) {
				this.close();
			} else {
				const snappedCoordinate = this.snapCoordinate(event);

				if (snappedCoordinate) {
					event.lng = snappedCoordinate[0];
					event.lat = snappedCoordinate[1];
				}

				const previousCoordinate =
					currentPolygonCoordinates[this.currentCoordinate - 1];
				const isIdentical = coordinatesIdentical(
					[event.lng, event.lat],
					previousCoordinate,
				);

				if (isIdentical) {
					return;
				}

				const updatedPolygon = createPolygon([
					[
						...currentPolygonCoordinates.slice(0, -1),
						[event.lng, event.lat], // New point that onMouseMove can manipulate
						currentPolygonCoordinates[0],
					],
				]);

				// If not close to the final point, keep adding points
				const updated = this.updatePolygonGeometry(
					updatedPolygon.geometry.coordinates[0],
					UpdateTypes.Commit,
				);
				if (!updated) {
					return;
				}
				this.currentCoordinate++;

				// Update closing points straight away
				if (this.closingPoints.ids.length) {
					this.closingPoints.update(updatedPolygon.geometry.coordinates[0]);
				}
			}
		}
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

		if (event.button === "right") {
			this.onRightClick(event);
			return;
		} else if (event.button === "left") {
			this.onLeftClick(event);
			return;
		}
	}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		} else if (event.key === this.keyEvents.finish) {
			this.close();
		}
	}

	/** @internal */
	onKeyDown() {}

	onDragStart(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.editable) {
			return;
		}

		let snappedCoordinate: Position | undefined = undefined;

		if (this.state === "started") {
			const lineSnapped = this.lineSnapping.getSnappable(event);

			if (lineSnapped.coordinate) {
				this.editedSnapType = "line";
				this.editedFeatureCoordinateIndex = lineSnapped.featureCoordinateIndex;
				this.editedFeatureId = lineSnapped.featureId;
				snappedCoordinate = lineSnapped.coordinate;
			}

			const coordinateSnapped = this.coordinateSnapping.getSnappable(event);

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
		if (
			this.editedFeatureId === undefined ||
			this.editedFeatureCoordinateIndex === undefined
		) {
			return;
		}

		const featureCopy: Polygon = this.store.getGeometryCopy(
			this.editedFeatureId,
		);
		const featureCoordinates = featureCopy.coordinates[0];

		// Either it's a coordinate drag or a line drag where the line coordinate has already been inserted
		if (
			this.editedSnapType === "coordinate" ||
			(this.editedSnapType === "line" && this.editedInsertIndex !== undefined)
		) {
			// Account for the first and last point being the same
			const isStartingOrEndingCoordinate =
				this.editedFeatureCoordinateIndex === 0 ||
				this.editedFeatureCoordinateIndex ===
					featureCopy.coordinates[0].length - 1;

			if (isStartingOrEndingCoordinate) {
				featureCoordinates[0] = [event.lng, event.lat];
				featureCoordinates[featureCoordinates.length - 1] = [
					event.lng,
					event.lat,
				];
			} else {
				featureCoordinates[this.editedFeatureCoordinateIndex] = [
					event.lng,
					event.lat,
				];
			}
		} else if (
			this.editedSnapType === "line" &&
			this.editedInsertIndex === undefined
		) {
			// Splice inserts _before_ the index, so we need to add 1
			this.editedInsertIndex = this.editedFeatureCoordinateIndex + 1;

			// Insert the new dragged snapped line coordinate
			featureCopy.coordinates[0].splice(this.editedInsertIndex, 0, [
				event.lng,
				event.lat,
			]);

			// We have inserted a point, need to change the edit index
			// so it can be moved correctly when it gets dragged again
			this.editedFeatureCoordinateIndex++;
		}

		const newPolygonGeometry = {
			type: "Polygon",
			coordinates: featureCopy.coordinates,
		} as Polygon;

		if (this.validate) {
			const validationResult = this.validate(
				{
					type: "Feature",
					geometry: newPolygonGeometry,
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
				geometry: newPolygonGeometry,
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

		setMapDraggability(true);
	}

	/** @internal */
	onDragEnd(
		_: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
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
		const snappedPointId = this.snappedPointId;
		const editedPointId = this.editedPointId;

		this.currentId = undefined;
		this.snappedPointId = undefined;
		this.editedPointId = undefined;
		this.editedFeatureId = undefined;
		this.editedFeatureCoordinateIndex = undefined;
		this.editedInsertIndex = undefined;
		this.editedSnapType = undefined;
		this.currentCoordinate = 0;

		if (this.state === "drawing") {
			this.setStarted();
		}

		try {
			if (cleanUpId !== undefined) {
				this.store.delete([cleanUpId]);
			}
			if (editedPointId !== undefined) {
				this.store.delete([editedPointId]);
			}
			if (snappedPointId !== undefined) {
				this.store.delete([snappedPointId]);
			}
			if (this.closingPoints.ids.length) {
				this.closingPoints.delete();
			}
		} catch (error) {}
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (feature.properties.mode === this.mode) {
			if (feature.geometry.type === "Polygon") {
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
			} else if (feature.geometry.type === "Point") {
				const editedPoint = feature.properties[COMMON_PROPERTIES.EDITED];
				const closingPoint =
					feature.properties[COMMON_PROPERTIES.CLOSING_POINT];
				const snappingPoint =
					feature.properties[COMMON_PROPERTIES.SNAPPING_POINT];

				const pointType = editedPoint
					? "editedPoint"
					: closingPoint
						? "closingPoint"
						: snappingPoint
							? "snappingPoint"
							: undefined;

				if (!pointType) {
					return styles;
				}

				const styleMap = {
					editedPoint: {
						width: this.styles.editedPointOutlineWidth,
						color: this.styles.editedPointColor,
						outlineColor: this.styles.editedPointOutlineColor,
						outlineWidth: this.styles.editedPointOutlineWidth,
					},
					closingPoint: {
						width: this.styles.closingPointWidth,
						color: this.styles.closingPointColor,
						outlineColor: this.styles.closingPointOutlineColor,
						outlineWidth: this.styles.closingPointOutlineWidth,
					},
					snappingPoint: {
						width: this.styles.snappingPointWidth,
						color: this.styles.snappingPointColor,
						outlineColor: this.styles.snappingPointOutlineColor,
						outlineWidth: this.styles.snappingPointOutlineWidth,
					},
				};

				styles.pointWidth = this.getNumericStylingValue(
					styleMap[pointType].width,
					styles.pointWidth,
					feature,
				);

				styles.pointColor = this.getHexColorStylingValue(
					styleMap[pointType].color,
					styles.pointColor,
					feature,
				);

				styles.pointOutlineColor = this.getHexColorStylingValue(
					styleMap[pointType].outlineColor,
					styles.pointOutlineColor,
					feature,
				);

				styles.pointOutlineWidth = this.getNumericStylingValue(
					styleMap[pointType].outlineWidth,
					2,
					feature,
				);

				if (editedPoint) {
					styles.zIndex = 35;
				} else {
					styles.zIndex = 30;
				}
				return styles;
			}
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePolygonFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}
}
