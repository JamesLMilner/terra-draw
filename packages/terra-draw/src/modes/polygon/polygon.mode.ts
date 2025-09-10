import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	COMMON_PROPERTIES,
	Project,
	Unproject,
	Z_INDEX,
	Snapping,
} from "../../common";
import { Feature, Polygon, Position } from "geojson";
import {
	TerraDrawBaseDrawMode,
	BaseModeOptions,
	CustomStyling,
	PointerEvents,
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
import { ensureRightHandRule } from "../../geometry/ensure-right-hand-rule";
import { CoordinatePointBehavior } from "../select/behaviors/coordinate-point.behavior";

type TerraDrawPolygonModeKeyEvents = {
	cancel?: KeyboardEvent["key"] | null;
	finish?: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };

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
	coordinatePointWidth: NumericStyling;
	coordinatePointColor: HexColorStyling;
	coordinatePointOutlineWidth: NumericStyling;
	coordinatePointOutlineColor: HexColorStyling;

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

interface TerraDrawPolygonModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	snapping?: Snapping;
	pointerDistance?: number;
	keyEvents?: TerraDrawPolygonModeKeyEvents | null;
	pointerEvents?: PointerEvents;
	cursors?: Cursors;
	editable?: boolean;
	showCoordinatePoints?: boolean;
}

export class TerraDrawPolygonMode extends TerraDrawBaseDrawMode<PolygonStyling> {
	mode = "polygon" as const;

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private keyEvents: TerraDrawPolygonModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private mouseMove = false;
	private showCoordinatePoints = false;
	private lastMouseMoveEvent: TerraDrawMouseEvent | undefined;

	// Snapping
	private snapping: Snapping | undefined;
	private snappedPointId: FeatureId | undefined;

	// Editable
	private editable: boolean = false;
	private editedFeatureId: FeatureId | undefined;
	private editedFeatureCoordinateIndex: number | undefined;
	private editedSnapType: "line" | "coordinate" | undefined;
	private editedInsertIndex: number | undefined;
	private editedPointId: FeatureId | undefined;

	// Behaviors
	private coordinatePoints!: CoordinatePointBehavior;
	private lineSnapping!: LineSnappingBehavior;
	private coordinateSnapping!: CoordinateSnappingBehavior;
	private pixelDistance!: PixelDistanceBehavior;
	private closingPoints!: ClosingPointsBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;

	constructor(options?: TerraDrawPolygonModeOptions<PolygonStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: TerraDrawPolygonModeOptions<PolygonStyling>,
	) {
		super.updateOptions(options);

		if (options?.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		// null is the case where we want to explicitly turn key bindings off
		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else if (options?.keyEvents) {
			this.keyEvents = { ...this.keyEvents, ...options.keyEvents };
		}

		if (options?.snapping) {
			this.snapping = options.snapping;
		}

		if (options?.editable !== undefined) {
			this.editable = options.editable;
		}

		if (options?.pointerEvents !== undefined) {
			this.pointerEvents = options.pointerEvents;
		}

		if (options?.showCoordinatePoints !== undefined) {
			this.showCoordinatePoints = options.showCoordinatePoints;

			// If we are not showing coordinate points, we need to add them all
			if (this.coordinatePoints && options.showCoordinatePoints === true) {
				const features = this.store.copyAllWhere(
					(properties) => properties.mode === this.mode,
				);
				const polygonIds = features.map((feature) => feature.id as FeatureId);
				polygonIds.forEach((id) => {
					this.coordinatePoints.createOrUpdate(id);
				});
			} else if (this.coordinatePoints && this.showCoordinatePoints === false) {
				const featuresWithCoordinates = this.store.copyAllWhere(
					(properties) =>
						properties.mode === this.mode &&
						Boolean(
							properties[COMMON_PROPERTIES.COORDINATE_POINT_IDS] as FeatureId[],
						),
				);

				this.coordinatePoints.deletePointsByFeatureIds(
					featuresWithCoordinates.map((f) => f.id as FeatureId),
				);
			}
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

		// Fix right hand rule if necessary
		if (this.currentId) {
			const correctedGeometry = ensureRightHandRule(
				this.store.getGeometryCopy<Polygon>(this.currentId),
			);

			if (correctedGeometry) {
				this.store.updateGeometry([
					{ id: this.currentId, geometry: correctedGeometry },
				]);

				// Create or update coordinate points to reflect the new geometry
				if (this.showCoordinatePoints) {
					this.coordinatePoints.createOrUpdate(this.currentId);
				}
			}

			this.store.updateProperty([
				{
					id: this.currentId,
					property: COMMON_PROPERTIES.CURRENTLY_DRAWING,
					value: undefined,
				},
				{
					id: this.currentId,
					property: COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT,
					value: undefined,
				},
				{
					id: this.currentId,
					property: COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT,
					value: undefined,
				},
			]);
		}

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

		this.coordinatePoints = new CoordinatePointBehavior(config);
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
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.mouseMove = true;
		this.setCursor(this.cursors.start);

		this.lastMouseMoveEvent = event;
		this.updateSnappedCoordinate(event);

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

		this.store.updateProperty([
			{
				id: this.currentId,
				property: COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT,
				value: this.currentCoordinate + 1,
			},
		]);

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

		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate(this.currentId);
		}

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
			snappedCoordinate = this.snapping.toCustom(event, {
				currentCoordinate: this.currentCoordinate,
				currentId: this.currentId,
				getCurrentGeometrySnapshot: this.currentId
					? () =>
							this.store.getGeometryCopy<Polygon>(this.currentId as FeatureId)
					: () => null,
				project: this.project,
				unproject: this.unproject,
			});
		}

		return snappedCoordinate;
	}

