import {
    TerraDrawCallbacks,
    TerraDrawAdapter,
    TerraDrawModeRegisterConfig,
    TerraDrawAdapterStyling,
    TerraDrawChanges,
    TerraDrawMouseEvent
} from "../common";
import L from "leaflet";
import { limitPrecision } from "../geometry/limit-decimal-precision";
import { GeoJSONStoreFeatures } from "../store/store";

export class TerraDrawLeafletAdapter implements TerraDrawAdapter {
    constructor(config: {
        lib: typeof L;
        map: L.Map;
        coordinatePrecision?: number;
    }) {
        this._lib = config.lib;
        this._map = config.map;
        this._coordinatePrecision =
            typeof config.coordinatePrecision === "number"
                ? config.coordinatePrecision
                : 9;

        this.getMapContainer = () => {
            return this._map.getContainer();
        };

        this.project = (lng: number, lat: number) => {
            const { x, y } = this._map.latLngToContainerPoint({ lng, lat });
            return { x, y };
        };

        this.unproject = (x: number, y: number) => {
            const { lng, lat } = this._map.containerPointToLatLng({
                x,
                y,
            } as L.PointExpression);
            return { lng, lat };
        };

        this.setCursor = (cursor) => {
            if (cursor === "unset") {
                this.getMapContainer().style.removeProperty("cursor");
            } else {
                this.getMapContainer().style.cursor = cursor;
            }
        };

        this.setDoubleClickToZoom = (enabled: boolean) => {
            if (enabled) {
                this._map.doubleClickZoom.enable();
            } else {
                this._map.doubleClickZoom.disable();
            }
        };
    }

    private _heldKeys: Set<string> = new Set();
    private _lib: typeof L;
    private _coordinatePrecision: number;
    private _map: L.Map;
    private _onMouseMoveListener: ((ev: any) => void) | undefined;
    private _onClickListener: ((ev: any) => void) | undefined;
    private _onKeyUpListener: ((ev: any) => void) | undefined;
    private _onKeyDownListener: ((ev: any) => void) | undefined;

    private _onDragStartListener: ((event: MouseEvent) => void) | undefined;
    private _onDragListener: ((event: MouseEvent) => void) | undefined;
    private _onDragEndListener: ((event: MouseEvent) => void) | undefined;
    private _layer: L.Layer | undefined;
    private _panes: Record<string, HTMLStyleElement | undefined> = {};

    public setDoubleClickToZoom: TerraDrawModeRegisterConfig["setDoubleClickToZoom"];
    public project: TerraDrawModeRegisterConfig["project"];
    public unproject: TerraDrawModeRegisterConfig["unproject"];
    public setCursor: TerraDrawModeRegisterConfig["setCursor"];

    public getMapContainer: () => HTMLElement;

    private createPaneStyleSheet(pane: string, zIndex: number) {
        const style = document.createElement("style");
        style.type = "text/css";
        style.innerHTML = `.leaflet-${pane} {z-index: ${zIndex};}`;
        document.getElementsByTagName("head")[0].appendChild(style);
        this._map.createPane(pane);
        return style;
    }

    register(callbacks: TerraDrawCallbacks) {

        const container = this.getMapContainer();

        let dragState:
            | "not-dragging"
            | "pre-dragging"
            | "dragging"
            | "after-dragging" = "not-dragging";

        this._onClickListener = (event: L.LeafletMouseEvent) => {
            if (dragState === "not-dragging" || dragState === "pre-dragging") {
                callbacks.onClick({
                    lng: limitPrecision(event.latlng.lng, this._coordinatePrecision),
                    lat: limitPrecision(event.latlng.lat, this._coordinatePrecision),
                    containerX:
                        event.originalEvent.clientX - this.getMapContainer().offsetLeft,
                    containerY:
                        event.originalEvent.clientY - this.getMapContainer().offsetTop,
                    button: event.originalEvent.button === 0 ? "left" : "right",
                    heldKeys: [...this._heldKeys],
                });
            }
        };

        // We can't use 'click' here because it triggers
        // after drag end in Leaflet for some reason
        this._map.on("mouseup", this._onClickListener);
        this._map.on("contextmenu", this._onClickListener);

        this._onMouseMoveListener = (event: L.LeafletMouseEvent) => {
            event.originalEvent.preventDefault();

            callbacks.onMouseMove({
                lng: limitPrecision(event.latlng.lng, this._coordinatePrecision),
                lat: limitPrecision(event.latlng.lat, this._coordinatePrecision),
                containerX:
                    event.originalEvent.clientX - this.getMapContainer().offsetLeft,
                containerY:
                    event.originalEvent.clientY - this.getMapContainer().offsetTop,
                button: event.originalEvent.button === 0 ? "left" : "right",
                heldKeys: [...this._heldKeys],
            });
        };
        this._map.on("mousemove", this._onMouseMoveListener);

        this._onDragStartListener = (event) => {
            dragState = "pre-dragging";
        };
        container.addEventListener("pointerdown", this._onDragStartListener);

        this._onDragListener = (event) => {
            const point = {
                x: event.clientX - container.offsetLeft,
                y: event.clientY - container.offsetTop,
            } as L.Point;

            const { lng, lat } = this._map.containerPointToLatLng(point);

            const drawEvent: TerraDrawMouseEvent = {
                lng: limitPrecision(lng, this._coordinatePrecision),
                lat: limitPrecision(lat, this._coordinatePrecision),
                containerX: event.clientX - container.offsetLeft,
                containerY: event.clientY - container.offsetTop,
                button: event.button === 0 ? "left" : "right",
                heldKeys: [...this._heldKeys],
            };

            if (dragState === "pre-dragging") {
                dragState = "dragging";

                callbacks.onDragStart(drawEvent, (enabled) => {
                    if (enabled) {
                        this._map.dragging.enable();
                    } else {
                        this._map.dragging.disable();
                    }
                });
            } else if (dragState === "dragging") {
                callbacks.onDrag(drawEvent);
            }
        };

        container.addEventListener("pointermove", this._onDragListener);

        this._onDragEndListener = (event) => {
            event.preventDefault();

            if (dragState === "dragging") {
                const point = {
                    x: event.clientX - container.offsetLeft,
                    y: event.clientY - container.offsetTop,
                } as L.Point;

                const { lng, lat } = this._map.containerPointToLatLng(point);

                callbacks.onDragEnd(
                    {
                        lng: limitPrecision(lng, this._coordinatePrecision),
                        lat: limitPrecision(lat, this._coordinatePrecision),
                        containerX: event.clientX - container.offsetLeft,
                        containerY: event.clientY - container.offsetTop,
                        button: event.button === 0 ? "left" : "right",
                        heldKeys: [...this._heldKeys],
                    },
                    (enabled) => {
                        if (enabled) {
                            this._map.dragging.enable();
                        } else {
                            this._map.dragging.disable();
                        }
                    }
                );

                // We want to avoid triggering an click
                // event after dragging
                dragState = "after-dragging";
                this._map.dragging.enable();
                return;
            }

            dragState = "not-dragging";
            this._map.dragging.enable();
        };

        container.addEventListener("pointerup", this._onDragEndListener);

        // map has no keypress event, so we add one to the canvas itself
        this._onKeyUpListener = (event: KeyboardEvent) => {
            event.preventDefault();

            this._heldKeys.delete(event.key);

            callbacks.onKeyUp({
                key: event.key,
            });
        };
        container.addEventListener("keyup", this._onKeyUpListener);

        this._onKeyDownListener = (event: KeyboardEvent) => {
            event.preventDefault();

            this._heldKeys.add(event.key);

            callbacks.onKeyDown({
                key: event.key,
            });
        };
        container.addEventListener("keydown", this._onKeyDownListener);
    }

