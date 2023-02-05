import {
    TerraDrawCallbacks,
    TerraDrawAdapter,
    TerraDrawModeRegisterConfig,
    TerraDrawAdapterStyling,
    TerraDrawChanges,
    TerraDrawMouseEvent,
} from "../common";

import { GeoJSONStoreFeatures } from "../store/store";
import { limitPrecision } from "../geometry/limit-decimal-precision";

import CircleGeom from 'ol/geom/Circle';
import Feature, { FeatureLike } from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Map from 'ol/Map';
import Circle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
import Geometry from "ol/geom/Geometry";
import { AdapterListener } from "./common/adapter-listener";

type InjectableOL = {
    Circle: typeof CircleGeom,
    Feature: typeof Feature,
    GeoJSON: typeof GeoJSON,
    Style: typeof Style
    CircleStyle: typeof Circle,
    VectorLayer: typeof VectorLayer,
    VectorSource: typeof VectorSource,
    Stroke: typeof Stroke,
    toLonLat: typeof toLonLat
}

export class TerraDrawOpenLayersAdapter implements TerraDrawAdapter {

    constructor(config: { map: Map; lib: InjectableOL, coordinatePrecision?: number }) {
        this._map = config.map;
        this._lib = config.lib;

        this._coordinatePrecision =
            typeof config.coordinatePrecision === "number"
                ? config.coordinatePrecision
                : 9;

        this.getMapContainer = () => {
            return this._map.getViewport();
        };

        this.project = (lng: number, lat: number) => {
            const [x, y] = this._map.getPixelFromCoordinate(fromLonLat([lng, lat]));
            return { x, y };
        };

        this.unproject = (x: number, y: number) => {
            const [lng, lat] = toLonLat(this._map.getCoordinateFromPixel([x, y]));
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
            this._map.getInteractions().forEach(function (interaction) {
                if (interaction.constructor.name === 'DoubleClickZoom') {
                    interaction.setActive(enabled);
                }
            });
        };

        // TODO: Is this the best way to recieve keyboard events
        this.getMapContainer().setAttribute("tabindex", "0");

        this._listeners = [
            new AdapterListener({
                name: 'click',
                callback: (event) => {
                    if (!this._currentModeCallbacks) return;
                    if (this._dragState === "not-dragging" || this._dragState === "pre-dragging") {
                        if (event.coordinate) {

                            const lngLat = this._lib.toLonLat(event.coordinate);

                            this._currentModeCallbacks.onClick({
                                lng: limitPrecision(lngLat[0], this._coordinatePrecision),
                                lat: limitPrecision(lngLat[1], this._coordinatePrecision),
                                containerX:
                                    event.originalEvent.clientX - this.getMapContainer().offsetLeft,
                                containerY:
                                    event.originalEvent.clientY - this.getMapContainer().offsetTop,
                                button: event.originalEvent.button === 0 ? "left" : "right",
                                heldKeys: [...this._heldKeys],
                            });
                        }
                    }
                },
                register: (callback) => {
                    return [
                        this._map.on("click", callback)
                    ];
                },
                unregister: (listeners: any[]) => {
                    listeners.forEach((listener) => {
                        this._map.un("click", listener);
                    });
                }
            }),
            new AdapterListener({
                name: 'pointermove',
                callback: (event) => {
                    if (!this._currentModeCallbacks) return;

                    const container = this.getMapContainer();

                    const point = {
                        x: event.clientX - container.offsetLeft,
                        y: event.clientY - container.offsetTop,
                    };

                    const { lng, lat } = this.unproject(point.x, point.y);

                    this._currentModeCallbacks.onMouseMove({
                        lng: limitPrecision(lng, this._coordinatePrecision),
                        lat: limitPrecision(lat, this._coordinatePrecision),
                        containerX:
                            event.clientX - this.getMapContainer().offsetLeft,
                        containerY:
                            event.clientY - this.getMapContainer().offsetTop,
                        button: event.button === 0 ? "left" : "right",
                        heldKeys: [...this._heldKeys],
                    });
                },
                register: (callback) => {
                    const container = this.getMapContainer();

                    return [
                        container.addEventListener("pointermove", callback)
                    ];
                },
                unregister: (listeners: any[]) => {
                    const container = this.getMapContainer();

                    listeners.forEach((listener) => {
                        container.removeEventListener("pointermove", listener);
                    });
                }
            }),
            new AdapterListener({
                name: 'mousedown',
                callback: (event) => {
                    if (!this._currentModeCallbacks) return;
                    this._dragState = "pre-dragging";
                },
                register: (callback) => {
                    const container = this.getMapContainer();

                    return [
                        container.addEventListener("mousedown", callback)
                    ];
                },
                unregister: (listeners: any[]) => {
                    const container = this.getMapContainer();

                    listeners.forEach((listener) => {
                        container.removeEventListener("mousedown", listener);
                    });
                }
            }),
            new AdapterListener({
                name: 'drag',
                callback: (event) => {
                    if (!this._currentModeCallbacks) return;
                    const container = this.getMapContainer();

                    const point = {
                        x: event.clientX - container.offsetLeft,
                        y: event.clientY - container.offsetTop,
                    };

                    const { lng, lat } = this.unproject(point.x, point.y);

                    const drawEvent: TerraDrawMouseEvent = {
                        lng: limitPrecision(lng, this._coordinatePrecision),
                        lat: limitPrecision(lat, this._coordinatePrecision),
                        containerX: event.clientX - container.offsetLeft,
                        containerY: event.clientY - container.offsetTop,
                        button: event.button === 0 ? "left" : "right",
                        heldKeys: [...this._heldKeys],
                    };

                    if (this._dragState === "pre-dragging") {
                        this._dragState = "dragging";
                        this._currentModeCallbacks.onDragStart(drawEvent, (enabled) => {
                            this._map.getInteractions().forEach(function (interaction) {
                                if (interaction.constructor.name === 'DragPan') {
                                    interaction.setActive(enabled);
                                }
                            });
                        });
                    } else if (this._dragState === "dragging") {
                        this._currentModeCallbacks.onDrag(drawEvent);
                    }
                },
                register: (callback) => {
                    const container = this.getMapContainer();
                    return [container.addEventListener("pointermove", callback)];
                },
                unregister: (listeners: any[]) => {
                    const container = this.getMapContainer();

                    listeners.forEach((listener) => {
                        container.addEventListener("pointermove", listener);
                    });
                }
            }),
            new AdapterListener({
                name: 'pointerup',
                callback: (event) => {
                    if (!this._currentModeCallbacks) return;
                    const container = this.getMapContainer();

                    if (this._dragState === "dragging") {
                        const point = {
                            x: event.clientX - container.offsetLeft,
                            y: event.clientY - container.offsetTop,
                        };

                        const { lng, lat } = this.unproject(point.x, point.y);

                        const drawEvent: TerraDrawMouseEvent = {
                            lng: limitPrecision(lng, this._coordinatePrecision),
                            lat: limitPrecision(lat, this._coordinatePrecision),
                            containerX: event.clientX - container.offsetLeft,
                            containerY: event.clientY - container.offsetTop,
                            button: event.button === 0 ? "left" : "right",
                            heldKeys: [...this._heldKeys],
                        };


                        this._currentModeCallbacks.onDragEnd(
                            drawEvent,
                            (enabled) => {
                                this._map.getInteractions().forEach(function (interaction) {
                                    if (interaction.constructor.name === 'DragPan') {
                                        interaction.setActive(enabled);
                                    }
                                });
                            }
                        );
                    }

                    this._dragState = "not-dragging";
                },
                register: (callback) => {
                    const container = this.getMapContainer();
                    return [
                        container.addEventListener("mouseup", callback),
                        container.addEventListener("pointerup", callback)
                    ];
                },
                unregister: (listeners: any[]) => {
                    const container = this.getMapContainer();

                    listeners.forEach((listener) => {
                        container.addEventListener("mouseup", listener);
                        container.addEventListener("pointerup", listener);
                    });
                }
            }),
            new AdapterListener({
                name: 'keydown',
                callback: (event) => {
                    if (!this._currentModeCallbacks) return;

                    event.preventDefault();
                    this._heldKeys.add(event.key);
                    this._currentModeCallbacks.onKeyDown({
                        key: event.key,
                    });

                },
                register: (callback) => {
                    const container = this.getMapContainer();
                    return [
                        container.addEventListener("keydown", callback)
                    ];
                },
                unregister: (listeners: any[]) => {
                    const container = this.getMapContainer();

                    listeners.forEach((listener) => {
                        container.addEventListener("keydown", listener);
                    });
                }
            }),
            new AdapterListener({
                name: 'keyup',
                callback: (event) => {
                    if (!this._currentModeCallbacks) return;

                    // map has no keypress event, so we add one to the canvas itself
                    event.preventDefault();
                    this._heldKeys.delete(event.key);

                    this._currentModeCallbacks.onKeyUp({
                        key: event.key,
                    });

                },
                register: (callback) => {
                    const container = this.getMapContainer();
                    return [
                        container.addEventListener("keyup", callback)
                    ];
                },
                unregister: (listeners: any[]) => {
                    const container = this.getMapContainer();

                    listeners.forEach((listener) => {
                        container.addEventListener("keyup", listener);
                    });
                }
            }),
        ];
    }

