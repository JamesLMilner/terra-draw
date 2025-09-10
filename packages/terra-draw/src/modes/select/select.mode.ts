import {
	TerraDrawMouseEvent,
	TerraDrawKeyboardEvent,
	SELECT_PROPERTIES,
	TerraDrawAdapterStyling,
	HexColorStyling,
	NumericStyling,
	Cursor,
	Validation,
	UpdateTypes,
	Z_INDEX,
	Snapping,
} from "../../common";
import { Point, Position } from "geojson";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseSelectMode,
} from "../base.mode";
import { MidPointBehavior } from "./behaviors/midpoint.behavior";
import {
	SelectionPointBehavior,
	SelectionPointProperties,
} from "./behaviors/selection-point.behavior";
import { FeatureAtPointerEventBehavior } from "./behaviors/feature-at-pointer-event.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { DragFeatureBehavior } from "./behaviors/drag-feature.behavior";
import { DragCoordinateBehavior } from "./behaviors/drag-coordinate.behavior";
import { BehaviorConfig } from "../base.behavior";
import { RotateFeatureBehavior } from "./behaviors/rotate-feature.behavior";
import { ScaleFeatureBehavior } from "./behaviors/scale-feature.behavior";
import { FeatureId, GeoJSONStoreFeatures } from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import {
	DragCoordinateResizeBehavior,
	ResizeOptions,
} from "./behaviors/drag-coordinate-resize.behavior";
import { CoordinatePointBehavior } from "./behaviors/coordinate-point.behavior";
import { CoordinateSnappingBehavior } from "../coordinate-snapping.behavior";
import { LineSnappingBehavior } from "../line-snapping.behavior";

type TerraDrawSelectModeKeyEvents = {
	deselect: KeyboardEvent["key"] | null;
	delete: KeyboardEvent["key"] | null;
	rotate: KeyboardEvent["key"][] | null;
	scale: KeyboardEvent["key"][] | null;
};

const defaultKeyEvents = {
	deselect: "Escape",
	delete: "Delete",
	rotate: ["Control", "r"],
	scale: ["Control", "s"],
};

type ModeFlags = {
	feature?: {
		validation?: Validation;
		draggable?: boolean;
		rotateable?: boolean;
		scaleable?: boolean;
		selfIntersectable?: boolean;
		coordinates?: {
			snappable?: boolean | Snapping;
			midpoints?:
				| boolean
				| {
						draggable?: boolean;
				  };
			draggable?: boolean;
			resizable?: ResizeOptions;
			deletable?: boolean;
		};
	};
};

type SelectionStyling = {
	// Point
	selectedPointColor: HexColorStyling;
	selectedPointWidth: NumericStyling;
	selectedPointOutlineColor: HexColorStyling;
	selectedPointOutlineWidth: NumericStyling;

	// LineString
	selectedLineStringColor: HexColorStyling;
	selectedLineStringWidth: NumericStyling;

	// Polygon
	selectedPolygonColor: HexColorStyling;
	selectedPolygonFillOpacity: NumericStyling;
	selectedPolygonOutlineColor: HexColorStyling;
	selectedPolygonOutlineWidth: NumericStyling;

	// Selection Points (points at vertices of a polygon/linestring feature)
	selectionPointWidth: NumericStyling;
	selectionPointColor: HexColorStyling;
	selectionPointOutlineColor: HexColorStyling;
	selectionPointOutlineWidth: NumericStyling;

	// Mid points (points at mid point of a polygon/linestring feature)
	midPointColor: HexColorStyling;
	midPointOutlineColor: HexColorStyling;
	midPointWidth: NumericStyling;
	midPointOutlineWidth: NumericStyling;

	zIndex: NumericStyling;
};

interface Cursors {
	pointerOver?: Cursor;
	dragStart?: Cursor;
	dragEnd?: Cursor;
	insertMidpoint?: Cursor;
}

const defaultCursors = {
	pointerOver: "move",
	dragStart: "move",
	dragEnd: "move",
	insertMidpoint: "crosshair",
} as Required<Cursors>;

interface TerraDrawSelectModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	pointerDistance?: number;
	flags?: { [mode: string]: ModeFlags };
	keyEvents?: TerraDrawSelectModeKeyEvents | null;
	dragEventThrottle?: number;
	cursors?: Cursors;
	allowManualDeselection?: boolean;
}

