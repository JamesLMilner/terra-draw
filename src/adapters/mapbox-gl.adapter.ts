import {
    TerraDrawCallbacks,
    TerraDrawAdapter,
    TerraDrawModeRegisterConfig,
    TerraDrawAdapterStyling,
    TerraDrawChanges,
    TerraDrawMouseEvent,
    SELECT_PROPERTIES,
    POLYGON_PROPERTIES,
} from "../common";
import { Feature, LineString, Point, Polygon } from "geojson";
import { limitPrecision } from "../geometry/limit-decimal-precision";
import mapboxgl, {
    CircleLayer,
    FillLayer,
    LineLayer,
    PointLike,
} from "mapbox-gl";
import { GeoJSONStoreFeatures, GeoJSONStoreGeometries } from "../store/store";

export class TerraDrawMapboxGLAdapter implements TerraDrawAdapter {
    constructor(config: { map: mapboxgl.Map; coordinatePrecision: number }) {
        this._map = config.map;
        this._coordinatePrecision =
            typeof config.coordinatePrecision === "number"
                ? config.coordinatePrecision
                : 9;

        this.project = (lng: number, lat: number) => {
            const { x, y } = this._map.project({ lng, lat });
            return { x, y };
        };

        this.unproject = (x: number, y: number) => {
            const { lng, lat } = this._map.unproject({ x, y } as PointLike);
            return { lng, lat };
        };

        this.setCursor = (style) => {
            this._map.getCanvas().style.cursor = style;
        };

        this.getMapContainer = () => {
            return this._map.getContainer();
        };
    }

    public unproject: TerraDrawModeRegisterConfig["unproject"];
    public project: TerraDrawModeRegisterConfig["project"];
    public setCursor: TerraDrawModeRegisterConfig["setCursor"];

    public getMapContainer: () => HTMLElement;

    private _heldKeys: Set<string> = new Set();
    private _coordinatePrecision: number;
    private _map: mapboxgl.Map;
    private _onMouseMoveListener:
        | ((event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => void)
        | undefined;
    private _onClickListener:
        | ((event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => void)
        | undefined;
    private _onDragStartListener: ((event: MouseEvent) => void) | undefined;
    private _onDragListener: ((event: MouseEvent) => void) | undefined;
    private _onDragEndListener: ((event: MouseEvent) => void) | undefined;
    private _onKeyDownListener: ((event: KeyboardEvent) => void) | undefined;
    private _onKeyUpListener: ((event: KeyboardEvent) => any) | undefined;
    private _rendered: Record<string, boolean> = {};

    private _addGeoJSONSource(id: string, features: Feature[]) {
        this._map.addSource(id, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: features,
            },
        });
    }

    private _addFillLayer(
        id: string,
        mode: string,
        styling: TerraDrawAdapterStyling
    ) {
        return this._map.addLayer({
            id,
            source: id,
            type: "fill",
            filter: [
                "all",
                ["match", ["geometry-type"], "Polygon", true, false],
                ["match", ["get", "mode"], mode, true, false],
            ],
            paint: {
                "fill-color": ["get", "polygonFillColor"],
                "fill-opacity": styling.polygonFillOpacity,
            },
        } as FillLayer);
    }

    private _addFillOutlineLayer(
        id: string,
        mode: string,
        styling: TerraDrawAdapterStyling,
        beneath?: string
    ) {
        const layer = this._map.addLayer({
            id: id + "outline",
            source: id,
            type: "line",
            filter: [
                "all",
                ["match", ["geometry-type"], "Polygon", true, false],
                ["match", ["get", "mode"], mode, true, false],
            ],
            paint: {
                "line-width": styling.polygonOutlineWidth,
                "line-color": ["get", "polygonOutlineColor"],
            },
        } as LineLayer);

        if (beneath) {
            this._map.moveLayer(id, beneath);
        }

        return layer;
    }

    private _addLineLayer(
        id: string,
        mode: string,
        styling: TerraDrawAdapterStyling,
        beneath?: string
    ) {
        const layer = this._map.addLayer({
            id,
            source: id,
            type: "line",
            filter: [
                "all",
                ["match", ["geometry-type"], "LineString", true, false],
                ["match", ["get", "mode"], mode, true, false],
            ],
            paint: {
                "line-width": styling.lineStringWidth,
                "line-color": ["get", "lineStringColor"],
            },
        } as LineLayer);

        if (beneath) {
            this._map.moveLayer(id, beneath);
        }

        return layer;
    }