    unregister() {
        if (this._onClickListener) {
            this._map.off("contextmenu", this._onClickListener);
            this._map.off("click", this._onClickListener);
            this._onClickListener = undefined;
        }
        if (this._onMouseMoveListener) {
            this._map.off("click", this._onClickListener);
            this._onClickListener = undefined;
        }

        Object.keys(this._panes).forEach((pane) => {
            const selectedPane = this._map.getPane(pane);
            if (selectedPane) {
                selectedPane.remove();
            }
        });
    }

    render(
        changes: TerraDrawChanges,
        styling: { [mode: string]: (feature: GeoJSONStoreFeatures) => TerraDrawAdapterStyling }
    ) {
        const features = [
            ...changes.created,
            ...changes.updated,
            ...changes.unchanged,
        ];

        if (this._layer) {
            this._map.removeLayer(this._layer);
        }

        const featureCollection = {
            type: "FeatureCollection",
            features,
        } as { type: "FeatureCollection", features: GeoJSONStoreFeatures[] };

        const layer = this._lib.geoJSON(featureCollection, {
            // Style points - convert markers to circle markers
            pointToLayer: (feature: GeoJSONStoreFeatures, latlng: L.LatLngExpression) => {
                if (!feature.properties) {
                    throw new Error("Feature has no properties");
                }
                if (typeof feature.properties.mode !== 'string') {
                    throw new Error("Feature mode is not a string");
                }

                const mode = feature.properties.mode;
                const modeStyle = styling[mode];
                const featureStyles = modeStyle(feature);
                const paneId = String(featureStyles.zIndex);
                const pane = this._panes[paneId];

                if (!pane) {
                    this._panes[paneId] = this.createPaneStyleSheet(paneId, featureStyles.zIndex);
                }

                const styles = {
                    radius: featureStyles.pointWidth,
                    stroke: featureStyles.pointOutlineWidth || false,
                    color: featureStyles.pointOutlineColor,
                    weight: featureStyles.pointOutlineWidth,
                    fillOpacity: 0.8,
                    fillColor: featureStyles.pointColor,
                    pane: paneId,
                    interactive: false, // Removes mouse hover cursor styles
                } as L.CircleMarkerOptions;

                const marker = this._lib.circleMarker(latlng, styles);

                return marker;
            },

            // Style LineStrings and Polygons
            style: (_feature) => {
                if (!_feature || !_feature.properties) {
                    return {};
                }

                const feature = _feature as GeoJSONStoreFeatures;

                const mode = feature.properties.mode as string;
                const modeStyle = styling[mode];
                const featureStyles = modeStyle(feature);

                if (feature.geometry.type === "LineString") {
                    return {
                        interactive: false, // Removes mouse hover cursor styles
                        color: featureStyles.lineStringColor,
                        weight: featureStyles.lineStringWidth,
                    };
                } else if (feature.geometry.type === "Polygon") {
                    return {
                        interactive: false, // Removes mouse hover cursor styles
                        fillOpacity: featureStyles.polygonFillOpacity,
                        fillColor: featureStyles.polygonFillColor,
                        weight: featureStyles.polygonOutlineWidth,
                        stroke: true,
                        color: featureStyles.polygonFillColor
                    };
                }

                return {};
            },
        });

        this._map.addLayer(layer);

        this._layer = layer;
    }
}