export class TerraDrawSelectMode extends TerraDrawBaseSelectMode<SelectionStyling> {
	public mode = "select" as const;

	private allowManualDeselection = true;
	private dragEventThrottle = 5;
	private dragEventCount = 0;
	private selected: FeatureId[] = [];

	private flags: { [mode: string]: ModeFlags } = {};
	private keyEvents: TerraDrawSelectModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private validations: Record<string, Validation> = {};

	// Behaviors
	private selectionPoints!: SelectionPointBehavior;
	private midPoints!: MidPointBehavior;
	private coordinateSnap!: CoordinateSnappingBehavior;
	private featuresAtMouseEvent!: FeatureAtPointerEventBehavior;
	private pixelDistance!: PixelDistanceBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;
	private dragFeature!: DragFeatureBehavior;
	private dragCoordinate!: DragCoordinateBehavior;
	private rotateFeature!: RotateFeatureBehavior;
	private scaleFeature!: ScaleFeatureBehavior;
	private dragCoordinateResizeFeature!: DragCoordinateResizeBehavior;
	private coordinatePoints!: CoordinatePointBehavior;
	private lineSnap!: LineSnappingBehavior;

	constructor(options?: TerraDrawSelectModeOptions<SelectionStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: TerraDrawSelectModeOptions<SelectionStyling>,
	) {
		super.updateOptions(options);

		if (options && options.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		} else {
			this.cursors = defaultCursors;
		}

		// We want to have some defaults, but also allow key bindings
		// to be explicitly turned off
		if (options?.keyEvents === null) {
			this.keyEvents = {
				deselect: null,
				delete: null,
				rotate: null,
				scale: null,
			};
		} else if (options?.keyEvents) {
			this.keyEvents = { ...this.keyEvents, ...options.keyEvents };
		}

		if (options?.dragEventThrottle !== undefined) {
			this.dragEventThrottle = options.dragEventThrottle;
		}

		if (options?.allowManualDeselection !== undefined) {
			this.allowManualDeselection = options.allowManualDeselection;
		}

		// Flags and Validations
		if (options?.flags) {
			this.flags = { ...this.flags, ...options.flags };
			this.validations = {};

			for (const mode in this.flags) {
				const feature = this.flags[mode].feature;
				if (feature && feature.validation) {
					this.validations[mode] = feature.validation;
				}
			}
		}
	}

	selectFeature(featureId: FeatureId) {
		this.select(featureId, false);
	}

	setSelecting() {
		if (this._state === "started") {
			this._state = "selecting";
		} else {
			throw new Error("Mode must be started to move to selecting state");
		}
	}

	registerBehaviors(config: BehaviorConfig) {
		this.pixelDistance = new PixelDistanceBehavior(config);
		this.clickBoundingBox = new ClickBoundingBoxBehavior(config);
		this.featuresAtMouseEvent = new FeatureAtPointerEventBehavior(
			config,
			this.clickBoundingBox,
			this.pixelDistance,
		);

		this.selectionPoints = new SelectionPointBehavior(config);
		this.coordinatePoints = new CoordinatePointBehavior(config);
		this.midPoints = new MidPointBehavior(
			config,
			this.selectionPoints,
			this.coordinatePoints,
		);
		this.coordinateSnap = new CoordinateSnappingBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
		this.lineSnap = new LineSnappingBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
		this.rotateFeature = new RotateFeatureBehavior(
			config,
			this.selectionPoints,
			this.midPoints,
			this.coordinatePoints,
		);

		this.dragFeature = new DragFeatureBehavior(
			config,
			this.featuresAtMouseEvent,
			this.selectionPoints,
			this.midPoints,
			this.coordinatePoints,
		);
		this.dragCoordinate = new DragCoordinateBehavior(
			config,
			this.pixelDistance,
			this.selectionPoints,
			this.midPoints,
			this.coordinatePoints,
			this.coordinateSnap,
			this.lineSnap,
		);
		this.dragCoordinateResizeFeature = new DragCoordinateResizeBehavior(
			config,
			this.pixelDistance,
			this.selectionPoints,
			this.midPoints,
			this.coordinatePoints,
		);
		this.scaleFeature = new ScaleFeatureBehavior(
			config,
			this.dragCoordinateResizeFeature,
		);
	}