    private _dragState: "not-dragging" | "pre-dragging" | "dragging" =
        "not-dragging";
    private _listeners: AdapterListener[] = [];
    private _currentModeCallbacks: TerraDrawCallbacks | undefined;
    private _lib: InjectableOL;
    private _map: Map;
    private _heldKeys: Set<string> = new Set();
    private _coordinatePrecision: number;

    private HexToRGB(hex: string): { r: number; g: number; b: number } {
        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16)
        };
    }

    setDoubleClickToZoom: TerraDrawModeRegisterConfig["setDoubleClickToZoom"];
    unproject: TerraDrawModeRegisterConfig["unproject"];
    project: TerraDrawModeRegisterConfig["project"];
    setCursor: TerraDrawModeRegisterConfig["setCursor"];
    getMapContainer: () => HTMLElement;

    register(callbacks: TerraDrawCallbacks) {
        this._currentModeCallbacks = callbacks;

        this._listeners.forEach((listener) => {
            listener.register();
        });
    }

    unregister() {
        this._listeners.forEach((listener) => {
            listener.unregister();
        });
    }

    private vectorSource: undefined | VectorSource<Geometry>;

    private getStyles(feature: FeatureLike, styling: any) {

        const geometry = feature.getGeometry();
        if (!geometry) {
            return;
        }
        const key = geometry.getType() as 'Point' | 'LineString' | 'Polygon';

        return {
            'Point': (feature: FeatureLike) => {
                const properties = feature.getProperties();
                const style = styling[properties.mode]({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [] },
                    properties
                });
                return new this._lib.Style({
                    image: new Circle({
                        radius: style.pointWidth,
                        fill: new Fill({
                            color: style.pointColor
                        }),
                        stroke: new Stroke({
                            color: style.pointOutlineColor,
                            width: style.pointOutlineWidth
                        }),
                    })
                });
            },
            'LineString': (feature: FeatureLike) => {
                const properties = feature.getProperties();
                const style = styling[properties.mode]({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: [] },
                    properties
                });
                return new this._lib.Style({
                    stroke: new this._lib.Stroke({
                        color: style.lineStringColor,
                        width: style.lineStringWidth,
                    }),
                });
            },
            'Polygon': (feature: FeatureLike) => {
                const properties = feature.getProperties();
                const style = styling[properties.mode]({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: [] },
                    properties
                });
                const { r, g, b } = this.HexToRGB(style.polygonFillColor);

                return new Style({
                    stroke: new Stroke({
                        color: style.polygonOutlineColor,
                        width: style.polygonOutlineWidth
                    }),
                    fill: new Fill({
                        color: `rgba(${r},${g},${b},${style.polygonFillOpacity})`
                    }),
                });
            }
        }[key](feature);
    }

    private geoJSONReader: GeoJSON | undefined;

    private addFeature(feature: GeoJSONStoreFeatures) {
        if (this.vectorSource && this.geoJSONReader) {
            const olFeature = this.geoJSONReader.readFeature(
                feature,
                { featureProjection: this.projection }
            );
            this.vectorSource.addFeature(olFeature);
        } else {
            throw new Error("Vector Source not initalised");
        }
    }

    private removeFeature(id: string) {
        if (this.vectorSource) {
            const deleted = this.vectorSource.getFeatureById(id);
            if (!deleted) {
                return;
            }
            this.vectorSource.removeFeature(deleted);
        } else {
            throw new Error("Vector Source not initalised");
        }
    }

    private projection = 'EPSG:3857';

    render(
        changes: TerraDrawChanges,
        styling: { [mode: string]: (feature: GeoJSONStoreFeatures) => TerraDrawAdapterStyling }
    ) {

        if (!this.vectorSource) {
            this.geoJSONReader = new this._lib.GeoJSON();

            const vectorSourceFeatures = this.geoJSONReader.readFeatures(
                {
                    type: "FeatureCollection",
                    features: [
                        ...changes.created,
                        ...changes.updated,
                        ...changes.unchanged,
                    ]
                },
                { featureProjection: this.projection }
            );
            const vectorSource = new this._lib.VectorSource({
                features: vectorSourceFeatures
            });

            this.vectorSource = vectorSource;

            const vectorLayer = new this._lib.VectorLayer({
                source: vectorSource,
                style: (feature) => this.getStyles(feature, styling),
            });

            this._map.addLayer(vectorLayer);

        } else {

            const source = this.vectorSource;

            if (!source) {
                throw new Error("Vector Layer source has disappeared");
            }

            changes.deletedIds.forEach((id) => {
                this.removeFeature(id);
            });

            changes.updated.forEach((feature) => {
                this.removeFeature(feature.id as string);
                this.addFeature(feature);
            });

            changes.created.forEach((feature) => {
                this.addFeature(feature);
            });
        }
    }
}
