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

import Circle from 'ol/geom/Circle';
import Feature, { FeatureLike } from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Map from 'ol/Map';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
import Geometry from "ol/geom/Geometry";

type InjectableOL = {
    Circle: typeof Circle,
    Feature: typeof Feature,
    GeoJSON: typeof GeoJSON,
    Style: typeof Style
    CircleStyle: typeof CircleStyle,
    VectorLayer: typeof VectorLayer,
    VectorSource: typeof VectorSource,
    Stroke: typeof Stroke,
    toLonLat: typeof toLonLat
}

export class TerraDrawOpenLayersAdapter implements TerraDrawAdapter {

    constructor(config: { map: Map; lib: InjectableOL, coordinatePrecision: number }) {
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
            const [lng, lat] = toLonLat(this._map.getCoordinateFromPixel([x, y]))
            return { lng, lat };
        };

        this.setCursor = (cursor) => {
            if (cursor === "unset") {
                this.getMapContainer().style.removeProperty("cursor");
            } else {
                this.getMapContainer().style.cursor = cursor;
            }
        };

        // this.setDoubleClickToZoom = (enabled: boolean) => {
        //     this._map.getInteractions().forEach(function (interaction) {
        //         if (interaction.constructor.name === 'DoubleClickZoom') {
        //             interaction.setActive(enabled);
        //         }
        //     });
        // }