	private polygonFilter(feature: Feature) {
		return Boolean(
			feature.geometry.type === "Polygon" &&
				feature.properties &&
				feature.properties.mode === this.mode,
		);
	}

	private onRightClick(event: TerraDrawMouseEvent) {
		// Right click is only relevant when editable is true
		if (!this.editable || this.state !== "started") {
			return;
		}

		const { featureId, featureCoordinateIndex: coordinateIndex } =
			this.coordinateSnapping.getSnappable(event, (feature) =>
				this.polygonFilter(feature),
			);

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

		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate(featureId);
		}

		this.onFinish(featureId, { mode: this.mode, action: "edit" });
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
					properties: {
						mode: this.mode,
						[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
						[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT]:
							this.currentCoordinate + 1,
						[COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT]:
							this.currentCoordinate + 1,
					},
				},
			]);
			this.currentId = newId;
			this.currentCoordinate++;

			if (this.showCoordinatePoints) {
				this.coordinatePoints.createOrUpdate(newId);
			}

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

			this.store.updateProperty([
				{
					id: this.currentId,
					property: COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT,
					value: this.currentCoordinate + 1,
				},
			]);

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

			this.store.updateProperty([
				{
					id: this.currentId,
					property: COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT,
					value: this.currentCoordinate + 1,
				},
			]);

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

				this.store.updateProperty([
					{
						id: this.currentId,
						property: COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT,
						value: this.currentCoordinate + 1,
					},
				]);
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

		if (
			(event.button === "right" &&
				this.allowPointerEvent(this.pointerEvents.rightClick, event)) ||
			(event.isContextMenu &&
				this.allowPointerEvent(this.pointerEvents.contextMenu, event))
		) {
			this.onRightClick(event);
			return;
		} else if (
			event.button === "left" &&
			this.allowPointerEvent(this.pointerEvents.leftClick, event)
		) {
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
		if (!this.allowPointerEvent(this.pointerEvents.onDragStart, event)) {
			return;
		}

		if (!this.editable) {
			return;
		}

		let snappedCoordinate: Position | undefined = undefined;

		if (this.state === "started") {
			// Here we reuse the snapping logic to find the feature and coordinate
			// that we want to edit. We can drag a arbitrary polygon coordinate point
			// or an arbitrary point on one of its 'lines

			const lineSnapped = this.lineSnapping.getSnappable(event, (feature) =>
				this.polygonFilter(feature),
			);

			if (lineSnapped.coordinate) {
				this.editedSnapType = "line";
				this.editedFeatureCoordinateIndex = lineSnapped.featureCoordinateIndex;
				this.editedFeatureId = lineSnapped.featureId;
				snappedCoordinate = lineSnapped.coordinate;
			}

			const coordinateSnapped = this.coordinateSnapping.getSnappable(
				event,
				(feature) => this.polygonFilter(feature),
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

		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate(this.editedFeatureId);
		}

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
			if (cleanUpId) {
				this.coordinatePoints.deletePointsByFeatureIds([cleanUpId]);
			}

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

				styles.zIndex = this.getNumericStylingValue(
					this.styles.zIndex,
					Z_INDEX.LAYER_ONE,
					feature,
				);

				return styles;
			} else if (feature.geometry.type === "Point") {
				const editedPoint = feature.properties[COMMON_PROPERTIES.EDITED];
				const closingPoint =
					feature.properties[COMMON_PROPERTIES.CLOSING_POINT];
				const snappingPoint =
					feature.properties[COMMON_PROPERTIES.SNAPPING_POINT];
				const coordinatePoint =
					feature.properties[COMMON_PROPERTIES.COORDINATE_POINT];

				const pointType = editedPoint
					? "editedPoint"
					: closingPoint
						? "closingPoint"
						: snappingPoint
							? "snappingPoint"
							: coordinatePoint
								? "coordinatePoint"
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
					coordinatePoint: {
						width: this.styles.coordinatePointWidth,
						color: this.styles.coordinatePointColor,
						outlineColor: this.styles.coordinatePointOutlineColor,
						outlineWidth: this.styles.coordinatePointOutlineWidth,
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
					styles.zIndex = this.getNumericStylingValue(
						this.styles.zIndex,
						Z_INDEX.LAYER_FOUR,
						feature,
					);
				} else if (coordinatePoint) {
					styles.zIndex = this.getNumericStylingValue(
						this.styles.zIndex,
						Z_INDEX.LAYER_TWO,
						feature,
					);
				} else {
					styles.zIndex = this.getNumericStylingValue(
						this.styles.zIndex,
						Z_INDEX.LAYER_THREE,
						feature,
					);
				}

				return styles;
			}
		}

		return styles;
	}

	afterFeatureAdded(feature: GeoJSONStoreFeatures) {
		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate(feature.id as FeatureId);
		}
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// Clean up here is important to get right as we need to make a best effort to avoid erroneous
		// internal state.

		// IF we have coordinate points showing these need to be completely recreated
		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate(feature.id as FeatureId);
		}

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
			this.currentCoordinate = 0;
			this.currentId = undefined;
			this.closingPoints.delete();

			// Go back to started state
			if (this.state === "drawing") {
				this.setStarted();
			}
		}
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePolygonFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}
}
