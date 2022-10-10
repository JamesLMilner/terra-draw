import {
    TerraDrawMouseEvent,
    TerraDrawKeyboardEvent,
    SELECT_PROPERTIES,
} from "../../common";
import { Point, Position } from "geojson";
import { TerraDrawBaseDrawMode } from "../base.mode";
import { MidPointBehavior } from "./behaviors/midpoint.behavior";
import { SelectionPointBehavior } from "./behaviors/selection-point.behavior";
import { FeaturesAtMouseEventBehavior } from "./behaviors/features-at-mouse-event.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { DragFeatureBehavior } from "./behaviors/drag-feature.behavior";
import { DragCoordinateBehavior } from "./behaviors/drag-coordinate.behavior";
import { BehaviorConfig } from "../base.behavior";
import { RotateFeatureBehavior } from "./behaviors/rotate-feature.behavior";
import { ScaleFeatureBehavior } from "./behaviors/scale-feature.behavior";

type TerraDrawSelectModeKeyEvents = {
    deselect: KeyboardEvent["key"];
    delete: KeyboardEvent["key"];
    rotate: KeyboardEvent["key"];
    scale: KeyboardEvent["key"];
};

type ModeFlags = {
    feature?: {
        draggable?: boolean;
        rotateable?: boolean;
        scaleable?: boolean;
        coordinates?: {
            midpoints?: boolean;
            draggable?: boolean;
            deletable?: boolean;
        };
    };
};

export class TerraDrawSelectMode extends TerraDrawBaseDrawMode {
    mode = "select";

    private dragEventThrottle = 5;
    private dragEventCount = 0;
    private selected: string[] = [];

    private flags: { [mode: string]: ModeFlags };
    private keyEvents: TerraDrawSelectModeKeyEvents;

    // Behaviors
    private selectionPoints!: SelectionPointBehavior;
    private midPoints!: MidPointBehavior;
    private featuresAtMouseEvent!: FeaturesAtMouseEventBehavior;
    private pixelDistance!: PixelDistanceBehavior;
    private clickBoundingBox!: ClickBoundingBoxBehavior;
    private dragFeature!: DragFeatureBehavior;
    private dragCoordinate!: DragCoordinateBehavior;
    private rotateFeature!: RotateFeatureBehavior;
    private scaleFeature!: ScaleFeatureBehavior;

    constructor(options?: {
        pointerDistance?: number;
        flags?: { [mode: string]: ModeFlags };
        keyEvents?: TerraDrawSelectModeKeyEvents;
        dragEventThrottle?: number;
    }) {
        super(options);

        this.flags = options && options.flags ? options.flags : {};

        this.keyEvents =
            options && options.keyEvents
                ? options.keyEvents
                : { deselect: "Escape", delete: "Delete", rotate: "r", scale: "s" };

        this.dragEventThrottle =
            (options &&
                options.dragEventThrottle !== undefined &&
                options.dragEventThrottle) ||
            5;
    }

    public registerBehaviors(config: BehaviorConfig) {
        this.pixelDistance = new PixelDistanceBehavior(config);
        this.clickBoundingBox = new ClickBoundingBoxBehavior(config);
        this.featuresAtMouseEvent = new FeaturesAtMouseEventBehavior(
            config,
            this.clickBoundingBox,
            this.pixelDistance
        );

        this.selectionPoints = new SelectionPointBehavior(config);
        this.midPoints = new MidPointBehavior(config, this.selectionPoints);

        this.rotateFeature = new RotateFeatureBehavior(
            config,
            this.selectionPoints,
            this.midPoints
        );

        this.scaleFeature = new ScaleFeatureBehavior(
            config,
            this.selectionPoints,
            this.midPoints
        );

        this.dragFeature = new DragFeatureBehavior(
            config,
            this.featuresAtMouseEvent,
            this.selectionPoints,
            this.midPoints
        );
        this.dragCoordinate = new DragCoordinateBehavior(
            config,
            this.pixelDistance,
            this.selectionPoints,
            this.midPoints
        );
    }