        // TODO: Is this the best way to recieve keyboard events
        this.getMapContainer().setAttribute("tabindex", "0")
    }

    private _lib: InjectableOL;
    private _map: Map;
    private _heldKeys: Set<string> = new Set();
    private _coordinatePrecision: number;
    private _onMouseMoveListener: ((ev: any) => void) | undefined;
    private _onClickListener: ((ev: any) => void) | undefined;
    private _onKeyUpListener: ((ev: any) => void) | undefined;
    private _onKeyDownListener: ((ev: any) => void) | undefined;
    private _onDragStartListener: ((event: MouseEvent) => void) | undefined;
    private _onDragListener: ((event: MouseEvent) => void) | undefined;
    private _onDragEndListener: ((event: MouseEvent) => void) | undefined;

    private HexToRGB(hex: string): { r: number; g: number; b: number } {
        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16)
        };
    }

    // setDoubleClickToZoom: TerraDrawModeRegisterConfig["setDoubleClickToZoom"]
    unproject: TerraDrawModeRegisterConfig["unproject"];
    project: TerraDrawModeRegisterConfig["project"];
    setCursor: TerraDrawModeRegisterConfig["setCursor"];
    getMapContainer: () => HTMLElement;

    register(callbacks: TerraDrawCallbacks) {
        const container = this.getMapContainer()

        let dragState:
            | "not-dragging"
            | "pre-dragging"
            | "dragging"
            | "after-dragging" = "not-dragging";

        this._onClickListener = (event) => {
            if (dragState === "not-dragging" || dragState === "pre-dragging") {
                if (event.coordinate) {

                    let lngLat = this._lib.toLonLat(event.coordinate)

                    callbacks.onClick({
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
        };

        this._map.on("click", this._onClickListener);

        this._onMouseMoveListener = (event) => {

            const point = {
                x: event.clientX - container.offsetLeft,
                y: event.clientY - container.offsetTop,
            }

            const { lng, lat } = this.unproject(point.x, point.y);

            callbacks.onMouseMove({
                lng: limitPrecision(lng, this._coordinatePrecision),
                lat: limitPrecision(lat, this._coordinatePrecision),
                containerX:
                    event.clientX - this.getMapContainer().offsetLeft,
                containerY:
                    event.clientY - this.getMapContainer().offsetTop,
                button: event.button === 0 ? "left" : "right",
                heldKeys: [...this._heldKeys],
            });

        };
        container.addEventListener("pointermove", this._onMouseMoveListener);

        // DRAG

        this._onDragStartListener = (event) => {
            dragState = "pre-dragging";
        };

        container.addEventListener("mousedown", this._onDragStartListener);

        this._onDragListener = (event) => {
            const point = {
                x: event.clientX - container.offsetLeft,
                y: event.clientY - container.offsetTop,
            }

            const { lng, lat } = this.unproject(point.x, point.y);

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
                    this._map.getInteractions().forEach(function (interaction) {
                        if (interaction.constructor.name === 'DragPan') {
                            interaction.setActive(enabled);
                        }
                    });
                });
            } else if (dragState === "dragging") {
                callbacks.onDrag(drawEvent);
            }
        };

        container.addEventListener("pointermove", this._onDragListener);

        this._onDragEndListener = (event) => {
            if (dragState === "dragging") {
                const point = {
                    x: event.clientX - container.offsetLeft,
                    y: event.clientY - container.offsetTop,
                }

                const { lng, lat } = this.unproject(point.x, point.y);

                const drawEvent: TerraDrawMouseEvent = {
                    lng: limitPrecision(lng, this._coordinatePrecision),
                    lat: limitPrecision(lat, this._coordinatePrecision),
                    containerX: event.clientX - container.offsetLeft,
                    containerY: event.clientY - container.offsetTop,
                    button: event.button === 0 ? "left" : "right",
                    heldKeys: [...this._heldKeys],
                }


                callbacks.onDragEnd(
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

            dragState = "not-dragging";
        };

        container.addEventListener("mouseup", this._onDragEndListener);

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
    }

    private vectorSource: undefined | VectorSource<Geometry>;

    private getStyles(feature: FeatureLike, styling: any) {

        const geometry = feature.getGeometry()
        if (!geometry) {
            return
        }
        const key = geometry.getType() as 'Point' | 'LineString' | 'Polygon'

        return {
            'Point': (feature: FeatureLike) => {
                const properties = feature.getProperties();
                const style = styling[properties.mode]({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [] },
                    properties
                })
                return new this._lib.Style({
                    image: new CircleStyle({
                        radius: style.pointWidth,
                        fill: new Fill({
                            color: style.pointColor
                        }),
                        stroke: new Stroke({
                            color: style.pointOutlineColor,
                            width: style.pointOutlineWidth
                        }),
                    })
                })
            },
            'LineString': (feature: FeatureLike) => {
                const properties = feature.getProperties();
                const style = styling[properties.mode]({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: [] },
                    properties
                })
                return new this._lib.Style({
                    stroke: new this._lib.Stroke({
                        color: style.lineStringColor,
                        width: style.lineStringWidth,
                    }),
                })
            },
            'Polygon': (feature: FeatureLike) => {
                const properties = feature.getProperties();
                const style = styling[properties.mode]({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: [] },
                    properties
                })
                const { r, g, b } = this.HexToRGB(style.polygonFillColor)

                return new Style({
                    stroke: new Stroke({
                        color: style.polygonOutlineColor,
                        width: style.polygonOutlineWidth
                    }),
                    fill: new Fill({
                        color: `rgba(${r},${g},${b},${style.polygonFillOpacity})`
                    }),
                })
            }
        }[key](feature)
    }

    private geoJSONReader: GeoJSON | undefined

    private addFeature(feature: GeoJSONStoreFeatures) {
        if (this.vectorSource && this.geoJSONReader) {
            const olFeature = this.geoJSONReader.readFeature(
                feature,
                { featureProjection: this.projection }
            )
            this.vectorSource.addFeature(olFeature)
        } else {
            throw new Error("Vector Source not initalised")
        }
    }

    private removeFeature(id: string) {
        if (this.vectorSource) {
            const deleted = this.vectorSource.getFeatureById(id)
            if (!deleted) {
                return;
            }
            this.vectorSource.removeFeature(deleted)
        } else {
            throw new Error("Vector Source not initalised")
        }
    }

    private projection = 'EPSG:3857'

    render(
        changes: TerraDrawChanges,
        styling: { [mode: string]: (feature: GeoJSONStoreFeatures) => TerraDrawAdapterStyling }
    ) {

        if (!this.vectorSource) {
            this.geoJSONReader = new this._lib.GeoJSON()

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

            this.vectorSource = vectorSource

            const vectorLayer = new this._lib.VectorLayer({
                source: vectorSource,
                style: (feature) => this.getStyles(feature, styling),
            });

            this._map.addLayer(vectorLayer);

        } else {

            const source = this.vectorSource

            if (!source) {
                throw new Error("Vector Layer source has disappeared")
            }

            changes.deletedIds.forEach((id) => {
                this.removeFeature(id)
            })

            changes.updated.forEach((feature) => {
                this.removeFeature(feature.id as string)
                this.addFeature(feature)
            })

            changes.created.forEach((feature) => {
                this.addFeature(feature)
            })
        }
    }
}
