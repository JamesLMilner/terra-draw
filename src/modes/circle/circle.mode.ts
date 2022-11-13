import { Position } from "geojson";
import {
    TerraDrawMouseEvent,
    TerraDrawAdapterStyling,
    TerraDrawKeyboardEvent,
    HexColor,
} from "../../common";
import { haversineDistanceKilometers } from "../../geometry/measure/haversine-distance";
import { circle } from "../../geometry/shape/create-circle";
import { GeoJSONStoreFeatures } from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import { TerraDrawBaseDrawMode } from "../base.mode";

type TerraDrawCircleModeKeyEvents = {
    cancel: KeyboardEvent["key"];
};

type FreehandPolygonStyling = {
    fillColor: HexColor,
    outlineColor: HexColor,
    outlineWidth: number,
    fillOpacity: number,
}

export class TerraDrawCircleMode extends TerraDrawBaseDrawMode<FreehandPolygonStyling> {

    mode = "circle";
    private center: Position | undefined;
    private clickCount = 0;
    private currentCircleId: string | undefined;
    private keyEvents: TerraDrawCircleModeKeyEvents;

    constructor(options?: {
        styles?: Partial<FreehandPolygonStyling>;
        keyEvents?: TerraDrawCircleModeKeyEvents;
    }) {
        super(options);

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

    onClick(event: TerraDrawMouseEvent) {
        if (this.clickCount === 0) {
            this.center = [event.lng, event.lat];
            const startingCircle = circle({
                center: this.center,
                radiusKilometers: 0.00001,
            });

            const [createdId] = this.store.create([
                {
                    geometry: startingCircle.geometry,
                    properties: {
                        mode: this.mode,
                    },
                },
            ]);
            this.currentCircleId = createdId;
            this.clickCount++;
        } else {
            // Finish drawing
            this.center = undefined;
            this.currentCircleId = undefined;
            this.clickCount = 0;
        }
    }
    onMouseMove(event: TerraDrawMouseEvent) {
        if (this.clickCount === 1 && this.center && this.currentCircleId) {
            const distanceKm = haversineDistanceKilometers(this.center, [
                event.lng,
                event.lat,
            ]);

            const updatedCircle = circle({
                center: this.center,
                radiusKilometers: distanceKm,
            });

            this.store.updateGeometry([
                { id: this.currentCircleId, geometry: updatedCircle.geometry },
            ]);
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
            if (this.currentCircleId) {
                this.store.delete([this.currentCircleId]);
            }
        } catch (error) { }
        this.center = undefined;
        this.currentCircleId = undefined;
        this.clickCount = 0;
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
