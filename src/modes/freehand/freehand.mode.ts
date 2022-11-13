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

type TerraDrawFreehandModeKeyEvents = {
    cancel: KeyboardEvent["key"];
};

type FreehandPolygonStyling = {
    fillColor: HexColor,
    outlineColor: HexColor,
    outlineWidth: number,
    fillOpacity: number,
}

export class TerraDrawFreehandMode extends TerraDrawBaseDrawMode<FreehandPolygonStyling> {
    mode = "freehand";

    private startingClick = false;
    private currentId: string | undefined;
    private skip = 0;
    private everyNthMouseEvent: number;
    private keyEvents: TerraDrawFreehandModeKeyEvents;

    constructor(options?: {
        styles?: Partial<FreehandPolygonStyling>;
        everyNthMouseEvent?: number;
        keyEvents?: TerraDrawFreehandModeKeyEvents;
    }) {
        super(options);

        this.everyNthMouseEvent = (options && options.everyNthMouseEvent) || 10;
        this.keyEvents =
            options && options.keyEvents ? options.keyEvents : { cancel: "Escape" };
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
        if (!this.currentId || this.startingClick === false) {
            return;
        }

        if (this.skip > this.everyNthMouseEvent) {
            this.skip = 0;
            const currentLineGeometry = this.store.getGeometryCopy<Polygon>(
                this.currentId
            );

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

        this.skip++;
    }

    onClick(event: TerraDrawMouseEvent) {
        if (this.startingClick === false) {
            const [createdId] = this.store.create([
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

            this.currentId = createdId;
            this.startingClick = true;
            return;
        }

        this.startingClick = false;
        this.currentId = undefined;
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
        this.startingClick = false;
    }

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
        }

        return styles;

    }

}
