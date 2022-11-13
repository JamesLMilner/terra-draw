import {
    TerraDrawMouseEvent,
    TerraDrawAdapterStyling,
    TerraDrawKeyboardEvent,
    HexColor,
} from "../../common";
import { Feature, LineString } from "geojson";
import { selfIntersects } from "../../geometry/boolean/self-intersects";
import { TerraDrawBaseDrawMode } from "../base.mode";
import { pixelDistance } from "../../geometry/measure/pixel-distance";
import { BehaviorConfig } from "../base.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { SnappingBehavior } from "../snapping.behavior";
import { getDefaultStyling } from "../../util/styling";
import { GeoJSONStoreFeatures } from "../../store/store";

type TerraDrawLineStringModeKeyEvents = {
    cancel: KeyboardEvent["key"];
};

type LineStringStyling = {
    lineStringWidth: number,
    lineStringColor: HexColor,
}


export class TerraDrawLineStringMode extends TerraDrawBaseDrawMode<LineStringStyling> {
    mode = "linestring";

    private currentCoordinate = 0;
    private currentId: string | undefined;
    private allowSelfIntersections;
    private keyEvents: TerraDrawLineStringModeKeyEvents;
    private snappingEnabled: boolean;

    // Behaviors
    private snapping!: SnappingBehavior;

    constructor(options?: {
        snapping?: boolean;
        allowSelfIntersections?: boolean;
        pointerDistance?: number;
        styles?: Partial<LineStringStyling>;
        keyEvents?: TerraDrawLineStringModeKeyEvents;
    }) {
        super(options);

        this.snappingEnabled =
            options && options.snapping !== undefined ? options.snapping : false;

        this.allowSelfIntersections =
            options && options.allowSelfIntersections !== undefined
                ? options.allowSelfIntersections
                : true;

        this.keyEvents =
            options && options.keyEvents ? options.keyEvents : { cancel: "Escape" };
    }

    public registerBehaviors(config: BehaviorConfig) {
        this.snapping = new SnappingBehavior(
            config,
            new PixelDistanceBehavior(config),
            new ClickBoundingBoxBehavior(config)
        );
    }

    start() {
        this.setStarted();
        this.setCursor("crosshair");
    }
    stop() {
        this.setStopped();
        this.setCursor("unset");
        this.cleanUp();
    }

    onMouseMove(event: TerraDrawMouseEvent) {
        if (!this.currentId || this.currentCoordinate === 0) {
            return;
        }
        const currentLineGeometry = this.store.getGeometryCopy<LineString>(
            this.currentId
        );

        // Remove the 'live' point that changes on mouse move
        currentLineGeometry.coordinates.pop();

        const snappedCoord =
            this.snappingEnabled &&
            this.snapping.getSnappableCoordinate(event, this.currentId);
        const updatedCoord = snappedCoord ? snappedCoord : [event.lng, event.lat];

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

    onClick(event: TerraDrawMouseEvent) {
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
        } else if (this.currentCoordinate === 1 && this.currentId) {
            const currentLineGeometry = this.store.getGeometryCopy<LineString>(
                this.currentId
            );

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
                this.currentId
            );

            const [previousLng, previousLat] =
                currentLineGeometry.coordinates[
                    currentLineGeometry.coordinates.length - 2
                ];
            const { x, y } = this.project(previousLng, previousLat);
            const distance = pixelDistance(
                { x, y },
                { x: event.containerX, y: event.containerY }
            );

            const isClosingClick = distance < this.pointerDistance;

            if (isClosingClick) {
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

                this.currentCoordinate = 0;
                this.currentId = undefined;
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

                this.store.updateGeometry([
                    { id: this.currentId, geometry: newLineString },
                ]);
                this.currentCoordinate++;
            }
        }
    }
    onKeyDown() { }
    onKeyUp(event: TerraDrawKeyboardEvent) {
        if (event.key === this.keyEvents.cancel) {
            this.cleanUp();
        }
    }
    onDragStart() { }
    onDrag() { }
    onDragEnd() { }
    cleanUp() {
        try {
            if (this.currentId) {
                this.store.delete([this.currentId]);
            }
        } catch (error) { }

        this.currentId = undefined;
        this.currentCoordinate = 0;
    }

    styleFeature(
        feature: GeoJSONStoreFeatures
    ): TerraDrawAdapterStyling {
        const styles = { ...getDefaultStyling() };

        if (
            feature.type === 'Feature' &&
            feature.geometry.type === 'LineString' &&
            feature.properties.mode === this.mode
        ) {

            if (this.styles.lineStringColor) {
                styles.lineStringColor = this.styles.lineStringColor;
            }
            if (this.styles.lineStringWidth) {
                styles.lineStringWidth = this.styles.lineStringWidth;
            }

            return styles;
        }

        return styles;
    }
}