    private _addPointLayer(
        id: string,
        mode: string,
        styling: TerraDrawAdapterStyling,
        beneath?: string
    ) {
        const layer = this._map.addLayer({
            id,
            source: id,
            type: "circle",
            filter: [
                "all",
                ["match", ["geometry-type"], "Point", true, false],
                ["match", ["get", "mode"], mode, true, false],
            ],
            paint: {
                "circle-stroke-color": ["get", "selectedPointOutlineColor"],
                "circle-stroke-width": 2,
                "circle-radius": ["get", "pointWidth"],
                "circle-color": ["get", "pointColor"],
            },
        } as CircleLayer);
        if (beneath) {
            this._map.moveLayer(id, beneath);
        }
        return layer;
    }

    private _addLayer(
        id: string,
        mode: string,
        featureType: "Point" | "LineString" | "Polygon",
        styling: TerraDrawAdapterStyling,
        beneath?: string
    ) {
        if (featureType === "Point") {
            this._addPointLayer(id, mode, styling, beneath);
        }
        if (featureType === "LineString") {
            this._addLineLayer(id, mode, styling, beneath);
        }
        if (featureType === "Polygon") {
            this._addFillLayer(id, mode, styling);
            this._addFillOutlineLayer(id, mode, styling, beneath);
        }
    }

    private _addGeoJSONLayer<T extends GeoJSONStoreGeometries>(
        mode: string,
        featureType: Feature<T>["geometry"]["type"],
        features: Feature<T>[],
        styling: TerraDrawAdapterStyling
    ) {
        const id = `td-${mode}-${featureType.toLowerCase()}`;
        this._addGeoJSONSource(id, features);
        this._addLayer(id, mode, featureType, styling);

        return id;
    }

