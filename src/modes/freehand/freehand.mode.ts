import {
    TerraDrawMouseEvent,
    TerraDrawAdapterStyling,
    TerraDrawKeyboardEvent,
    HexColor,
} from "../../common";
import { Polygon } from "geojson";

import { TerraDrawBaseDrawMode } from "../base.mode";
import { getDefaultStyling } from "../../util/styling";
import { GeoJSONStoreFeatures } from "../../store/store";
import { pixelDistance } from "../../geometry/measure/pixel-distance";

type TerraDrawFreehandModeKeyEvents = {
    cancel: KeyboardEvent["key"];
    finish: KeyboardEvent["key"];
};

type FreehandPolygonStyling = {
    fillColor: HexColor,
    outlineColor: HexColor,
    outlineWidth: number,
    fillOpacity: number,
    closingPointColor: HexColor,
    closingPointWidth: number,
    closingPointOutlineColor: HexColor,
    closingPointOutlineWidth: number
}

export class TerraDrawFreehandMode extends TerraDrawBaseDrawMode<FreehandPolygonStyling> {
    mode = "freehand";

    private startingClick = false;
    private currentId: string | undefined;
    private closingPointId: string | undefined;
    private minDistance: number;
    private keyEvents: TerraDrawFreehandModeKeyEvents;

    constructor(options?: {
        styles?: Partial<FreehandPolygonStyling>;
        minDistance?: number;
        keyEvents?: TerraDrawFreehandModeKeyEvents;
    }) {
        super(options);

        this.minDistance = (options && options.minDistance) || 20;
        this.keyEvents =
            options && options.keyEvents ? options.keyEvents : { cancel: "Escape", finish: 'Enter' };
    }

    private close() {
        this.closingPointId && this.store.delete([this.closingPointId]);
        this.startingClick = false;
        this.currentId = undefined;
        this.closingPointId = undefined;
    }

    /** @internal */
    start() {
        this.setStarted();
        this.setCursor("crosshair");
    }

    /** @internal */
    stop() {
        this.setStopped();
        this.setCursor("unset");
        this.cleanUp();
    }


    /** @internal */
    onMouseMove(event: TerraDrawMouseEvent) {
        if (!this.currentId || this.startingClick === false) {
            return;
        }

        const currentLineGeometry = this.store.getGeometryCopy<Polygon>(
            this.currentId
        );

        const [previousLng, previousLat] =
            currentLineGeometry.coordinates[0][
                currentLineGeometry.coordinates[0].length - 2
            ];
        const { x, y } = this.project(previousLng, previousLat);
        const distance = pixelDistance(
            { x, y },
            { x: event.containerX, y: event.containerY }
        );

        const [closingLng, closingLat] = currentLineGeometry.coordinates[0][0];
        const { x: closingX, y: closingY } = this.project(closingLng, closingLat);
        const closingDistance = pixelDistance(
            { x: closingX, y: closingY },
            { x: event.containerX, y: event.containerY }
        );

        if (closingDistance < this.pointerDistance) {
            this.setCursor('pointer');
        } else {
            this.setCursor('crosshair');
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
            return;
        }

        this.close();
    }

    /** @internal */
    onKeyDown() { }

    /** @internal */
    onKeyUp(event: TerraDrawKeyboardEvent) {
        if (event.key === this.keyEvents.cancel) {
            this.cleanUp();
        } else if (event.key === this.keyEvents.finish) {
            this.close();
        }
    }

    /** @internal */
    onDragStart() { }

    /** @internal */
    onDrag() { }

    /** @internal */
    onDragEnd() { }

    /** @internal */
    cleanUp() {
        try {
            if (this.currentId) {
                this.store.delete([this.currentId]);
            }
            if (this.closingPointId) {
                this.store.delete([this.closingPointId]);
            }
        } catch (error) { }
        this.closingPointId = undefined;
        this.currentId = undefined;
        this.startingClick = false;
    }

    /** @internal */
    styleFeature(
        feature: GeoJSONStoreFeatures
    ): TerraDrawAdapterStyling {
        const styles = { ...getDefaultStyling() };

        if (
            feature.type === 'Feature' &&
            feature.geometry.type === 'Polygon' &&
            feature.properties.mode === this.mode
        ) {

            if (this.styles.fillColor) {
                styles.polygonFillColor = this.styles.fillColor;
            }
            if (this.styles.outlineColor) {
                styles.polygonOutlineColor = this.styles.outlineColor;
            }
            if (this.styles.outlineWidth) {
                styles.polygonOutlineWidth = this.styles.outlineWidth;
            }
            if (this.styles.fillOpacity) {
                styles.polygonFillOpacity = this.styles.fillOpacity;
            }

            return styles;
        } else if (
            feature.type === 'Feature' &&
            feature.geometry.type === 'Point' &&
            feature.properties.mode === this.mode
        ) {

            if (this.styles.closingPointColor) {
                styles.pointColor = this.styles.closingPointColor;
            }
            if (this.styles.closingPointWidth) {
                styles.pointWidth = this.styles.closingPointWidth;
            }

            styles.pointOutlineColor = this.styles.closingPointOutlineColor !== undefined ?
                this.styles.closingPointOutlineColor : '#ffffff';
            styles.pointOutlineWidth = this.styles.closingPointOutlineWidth !== undefined ?
                this.styles.closingPointOutlineWidth : 2;

            return styles;
        }

        return styles;

    }

}