    private deselect() {
        this.store.updateProperty(
            this.selected.map((id) => ({
                id,
                property: SELECT_PROPERTIES.SELECTED,
                value: false,
            }))
        );

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

        let clickedSelectionPointProps:
            | {
                selectionPointFeatureId: string;
                index: number;
            }
            | undefined;

        let clickedFeatureDistance = Infinity;

        this.selectionPoints.ids.forEach((id: string) => {
            const geometry = this.store.getGeometryCopy<Point>(id);
            const distance = this.pixelDistance.measure(event, geometry.coordinates);

            if (
                distance < this.pointerDistance &&
                distance < clickedFeatureDistance
            ) {
                clickedFeatureDistance = distance;
                clickedSelectionPointProps = this.store.getPropertiesCopy(id) as {
                    selectionPointFeatureId: string;
                    index: number;
                };
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

        // Check if we can actually delete the coordinate
        const cannotDelete = !modeFlags ||
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
            if (coordinates.length <= 3) {
                return;
            }
        }

        // Geometry is not Polygon or LineString
        if (!coordinates) {
            return;
        }

        if (
            (geometry.type === "Polygon" && coordinateIndex === 0) ||
            coordinateIndex === coordinates.length - 1
        ) {
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

        this.store.delete([...this.midPoints.ids, ...this.selectionPoints.ids]);
        this.store.updateGeometry([
            {
                id: featureId,
                geometry,
            },
        ]);

        this.selectionPoints.create(
            coordinates,
            geometry.type as "Polygon" | "LineString",
            featureId
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

    private onLeftClick(event: TerraDrawMouseEvent) {
        const { clickedFeature, clickedMidPoint } = this.featuresAtMouseEvent.find(
            event,

            this.selected.length > 0
        );

        if (this.selected.length && clickedMidPoint) {
            // TODO: We probably want to make sure the midpoint
            // is visible?

            this.midPoints.insert(
                clickedMidPoint.id as string,
                this.coordinatePrecision
            );

            return;
        }

        if (clickedFeature) {
            const { mode } = this.store.getPropertiesCopy(
                clickedFeature.id as string
            );

            const previouslySelectedId = this.selected[0];

            // If we have something currently selected
            if (previouslySelectedId) {
                // If it matches the current selected feature id, do nothing
                if (previouslySelectedId === clickedFeature.id) {
                    return;
                } else {
                    // If it's a different feature set selected
                    // to false on previously selected feature
                    this.deselect();
                }
            }

            // This will be undefined for points
            const modeFlags = this.flags[mode as string];

            // If feature is not selectable then return
            if (!modeFlags || !modeFlags.feature) {
                return;
            }

            // Select feature
            this.selected = [clickedFeature.id as string];
            this.store.updateProperty([
                { id: clickedFeature.id as string, property: "selected", value: true },
            ]);
            this.onSelect(clickedFeature.id as string);

            // Get the clicked feature
            const { type, coordinates } = this.store.getGeometryCopy(
                clickedFeature.id as string
            );

            let selectedCoords: Position[] | undefined;
            if (type === "LineString") {
                selectedCoords = coordinates;
            } else if (type === "Polygon") {
                selectedCoords = coordinates[0];
            }

            if (selectedCoords && modeFlags && modeFlags.feature.coordinates) {
                this.selectionPoints.create(
                    selectedCoords,
                    type,
                    clickedFeature.id as string
                );

                if (modeFlags.feature.coordinates.midpoints) {
                    this.midPoints.create(
                        selectedCoords,
                        clickedFeature.id as string,
                        this.coordinatePrecision
                    );
                }
            }
        } else if (this.selected.length) {
            this.deselect();
            return;
        }
    }

    start() {
        this.setStarted();
    }
    stop() {
        this.setStopped();
        this.cleanUp();
    }

    onClick(event: TerraDrawMouseEvent) {
        if (event.button === "right") {
            this.onRightClick(event);
            return;
        } else if (event.button === "left") {
            this.onLeftClick(event);
        }
    }
    onKeyDown() { }
    onKeyUp(event: TerraDrawKeyboardEvent) {
        if (event.key === this.keyEvents.delete) {
            if (!this.selected.length) {
                return;
            }

            // We are technically deselecting
            // because the selected feature is deleted
            // and will no longer exist or be selected
            const previouslySelected = this.selected[0];
            this.onDeselect(previouslySelected);

            // Delete all selected features
            this.deleteSelected();

            // Remove all selection points
            this.selectionPoints.delete();
            this.midPoints.delete();
        } else if (event.key === this.keyEvents.deselect) {
            this.cleanUp();
        }
    }
    cleanUp() {
        if (this.selected.length) {
            this.deselect();
        }
    }
    onDragStart(
        event: TerraDrawMouseEvent,
        setMapDraggability: (enabled: boolean) => void
    ) {
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
                    modeFlags.feature.coordinates.draggable));

        if (!draggable) {
            return;
        }

        this.dragEventCount = 0;
        this.setCursor("grabbing");
        this.dragFeature.position = [event.lng, event.lat];

        setMapDraggability(false);
    }

    onDrag(event: TerraDrawMouseEvent) {
        const selectedId = this.selected[0];

        // If nothing selected or the drag position hasn't been set
        // do nothing
        if (!selectedId || !this.dragFeature.position) {
            return;
        }

        const properties = this.store.getPropertiesCopy(selectedId);
        const modeFlags = this.flags[properties.mode as string];

        // Ensure drag count is incremented
        this.dragEventCount++;

        // Return if we haven't hit the drag throttle limit
        // (i.e. we only want to drag every nth event)
        if (this.dragEventCount % this.dragEventThrottle === 0) {
            return;
        }

        // Check if should rotate
        if (
            modeFlags &&
            modeFlags.feature &&
            modeFlags.feature.rotateable &&
            event.heldKeys.includes("r")
        ) {
            this.rotateFeature.rotate(event, selectedId);
            return;
        }

        // Check if should scale
        if (
            modeFlags &&
            modeFlags.feature &&
            modeFlags.feature.scaleable &&
            event.heldKeys.includes("s")
        ) {
            this.scaleFeature.scale(event, selectedId);
            return;
        }

        // Check if coordinate is draggable and is dragged
        if (
            modeFlags &&
            modeFlags.feature &&
            modeFlags.feature.coordinates &&
            modeFlags.feature.coordinates.draggable
        ) {
            const coordinateWasDragged = this.dragCoordinate.drag(event, selectedId);

            if (coordinateWasDragged) {
                return;
            }
        }

        // Check if feature is draggable and is dragged
        if (modeFlags && modeFlags.feature && modeFlags.feature.draggable) {
            this.dragFeature.drag(event, selectedId);

            this.dragFeature.position = [event.lng, event.lat];
        }
    }

    onDragEnd(
        _: TerraDrawMouseEvent,
        setMapDraggability: (enabled: boolean) => void
    ) {
        this.setCursor("grab");
        this.dragFeature.position = undefined;
        this.rotateFeature.reset();
        this.scaleFeature.reset();
        setMapDraggability(true);
    }

    onMouseMove(event: TerraDrawMouseEvent) {
        if (!this.selected.length || this.dragFeature.position) {
            return;
        }

        let nearbySelectionPoint = false;
        this.midPoints.ids.forEach((id: string) => {
            if (nearbySelectionPoint) {
                return;
            }
            const geometry = this.store.getGeometryCopy<Point>(id);
            const distance = this.pixelDistance.measure(event, geometry.coordinates);

            if (distance < this.pointerDistance) {
                nearbySelectionPoint = true;
            }
        });

        // TODO: Is there a cleaner way to handle prioritising
        // dragging selection points?
        this.selectionPoints.ids.forEach((id: string) => {
            const geometry = this.store.getGeometryCopy<Point>(id);
            const distance = this.pixelDistance.measure(event, geometry.coordinates);
            if (distance < this.pointerDistance) {
                nearbySelectionPoint = false;
            }
        });
        if (nearbySelectionPoint) {
            this.setCursor("crosshair");
        } else {
            this.setCursor("unset");
        }
    }
}