    private _setGeoJSONLayerData<T extends GeoJSONStoreGeometries>(
        mode: string,
        featureType: Feature<T>["geometry"]["type"],
        features: Feature<T>[]
    ) {
        const id = `td-${mode}-${featureType.toLowerCase()}`;
        (this._map.getSource(id) as any).setData({
            type: "FeatureCollection",
            features: features,
        });
        return id;
    }
    register(callbacks: TerraDrawCallbacks) {
        this._onClickListener = (event) => {
            callbacks.onClick({
                lng: limitPrecision(event.lngLat.lng, this._coordinatePrecision),
                lat: limitPrecision(event.lngLat.lat, this._coordinatePrecision),
                containerX:
                    event.originalEvent.clientX - this.getMapContainer().offsetLeft,
                containerY:
                    event.originalEvent.clientY - this.getMapContainer().offsetTop,
                button: event.originalEvent.button === 0 ? "left" : "right",
                heldKeys: [...this._heldKeys],
            });
        };
        this._map.on("click", this._onClickListener);
        this._map.on("contextmenu", this._onClickListener);

        this._onMouseMoveListener = (event) => {
            callbacks.onMouseMove({
                lng: limitPrecision(event.lngLat.lng, this._coordinatePrecision),
                lat: limitPrecision(event.lngLat.lat, this._coordinatePrecision),
                containerX:
                    event.originalEvent.clientX - this.getMapContainer().offsetLeft,
                containerY:
                    event.originalEvent.clientY - this.getMapContainer().offsetTop,
                button: event.originalEvent.button === 0 ? "left" : "right",
                heldKeys: [...this._heldKeys],
            });
        };
        this._map.on("mousemove", this._onMouseMoveListener);

        let dragState: "not-dragging" | "pre-dragging" | "dragging" =
            "not-dragging";

        this._onDragStartListener = (event) => {
            dragState = "pre-dragging";
        };

        const container = this.getMapContainer();

        container.addEventListener("mousedown", this._onDragStartListener);

        this._onDragListener = (event) => {
            const { lng, lat } = this._map.unproject({
                x: event.clientX - container.offsetLeft,
                y: event.clientY - container.offsetTop,
            } as any);

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
                        this._map.dragPan.enable();
                    } else {
                        this._map.dragPan.disable();
                    }
                });
            } else if (dragState === "dragging") {
                callbacks.onDrag(drawEvent);
            }
        };

        container.addEventListener("mousemove", this._onDragListener);

        this._onDragEndListener = (event) => {
            if (dragState === "dragging") {
                const point = {
                    x: event.clientX - container.offsetLeft,
                    y: event.clientY - container.offsetTop,
                } as mapboxgl.Point;

                const { lng, lat } = this._map.unproject(point);

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
                            this._map.dragPan.enable();
                        } else {
                            this._map.dragPan.disable();
                        }
                    }
                );
            }

            dragState = "not-dragging";
        };

        container.addEventListener("mouseup", this._onDragEndListener);

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
            this._map.off("contextmenue", this._onClickListener);
            this._map.off("click", this._onClickListener);
            this._onClickListener = undefined;
        }

        if (this._onMouseMoveListener) {
            this._map.off("mousemove", this._onMouseMoveListener);
            this._onMouseMoveListener = undefined;
        }

        if (this._onKeyUpListener) {
            this._map
                .getCanvas()
                .removeEventListener("keypress", this._onKeyUpListener);
        }

        if (this._onDragStartListener) {
            this._map
                .getCanvas()
                .removeEventListener("mousedown", this._onDragStartListener);
        }

        if (this._onDragListener) {
            this._map
                .getCanvas()
                .removeEventListener("mousemove", this._onDragListener);
        }

        if (this._onDragEndListener) {
            this._map
                .getCanvas()
                .removeEventListener("mouseup", this._onDragEndListener);
        }
    }

    render(
        changes: TerraDrawChanges,
        styling: { [mode: string]: TerraDrawAdapterStyling }
    ) {
        const features = [
            ...changes.created,
            ...changes.updated,
            ...changes.unchanged,
        ];

        const modeFeatures: {
            [key: string]: {
                points: GeoJSONStoreFeatures[];
                linestrings: GeoJSONStoreFeatures[];
                polygons: GeoJSONStoreFeatures[];
            };
        } = {};

        for (let i = 0; i < features.length; i++) {
            const feature = features[i];

            Object.keys(styling).forEach((mode) => {
                const styles = styling[mode];

                const { properties } = feature;

                if (properties.mode !== mode) {
                    return;
                }

                if (!modeFeatures[mode]) {
                    modeFeatures[mode] = {
                        points: [],
                        linestrings: [],
                        polygons: [],
                    };
                }

                if (feature.geometry.type === "Point") {
                    if (
                        properties[SELECT_PROPERTIES.SELECTED] ||
                        properties.selectionPoint
                    ) {
                        properties.pointColor = styles.selectedColor;
                        properties.selectedPointOutlineColor =
                            styles.selectedPointOutlineColor;
                        properties.pointWidth = styles.selectionPointWidth;
                    } else if (properties[SELECT_PROPERTIES.MID_POINT]) {
                        properties.pointColor = styles.midPointColor;
                        properties.selectedPointOutlineColor =
                            styles.midPointOutlineColor;
                        properties.pointWidth = styles.midPointWidth;
                    } else if (properties[POLYGON_PROPERTIES.CLOSING_POINT]) {
                        properties.pointColor = styles.closingPointColor;
                        properties.selectedPointOutlineColor = styles.closingPointOutlineColor;
                        properties.pointWidth = styles.closingPointWidth;
                    } else {
                        properties.pointColor = styles.pointColor;
                        properties.selectedPointOutlineColor = styles.pointColor;
                        properties.pointWidth = styles.pointWidth;
                    }
                    modeFeatures[mode].points.push(feature);
                } else if (feature.geometry.type === "LineString") {
                    if (properties[SELECT_PROPERTIES.SELECTED]) {
                        properties.lineStringColor = styles.selectedColor;
                    } else {
                        properties.lineStringColor = styles.lineStringColor;
                    }
                    modeFeatures[mode].linestrings.push(feature);
                } else if (feature.geometry.type === "Polygon") {
                    if (properties[SELECT_PROPERTIES.SELECTED]) {
                        properties.polygonFillColor = styles.selectedColor;
                        properties.polygonOutlineColor = styles.selectedColor;
                    } else {
                        properties.polygonFillColor = styles.polygonFillColor;
                        properties.polygonOutlineColor = styles.polygonOutlineColor;
                    }
                    modeFeatures[mode].polygons.push(feature);
                }
            });
        }

        Object.keys(styling).forEach((mode) => {
            const styles = styling[mode];
            if (!modeFeatures[mode] || !styles) {
                return;
            }
            const { points, linestrings, polygons } = modeFeatures[mode];

            if (!this._rendered[mode]) {
                this._addGeoJSONLayer<Point>(
                    mode,
                    "Point",
                    points as Feature<Point>[],
                    styles
                );
                this._addGeoJSONLayer<LineString>(
                    mode,
                    "LineString",
                    linestrings as Feature<LineString>[],
                    styles
                );
                this._addGeoJSONLayer<Polygon>(
                    mode,
                    "Polygon",
                    polygons as Feature<Polygon>[],
                    styles
                );
                this._rendered[mode] = true;
            } else {
                const pointId = this._setGeoJSONLayerData<Point>(
                    mode,
                    "Point",
                    points as Feature<Point>[]
                );
                this._setGeoJSONLayerData<LineString>(
                    mode,
                    "LineString",
                    linestrings as Feature<LineString>[]
                );
                this._setGeoJSONLayerData<Polygon>(
                    mode,
                    "Polygon",
                    polygons as Feature<Polygon>[]
                );

                // TODO: This logic could be better - I think this will render the selection points above user
                // defined layers outside of TerraDraw which is perhaps unideal

                // Ensure selection/mid points are rendered on top
                this._map.moveLayer(pointId);
            }
        });
    }
}