	public deselectFeature() {
		this.deselect();
	}

	private deselect() {
		const updateSelectedFeatures = this.selected
			.filter((id) => this.store.has(id))
			.map((id) => ({
				id,
				property: SELECT_PROPERTIES.SELECTED,
				value: false,
			}));

		this.store.updateProperty(updateSelectedFeatures);

		this.onDeselect(this.selected[0]);
		this.selected = [];
		this.selectionPoints.delete();
		this.midPoints.delete();
	}

	private deleteSelected() {
		// Delete all selected features
		// from the store and clear selected
		// We don't need to set selected false
		// as we're going to delete the feature

		this.store.delete(this.selected);
		this.selected = [];
	}

	private onRightClick(event: TerraDrawMouseEvent) {
		if (!this.selectionPoints.ids.length) {
			return;
		}

		let clickedSelectionPointProps: SelectionPointProperties | undefined;

		let clickedFeatureDistance = Infinity;

		this.selectionPoints.ids.forEach((id) => {
			const geometry = this.store.getGeometryCopy<Point>(id);
			const distance = this.pixelDistance.measure(event, geometry.coordinates);

			if (
				distance < this.pointerDistance &&
				distance < clickedFeatureDistance
			) {
				clickedFeatureDistance = distance;
				clickedSelectionPointProps = this.store.getPropertiesCopy(
					id,
				) as SelectionPointProperties;
			}
		});

		if (!clickedSelectionPointProps) {
			return;
		}

		const featureId = clickedSelectionPointProps.selectionPointFeatureId;
		const coordinateIndex = clickedSelectionPointProps.index;

		// We allow for preventing deleting coordinates via flags
		const properties = this.store.getPropertiesCopy(featureId);
		const modeFlags = this.flags[properties.mode as string];
		const validation = this.validations[properties.mode as string];

		// Check if we can actually delete the coordinate
		const cannotDelete =
			!modeFlags ||
			!modeFlags.feature ||
			!modeFlags.feature.coordinates ||
			!modeFlags.feature.coordinates.deletable;

		if (cannotDelete) {
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
		} else if (geometry.type === "LineString") {
			coordinates = geometry.coordinates;

			// Prevent creating an invalid linestring
			if (coordinates.length <= 2) {
				return;
			}
		}

		// Geometry is not Polygon or LineString
		if (!coordinates) {
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
		if (validation) {
			const validationResult = validation(
				{
					id: featureId,
					type: "Feature",
					geometry,
					properties,
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

		const deletePoints = [...this.midPoints.ids, ...this.selectionPoints.ids];

		this.store.delete(deletePoints);

		this.store.updateGeometry([
			{
				id: featureId,
				geometry,
			},
		]);

		if (properties.coordinatePointIds) {
			this.coordinatePoints.createOrUpdate(featureId);
		}

		this.selectionPoints.create(
			coordinates,
			geometry.type as "Polygon" | "LineString",
			featureId,
		);

		if (
			modeFlags &&
			modeFlags.feature &&
			modeFlags.feature.coordinates &&
			modeFlags.feature.coordinates.midpoints
		) {
			this.midPoints.create(coordinates, featureId, this.coordinatePrecision);
		}
	}

	private select(featureId: FeatureId, fromCursor = true) {
		if (this.selected[0] === featureId) {
			return;
		}

		const { mode } = this.store.getPropertiesCopy(featureId);

		// This will be undefined for points
		const modeFlags = this.flags[mode as string];

		// If feature is not selectable then return
		if (!modeFlags || !modeFlags.feature) {
			return;
		}

		const previouslySelectedId = this.selected[0];

		// If we have something currently selected
		if (previouslySelectedId) {
			// If it matches the current selected feature id, do nothing
			if (previouslySelectedId === featureId) {
				return;
			} else {
				// If it's a different feature set selected
				// to false on previously selected feature
				this.deselect();
			}
		}

		if (fromCursor) {
			this.setCursor(this.cursors.pointerOver);
		}

		// Select feature
		this.selected = [featureId];

		this.store.updateProperty([
			{ id: featureId, property: SELECT_PROPERTIES.SELECTED, value: true },
		]);
		this.onSelect(featureId);

		// Get the clicked feature
		const { type, coordinates } = this.store.getGeometryCopy(featureId);

		if (type !== "LineString" && type !== "Polygon") {
			return;
		}

		// LineString does not have nesting so we can just take 'coordinates'
		// directly. Polygon is nested so we need to take [0] item in the array
		const selectedCoords: Position[] =
			type === "LineString" ? coordinates : coordinates[0];

		if (selectedCoords && modeFlags && modeFlags.feature.coordinates) {
			this.selectionPoints.create(selectedCoords, type, featureId);

			if (modeFlags.feature.coordinates.midpoints) {
				this.midPoints.create(
					selectedCoords,
					featureId,
					this.coordinatePrecision,
				);
			}
		}
	}

	private onLeftClick(event: TerraDrawMouseEvent) {
		const { clickedFeature, clickedMidPoint } = this.featuresAtMouseEvent.find(
			event,
			this.selected.length > 0,
		);

		if (this.selected.length && clickedMidPoint) {
			// TODO: We probably want to make sure the midpoint
			// is visible?

			this.midPoints.insert(
				this.selected[0],
				clickedMidPoint.id as string,
				this.coordinatePrecision,
			);

			return;
		}

		if (clickedFeature && clickedFeature.id) {
			this.select(clickedFeature.id, true);
		} else if (this.selected.length && this.allowManualDeselection) {
			this.deselect();
			return;
		}
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setSelecting();
	}

	/** @internal */
	stop() {
		this.cleanUp();
		this.setStarted();
		this.setStopped();
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		if (
			(event.button === "right" &&
				this.allowPointerEvent(this.pointerEvents.rightClick, event)) ||
			(event.isContextMenu &&
				this.allowPointerEvent(this.pointerEvents.contextMenu, event))
		) {
			this.onRightClick(event);
		} else if (
			event.button === "left" &&
			this.allowPointerEvent(this.pointerEvents.leftClick, event)
		) {
			this.onLeftClick(event);
		}
	}

	private canScale(event: TerraDrawKeyboardEvent | TerraDrawMouseEvent) {
		return (
			this.keyEvents.scale &&
			this.keyEvents.scale.every((key) => event.heldKeys.includes(key))
		);
	}

	private canRotate(event: TerraDrawKeyboardEvent | TerraDrawMouseEvent) {
		return (
			this.keyEvents.rotate &&
			this.keyEvents.rotate.every((key) => event.heldKeys.includes(key))
		);
	}

	private preventDefaultKeyEvent(event: TerraDrawKeyboardEvent) {
		const isRotationKeys = this.canRotate(event);
		const isScaleKeys = this.canScale(event);

		// If we are deliberately rotating or scaling then prevent default
		if (isRotationKeys || isScaleKeys) {
			event.preventDefault();
		}
	}

	/** @internal */
	onKeyDown(event: TerraDrawKeyboardEvent) {
		this.preventDefaultKeyEvent(event);
	}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		this.preventDefaultKeyEvent(event);

		if (this.keyEvents.delete && event.key === this.keyEvents.delete) {
			if (!this.selected.length) {
				return;
			}

			const selectedId = this.selected[0];

			// We are technically deselecting
			// because the selected feature is deleted
			// and will no longer exist or be selected
			const previouslySelected = this.selected[0];
			this.onDeselect(previouslySelected);

			// Delete coordinate point first if they are present, this needs
			// to be done before deleting the feature
			this.coordinatePoints.deletePointsByFeatureIds([selectedId]);

			// Delete all selected features
			this.deleteSelected();

			// Remove all selection points
			this.selectionPoints.delete();
			this.midPoints.delete();
		} else if (
			this.keyEvents.deselect &&
			event.key === this.keyEvents.deselect
		) {
			this.cleanUp();
		}
	}

	/** @internal */
	cleanUp() {
		if (this.selected.length) {
			this.deselect();
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

		// We only need to stop the map dragging if
		// we actually have something selected
		if (!this.selected.length) {
			return;
		}

		// If the selected feature is not draggable
		// don't do anything
		const properties = this.store.getPropertiesCopy(this.selected[0]);
		const modeFlags = this.flags[properties.mode as string];
		const draggable =
			modeFlags &&
			modeFlags.feature &&
			(modeFlags.feature.draggable ||
				(modeFlags.feature.coordinates &&
					modeFlags.feature.coordinates.draggable) ||
				(modeFlags.feature.coordinates &&
					modeFlags.feature.coordinates.resizable) ||
				(modeFlags.feature.coordinates &&
					typeof modeFlags.feature.coordinates.midpoints === "object" &&
					modeFlags.feature.coordinates.midpoints.draggable));

		if (!draggable) {
			return;
		}

		this.dragEventCount = 0;

		const selectedId = this.selected[0];
		const draggableCoordinateIndex = this.dragCoordinate.getDraggableIndex(
			event,
			selectedId,
		);

		// Drag Coordinate
		if (
			modeFlags &&
			modeFlags.feature &&
			modeFlags.feature.coordinates &&
			(modeFlags.feature.coordinates.draggable ||
				modeFlags.feature.coordinates.resizable) &&
			draggableCoordinateIndex !== -1
		) {
			this.setCursor(this.cursors.dragStart);

			// With resizable
			if (modeFlags.feature.coordinates.resizable) {
				this.dragCoordinateResizeFeature.startDragging(
					selectedId,
					draggableCoordinateIndex,
				);
			} else {
				// Without with resizable being set
				this.dragCoordinate.startDragging(selectedId, draggableCoordinateIndex);
			}

			setMapDraggability(false);
			return;
		}

		// Dragging Midpoint
		if (
			modeFlags &&
			modeFlags.feature &&
			modeFlags.feature.coordinates &&
			typeof modeFlags.feature.coordinates.midpoints === "object" &&
			modeFlags.feature.coordinates.midpoints.draggable
		) {
			const { clickedMidPoint: draggedMidPoint } =
				this.featuresAtMouseEvent.find(event, this.selected.length > 0);

			if (this.selected.length && draggedMidPoint) {
				// We insert the midpoint first
				this.midPoints.insert(
					selectedId,
					draggedMidPoint.id as string,
					this.coordinatePrecision,
				);

				const draggableCoordinateIndexAfterInsert =
					this.dragCoordinate.getDraggableIndex(event, selectedId);

				this.dragCoordinate.startDragging(
					selectedId,
					draggableCoordinateIndexAfterInsert,
				);

				setMapDraggability(false);

				return;
			}
		}

		// Drag Feature
		if (
			modeFlags &&
			modeFlags.feature &&
			modeFlags.feature.draggable &&
			this.dragFeature.canDrag(event, selectedId)
		) {
			this.setCursor(this.cursors.dragStart);
			this.dragFeature.startDragging(event, selectedId);
			setMapDraggability(false);
			return;
		}
	}

	/** @internal */
	onDrag(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDrag, event)) {
			return;
		}

		const selectedId = this.selected[0];

		// If nothing selected we can return early
		if (!selectedId) {
			return;
		}

		const properties = this.store.getPropertiesCopy(selectedId);
		const modeFlags = this.flags[properties.mode as string];
		const canSelfIntersect: boolean =
			(modeFlags &&
				modeFlags.feature &&
				modeFlags.feature.selfIntersectable) === true;

		// Ensure drag count is incremented
		this.dragEventCount++;

		// Return if we haven't hit the drag throttle limit
		// (i.e. we only want to drag every nth event)
		if (this.dragEventCount % this.dragEventThrottle === 0) {
			return;
		}

		const validation = this.validations[properties.mode as string];

		// Check if should rotate
		if (
			modeFlags &&
			modeFlags.feature &&
			modeFlags.feature.rotateable &&
			this.canRotate(event)
		) {
			setMapDraggability(false);
			this.rotateFeature.rotate(event, selectedId, validation);
			return;
		}

		// Check if should scale
		if (
			modeFlags &&
			modeFlags.feature &&
			modeFlags.feature.scaleable &&
			this.canScale(event)
		) {
			setMapDraggability(false);

			this.scaleFeature.scale(event, selectedId, validation);
			return;
		}

		if (
			this.dragCoordinateResizeFeature.isDragging() &&
			modeFlags.feature &&
			modeFlags.feature.coordinates &&
			modeFlags.feature.coordinates.resizable
		) {
			if (this.projection === "globe") {
				throw new Error(
					"Globe is currently unsupported projection for resizable",
				);
			}

			setMapDraggability(false);
			this.dragCoordinateResizeFeature.drag(
				event,
				modeFlags.feature.coordinates.resizable,
				validation,
			);
			return;
		}

		// Check if coordinate is draggable and is dragged
		if (this.dragCoordinate.isDragging()) {
			const snappable = modeFlags.feature?.coordinates?.snappable;

			let snapOptions: Snapping = { toCoordinate: false };
			if (snappable === true) {
				snapOptions = { toCoordinate: true };
			} else if (typeof snappable === "object") {
				snapOptions = snappable;
			}

			this.dragCoordinate.drag(
				event,
				canSelfIntersect,
				validation,
				snapOptions,
			);
			return;
		}

		// Check if feature is draggable and is dragged
		if (this.dragFeature.isDragging()) {
			this.dragFeature.drag(event, validation);
			return;
		}

		setMapDraggability(true);
	}

	/** @internal */
	onDragEnd(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDragEnd, event)) {
			return;
		}

		this.setCursor(this.cursors.dragEnd);

		// If we have finished dragging a coordinate or a feature
		// lets fire an onFinish event which can be listened to
		if (this.dragCoordinate.isDragging()) {
			this.onFinish(this.selected[0], {
				mode: this.mode,
				action: "dragCoordinate",
			});
		} else if (this.dragFeature.isDragging()) {
			this.onFinish(this.selected[0], {
				mode: this.mode,
				action: "dragFeature",
			});
		} else if (this.dragCoordinateResizeFeature.isDragging()) {
			this.onFinish(this.selected[0], {
				mode: this.mode,
				action: "dragCoordinateResize",
			});
		}

		this.dragCoordinate.stopDragging();
		this.dragFeature.stopDragging();
		this.dragCoordinateResizeFeature.stopDragging();
		this.rotateFeature.reset();
		this.scaleFeature.reset();
		setMapDraggability(true);
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		if (!this.selected.length) {
			this.setCursor("unset");
			return;
		}

		if (this.dragFeature.isDragging()) {
			return;
		}

		let nearbyMidPoint = false;
		this.midPoints.ids.forEach((id: string) => {
			if (nearbyMidPoint) {
				return;
			}
			const geometry = this.store.getGeometryCopy<Point>(id);
			const distance = this.pixelDistance.measure(event, geometry.coordinates);

			if (distance < this.pointerDistance) {
				nearbyMidPoint = true;
			}
		});

		let nearbySelectionPoint = false;
		// TODO: Is there a cleaner way to handle prioritising
		// dragging selection points?
		this.selectionPoints.ids.forEach((id: FeatureId) => {
			const geometry = this.store.getGeometryCopy<Point>(id);
			const distance = this.pixelDistance.measure(event, geometry.coordinates);
			if (distance < this.pointerDistance) {
				nearbyMidPoint = false;
				nearbySelectionPoint = true;
			}
		});

		if (nearbyMidPoint) {
			this.setCursor(this.cursors.insertMidpoint);
			return;
		}

		// If we have a feature under the pointer then show the pointer over cursor
		const { clickedFeature: featureUnderPointer } =
			this.featuresAtMouseEvent.find(event, true);

		if (
			this.selected.length > 0 &&
			((featureUnderPointer && featureUnderPointer.id === this.selected[0]) ||
				nearbySelectionPoint)
		) {
			this.setCursor(this.cursors.pointerOver);
		} else {
			// Set it back to whatever the default cursor is
			this.setCursor("unset");
		}
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.properties.mode === this.mode &&
			feature.geometry.type === "Point"
		) {
			if (feature.properties.selectionPoint) {
				styles.pointColor = this.getHexColorStylingValue(
					this.styles.selectionPointColor,
					styles.pointColor,
					feature,
				);

				styles.pointOutlineColor = this.getHexColorStylingValue(
					this.styles.selectionPointOutlineColor,
					styles.pointOutlineColor,
					feature,
				);

				styles.pointWidth = this.getNumericStylingValue(
					this.styles.selectionPointWidth,
					styles.pointWidth,
					feature,
				);

				styles.pointOutlineWidth = this.getNumericStylingValue(
					this.styles.selectionPointOutlineWidth,
					2,
					feature,
				);

				styles.zIndex = this.getNumericStylingValue(
					this.styles.zIndex,
					Z_INDEX.LAYER_THREE,
					feature,
				);

				return styles;
			}

			if (feature.properties.midPoint) {
				styles.pointColor = this.getHexColorStylingValue(
					this.styles.midPointColor,
					styles.pointColor,
					feature,
				);

				styles.pointOutlineColor = this.getHexColorStylingValue(
					this.styles.midPointOutlineColor,
					styles.pointOutlineColor,
					feature,
				);

				styles.pointWidth = this.getNumericStylingValue(
					this.styles.midPointWidth,
					4,
					feature,
				);

				styles.pointOutlineWidth = this.getNumericStylingValue(
					this.styles.midPointOutlineWidth,
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
		} else if (feature.properties[SELECT_PROPERTIES.SELECTED]) {
			// Select mode shortcuts the styling of a feature if it is selected
			// A selected feature from another mode will end up in this block

			if (feature.geometry.type === "Polygon") {
				styles.polygonFillColor = this.getHexColorStylingValue(
					this.styles.selectedPolygonColor,
					styles.polygonFillColor,
					feature,
				);

				styles.polygonOutlineWidth = this.getNumericStylingValue(
					this.styles.selectedPolygonOutlineWidth,
					styles.polygonOutlineWidth,
					feature,
				);

				styles.polygonOutlineColor = this.getHexColorStylingValue(
					this.styles.selectedPolygonOutlineColor,
					styles.polygonOutlineColor,
					feature,
				);

				styles.polygonFillOpacity = this.getNumericStylingValue(
					this.styles.selectedPolygonFillOpacity,
					styles.polygonFillOpacity,
					feature,
				);

				styles.zIndex = this.getNumericStylingValue(
					this.styles.zIndex,
					Z_INDEX.LAYER_ONE,
					feature,
				);
				return styles;
			} else if (feature.geometry.type === "LineString") {
				styles.lineStringColor = this.getHexColorStylingValue(
					this.styles.selectedLineStringColor,
					styles.lineStringColor,
					feature,
				);

				styles.lineStringWidth = this.getNumericStylingValue(
					this.styles.selectedLineStringWidth,
					styles.lineStringWidth,
					feature,
				);

				styles.zIndex = this.getNumericStylingValue(
					this.styles.zIndex,
					Z_INDEX.LAYER_ONE,
					feature,
				);
				return styles;
			} else if (feature.geometry.type === "Point") {
				styles.pointWidth = this.getNumericStylingValue(
					this.styles.selectedPointWidth,
					styles.pointWidth,
					feature,
				);

				styles.pointColor = this.getHexColorStylingValue(
					this.styles.selectedPointColor,
					styles.pointColor,
					feature,
				);

				styles.pointOutlineColor = this.getHexColorStylingValue(
					this.styles.selectedPointOutlineColor,
					styles.pointOutlineColor,
					feature,
				);

				styles.pointOutlineWidth = this.getNumericStylingValue(
					this.styles.selectedPointOutlineWidth,
					styles.pointOutlineWidth,
					feature,
				);

				styles.zIndex = this.getNumericStylingValue(
					this.styles.zIndex,
					Z_INDEX.LAYER_ONE,
					feature,
				);
				return styles;
			}
		}

		return styles;
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// If we have a selected feature and it has been updated
		// we need to update the selection points and midpoints
		if (this.selected.length && feature.id === this.selected[0]) {
			const flags = this.flags[feature.properties.mode as string];

			if (!flags?.feature?.coordinates) {
				return;
			}

			const type = feature.geometry.type as "Polygon" | "LineString";
			const id = feature.id as FeatureId;

			this.selectionPoints.delete();
			this.midPoints.delete();

			let coordinates: Position[] | undefined;
			if (type === "Polygon") {
				// For Polygon we need to take the first item in the coordinates array
				coordinates = feature.geometry.coordinates[0] as Position[];
			} else if (type === "LineString") {
				// For LineString we can take the coordinates directly
				coordinates = feature.geometry.coordinates as Position[];
			} else {
				return;
			}

			this.selectionPoints.create(coordinates, type, id);

			if (flags?.feature?.coordinates?.midpoints) {
				this.midPoints.create(
					(type === "Polygon"
						? feature.geometry.coordinates[0]
						: feature.geometry.coordinates) as Position[],
					id,
					this.coordinatePrecision,
				);
			}
		}
	}
}
