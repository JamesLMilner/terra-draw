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
import { AdapterListener } from "./common/adapter-listener";

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


        this.listeners = [
            new AdapterListener({
                name: 'click',
                callback: (event: L.LeafletMouseEvent) => {
                    if (!this.currentModeCallbacks) return

                    if (this.dragState === "not-dragging" || this.dragState === "pre-dragging") {
                        this.currentModeCallbacks.onClick({
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
                },
                register: (callback) => {
                    // We can't use 'click' here because it triggers
                    // after drag end in Leaflet for some reason
                    return [
                        this._map.on("mouseup", callback),
                        this._map.on("contextmenu", callback)
                    ]

                },
                unregister: (listeners: any[]) => {
                    listeners.forEach((listener) => {
                        this._map.off("contextmenu", listener);
                        this._map.off("click", listener);
                    })

                }
            }),
            new AdapterListener({
                name: 'mousemove',
                callback: (event: L.LeafletMouseEvent) => {
                    event.originalEvent.preventDefault();

                    if (!this.currentModeCallbacks) {
                        return
                    }

                    this.currentModeCallbacks.onMouseMove({
                        lng: limitPrecision(event.latlng.lng, this._coordinatePrecision),
                        lat: limitPrecision(event.latlng.lat, this._coordinatePrecision),
                        containerX:
                            event.originalEvent.clientX - this.getMapContainer().offsetLeft,
                        containerY:
                            event.originalEvent.clientY - this.getMapContainer().offsetTop,
                        button: event.originalEvent.button === 0 ? "left" : "right",
                        heldKeys: [...this._heldKeys],
                    });
                },
                register: (callback) => {
                    return [this._map.on("mousemove", callback)]
                },
                unregister: (listeners: any[]) => {
                    listeners.forEach((listener) => {
                        this._map.off("mousemove", listener);
                    })
                }
            }),
            new AdapterListener({
                name: 'pointerdown',
                callback: (event) => {
                    this.dragState = "pre-dragging";
                },
                register: (callback) => {
                    return [this.getMapContainer().addEventListener("pointerdown", callback)]
                },
                unregister: (listeners: any[]) => {
                    listeners.forEach((listener) => {
                        this.getMapContainer().removeEventListener("pointerdown", listener);
                    })
                }
            }),
            new AdapterListener({
                name: 'pointermove',
                callback: (event) => {

                    if (!this.currentModeCallbacks) return;

                    const container = this.getMapContainer();

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

                    if (this.dragState === "pre-dragging") {
                        this.dragState = "dragging";

                        this.currentModeCallbacks.onDragStart(drawEvent, (enabled) => {
                            if (enabled) {
                                this._map.dragging.enable();
                            } else {
                                this._map.dragging.disable();
                            }
                        });
                    } else if (this.dragState === "dragging") {
                        this.currentModeCallbacks.onDrag(drawEvent);
                    }
                },
                register: (callback) => {
                    const container = this.getMapContainer();

                    return [container.addEventListener("pointermove", callback)]
                },
                unregister: (listeners: any[]) => {
                    listeners.forEach((listener) => {
                        const container = this.getMapContainer();
                        container.removeEventListener("pointermove", listener);
                    })

                },
            }),
            new AdapterListener({
                name: 'pointerup',
                callback: (event) => {

                    if (!this.currentModeCallbacks) return;

                    event.preventDefault();

                    const container = this.getMapContainer()

                    if (this.dragState === "dragging") {
                        const point = {
                            x: event.clientX - container.offsetLeft,
                            y: event.clientY - container.offsetTop,
                        } as L.Point;

                        const { lng, lat } = this._map.containerPointToLatLng(point);

                        this.currentModeCallbacks.onDragEnd(
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
                        this.dragState = "after-dragging";
                        this._map.dragging.enable();
                        return;
                    }

                    this.dragState = "not-dragging";
                    this._map.dragging.enable();
                },
                register: (callback) => {
                    const container = this.getMapContainer()
                    return [container.addEventListener("pointerup", callback)]
                },
                unregister: (listeners: any[]) => {
                    const container = this.getMapContainer()

                    listeners.forEach((listener) => {
                        container.removeEventListener("pointerup", listener)
                    })
                }
            }),
            new AdapterListener({
                name: 'keyup',
                callback: (event: KeyboardEvent) => {
                    // map has no keypress event, so we add one to the canvas itself

                    if (!this.currentModeCallbacks) return;

                    event.preventDefault();

                    this._heldKeys.delete(event.key);

                    this.currentModeCallbacks.onKeyUp({
                        key: event.key,
                    });

                },
                register: (callback) => {
                    const container = this.getMapContainer()
                    return [container.addEventListener("keyup", callback)]
                },
                unregister: (listeners: any[]) => {
                    const container = this.getMapContainer()

                    listeners.forEach((listener) => {
                        container.removeEventListener("keyup", listener)
                    })
                }
            }),
            new AdapterListener({
                name: 'keydown',
                callback: (event: KeyboardEvent) => {

                    if (!this.currentModeCallbacks) {
                        return;
                    }

                    event.preventDefault();

                    this._heldKeys.add(event.key);

                    this.currentModeCallbacks.onKeyDown({
                        key: event.key,
                    });

                },
                register: (callback) => {
                    const container = this.getMapContainer()

                    return [container.addEventListener("keydown", callback)];

                },
                unregister: (listeners: any[]) => {
                    const container = this.getMapContainer()

                    listeners.forEach((listener) => {
                        container.removeEventListener("keydown", listener)
                    })
                }
            })
        ]
    }

    private listeners: AdapterListener[] = []

    private _heldKeys: Set<string> = new Set();
    private _lib: typeof L;
    private _coordinatePrecision: number;
    private _map: L.Map;
    private _layer: L.Layer | undefined;
    private _panes: Record<string, HTMLStyleElement | undefined> = {};
    private dragState:
        | "not-dragging"
        | "pre-dragging"
        | "dragging"
        | "after-dragging" = "not-dragging";
    private currentModeCallbacks: TerraDrawCallbacks | undefined;

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
        this.currentModeCallbacks = callbacks

        this.listeners.forEach((listener) => {
            listener.register()
        })
    }

    unregister() {
        this.listeners.forEach((listener) => {
            listener.unregister()
        })

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
