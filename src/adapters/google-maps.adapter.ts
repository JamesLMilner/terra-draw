import {
    TerraDrawCallbacks,
    TerraDrawAdapter,
    TerraDrawModeRegisterConfig,
    TerraDrawAdapterStyling,
    TerraDrawChanges,
    TerraDrawMouseEvent,
    SELECT_PROPERTIES,
} from "../common";
import { GeoJsonObject } from "geojson";

import { limitPrecision } from "../geometry/limit-decimal-precision";

export class TerraDrawGoogleMapsAdapter implements TerraDrawAdapter {
    constructor(config: {
        lib: typeof google.maps;
        map: google.maps.Map;
        coordinatePrecision?: number;
    }) {
        this._lib = config.lib;
        this._map = config.map;
        this._coordinatePrecision =
            typeof config.coordinatePrecision === "number"
                ? config.coordinatePrecision
                : 9;

        this.getMapContainer = () => {
            return this._map.getDiv();
        };

        this.project = (lng, lat) => {
            const bounds = this._map.getBounds();

            if (bounds === undefined) {
                throw new Error("cannot get bounds");
            }

            const northWest = new this._lib.LatLng(
                bounds.getNorthEast().lat(),
                bounds.getSouthWest().lng()
            );

            const projection = this._map.getProjection();
            if (projection === undefined) {
                throw new Error("cannot get projection");
            }

            const projectedNorthWest = projection.fromLatLngToPoint(northWest);
            if (projectedNorthWest === null) {
                throw new Error("cannot get projectedNorthWest");
            }

            const projected = projection.fromLatLngToPoint({ lng, lat });
            if (projected === null) {
                throw new Error("cannot get projected lng lat");
            }

            const zoom = this._map.getZoom();
            if (zoom === undefined) {
                throw new Error("cannot get zoom");
            }

            const scale = Math.pow(2, zoom);
            return {
                x: Math.floor((projected.x - projectedNorthWest.x) * scale),
                y: Math.floor((projected.y - projectedNorthWest.y) * scale),
            };
        };

        this.unproject = (x, y) => {
            const projection = this._map.getProjection();
            if (projection === undefined) {
                throw new Error("cannot get projection");
            }

            const bounds = this._map.getBounds();
            if (bounds === undefined) {
                throw new Error("cannot get bounds");
            }

            const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
            if (topRight === null) {
                throw new Error("cannot get topRight");
            }

            const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
            if (bottomLeft === null) {
                throw new Error("cannot get bottomLeft");
            }

            const zoom = this._map.getZoom();
            if (zoom === undefined) {
                throw new Error("zoom get bounds");
            }

            const scale = Math.pow(2, zoom);

            const worldPoint = new google.maps.Point(
                x / scale + bottomLeft.x,
                y / scale + topRight.y
            );
            const lngLat = projection.fromPointToLatLng(worldPoint);

            if (lngLat === null) {
                throw new Error("zoom get bounds");
            }

            return { lng: lngLat.lng(), lat: lngLat.lat() };
        };

        this.setCursor = (cursor) => {
            if (cursor === this._cursor) {
                return;
            }

            if (this._cursorStyleSheet) {
                this._cursorStyleSheet.remove();
                this._cursorStyleSheet = undefined;
            }

            if (cursor !== "unset") {
                // TODO: We could cache these individually per cursor

                const div = this.getMapContainer();
                const style = document.createElement("style");
                style.type = "text/css";
                const selector = `#${div.id} [aria-label="Map"]`;
                style.innerHTML = `${selector} { cursor: ${cursor} !important; }`;
                document.getElementsByTagName("head")[0].appendChild(style);
                this._cursorStyleSheet = style;
            }

            this._cursor = cursor;
        };
    }

    private _heldKeys: Set<string> = new Set();
    private _cursor: string | undefined;
    private _cursorStyleSheet: HTMLStyleElement | undefined;
    private _coordinatePrecision: number;
    private _lib: typeof google.maps;
    private _map: google.maps.Map;
    private _onMouseMoveListener: google.maps.MapsEventListener | undefined;
    private _onMouseMoveCallback:
        | ((
            event: google.maps.MapMouseEvent & {
                domEvent: MouseEvent;
            }
        ) => void)
        | undefined;
    private _onClickListener: google.maps.MapsEventListener | undefined;
    private _onRightClickListener: google.maps.MapsEventListener | undefined;
    private _onClickCallback:
        | ((
            event: google.maps.MapMouseEvent & {
                domEvent: MouseEvent;
            }
        ) => void)
        | undefined;
    private _onKeyUpListener: any;
    private _onDragStartListener: ((event: MouseEvent) => void) | undefined;
    private _onDragListener: ((event: MouseEvent) => void) | undefined;
    private _onDragEndListener: ((event: MouseEvent) => void) | undefined;
    private _layers = false;

    public getMapContainer: () => HTMLElement;

    public unproject: (x: number, y: number) => { lng: number; lat: number };
    public project: TerraDrawModeRegisterConfig["project"];
    public setCursor: TerraDrawModeRegisterConfig["setCursor"];

    // https://stackoverflow.com/a/27905268/1363484
    private circlePath(cx: number, cy: number, r: number) {
        return (
            "M " +
            cx +
            " " +
            cy +
            " m -" +
            r +
            ", 0 a " +
            r +
            "," +
            r +
            " 0 1,0 " +
            r * 2 +
            ",0 a " +
            r +
            "," +
            r +
            " 0 1,0 -" +
            r * 2 +
            ",0"
        );
    }

    register(callbacks: TerraDrawCallbacks) {
        this._onClickCallback = (
            event: google.maps.MapMouseEvent & {
                domEvent: MouseEvent;
            }
        ) => {
            if (!event.latLng) {
                return;
            }
            callbacks.onClick({
                lng: limitPrecision(event.latLng.lng(), this._coordinatePrecision),
                lat: limitPrecision(event.latLng.lat(), this._coordinatePrecision),
                containerX: event.domEvent.clientX - this.getMapContainer().offsetLeft,
                containerY: event.domEvent.clientY - this.getMapContainer().offsetTop,
                button: event.domEvent.button === 0 ? "left" : "right",
                heldKeys: [...this._heldKeys],
            });
        };
        this._onClickListener = this._map.addListener(
            "click",
            this._onClickCallback
        );

        this._onRightClickListener = this._map.addListener(
            "rightclick",
            this._onClickCallback
        );

        this._onMouseMoveCallback = (
            event: google.maps.MapMouseEvent & {
                domEvent: MouseEvent;
            }
        ) => {
            if (!event.latLng) {
                return;
            }
            callbacks.onMouseMove({
                lng: limitPrecision(event.latLng.lng(), this._coordinatePrecision),
                lat: limitPrecision(event.latLng.lat(), this._coordinatePrecision),
                containerX: event.domEvent.clientX - this.getMapContainer().offsetLeft,
                containerY: event.domEvent.clientY - this.getMapContainer().offsetTop,
                button: event.domEvent.button === 0 ? "left" : "right",
                heldKeys: [...this._heldKeys],
            });
        };
        this._onMouseMoveListener = this._map.addListener(
            "mousemove",
            this._onMouseMoveCallback
        );

        this._onKeyUpListener = (event: KeyboardEvent) => {
            callbacks.onKeyUp({
                key: event.key,
            });
        };

        this.getMapContainer().addEventListener("keyup", this._onKeyUpListener);

        let dragState: "not-dragging" | "pre-dragging" | "dragging" =
            "not-dragging";

        this._onDragStartListener = (event) => {
            dragState = "pre-dragging";
        };

        const container = this.getMapContainer();

        container.addEventListener("mousedown", this._onDragStartListener);

        this._onDragListener = (event) => {
            const point = {
                x: event.clientX - container.offsetLeft,
                y: event.clientY - container.offsetTop,
            } as L.Point;

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
                    this._map.setOptions({ draggable: false });
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
                } as L.Point;

                const { lng, lat } = this.unproject(point.x, point.y);

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
                        this._map.setOptions({ draggable: enabled });
                    }
                );
            }

            dragState = "not-dragging";
        };

        container.addEventListener("mouseup", this._onDragEndListener);
    }

    unregister() {
        if (this._onClickListener) {
            this._onClickCallback = undefined;
            this._onClickListener.remove();
            this._onClickListener = undefined;
        }
        if (this._onRightClickListener) {
            this._onClickCallback = undefined;
            this._onRightClickListener.remove();
            this._onRightClickListener = undefined;
        }
        if (this._onMouseMoveListener) {
            this._onMouseMoveCallback = undefined;
            this._onMouseMoveListener.remove();
            this._onMouseMoveListener = undefined;
        }

        if (this._onKeyUpListener) {
            this.getMapContainer().removeEventListener(
                "keyup",
                this._onKeyUpListener
            );
            this._onKeyUpListener = undefined;
        }
    }

    render(
        changes: TerraDrawChanges,
        styling: { [mode: string]: TerraDrawAdapterStyling }
    ) {
        if (this._layers) {
            changes.deletedIds.forEach((deletedId) => {
                const featureToDelete = this._map.data.getFeatureById(deletedId);
                featureToDelete && this._map.data.remove(featureToDelete);
            });

            changes.updated.forEach((updatedFeature) => {
                if (!updatedFeature || !updatedFeature.id) {
                    throw new Error("Feature is not valid");
                }

                const featureToUpdate = this._map.data.getFeatureById(
                    updatedFeature.id
                );

                if (!featureToUpdate) {
                    throw new Error("Feature could not be found by Google Maps API");
                }

                // Remove all keys
                featureToUpdate.forEachProperty((property, name) => {
                    featureToUpdate.setProperty(name, undefined);
                });

                // Update all keys
                Object.keys(updatedFeature.properties).forEach((property) => {
                    featureToUpdate.setProperty(
                        property,
                        updatedFeature.properties[property]
                    );
                });

                switch (updatedFeature.geometry.type) {
                case "Point":
                    {
                        const coordinates = updatedFeature.geometry.coordinates;

                        featureToUpdate.setGeometry(
                            new google.maps.Data.Point(
                                new google.maps.LatLng(coordinates[1], coordinates[0])
                            )
                        );
                    }
                    break;
                case "LineString":
                    {
                        const coordinates = updatedFeature.geometry.coordinates;

                        const path = [];
                        for (let i = 0; i < coordinates.length; i++) {
                            const coordinate = coordinates[i];
                            const latLng = new google.maps.LatLng(
                                coordinate[1],
                                coordinate[0]
                            );
                            path.push(latLng);
                        }

                        featureToUpdate.setGeometry(
                            new google.maps.Data.LineString(path)
                        );
                    }
                    break;
                case "Polygon":
                    {
                        const coordinates = updatedFeature.geometry.coordinates;

                        const paths = [];
                        for (let i = 0; i < coordinates.length; i++) {
                            const path = [];
                            for (let j = 0; j < coordinates[i].length; j++) {
                                const latLng = new google.maps.LatLng(
                                    coordinates[i][j][1],
                                    coordinates[i][j][0]
                                );
                                path.push(latLng);
                            }
                            paths.push(path);
                        }

                        featureToUpdate.setGeometry(new google.maps.Data.Polygon(paths));
                    }

                    break;
                }
            });

            // Create new features
            changes.created.forEach((createdFeature) => {
                this._map.data.addGeoJson(createdFeature);
            });
        } else {
            // Clicking on data geometries triggers
            // swallows the map onclick event,
            // so we need to forward it to the click callback handler
            this._map.data.addListener(
                "click",
                (
                    event: google.maps.MapMouseEvent & {
                        domEvent: MouseEvent;
                    }
                ) => {
                    this._onClickCallback && this._onClickCallback(event);
                }
            );

            this._map.data.addListener(
                "mousemove",
                (
                    event: google.maps.MapMouseEvent & {
                        domEvent: MouseEvent;
                    }
                ) => {
                    this._onMouseMoveCallback && this._onMouseMoveCallback(event);
                }
            );
        }

        const featureCollection = {
            type: "FeatureCollection",
            features: [...changes.created],
        } as GeoJsonObject;

        this._map.data.addGeoJson(featureCollection);

        this._map.data.setStyle((feature) => {
            const mode = feature.getProperty("mode");
            const gmGeometry = feature.getGeometry();
            if (!gmGeometry) {
                throw new Error("Google Maps geometry not found");
            }
            const type = gmGeometry.getType();
            const selected = feature.getProperty(SELECT_PROPERTIES.SELECTED);

            const selectionPoint = Boolean(
                feature.getProperty(SELECT_PROPERTIES.SELECTION_POINT)
            );
            const midPoint = Boolean(
                feature.getProperty(SELECT_PROPERTIES.MID_POINT)
            );

            switch (type) {
            case "Point":
                const isSelection = selected || selectionPoint;
                const isMidpoint = midPoint;
                return {
                    clickable: false,
                    icon: {
                        path: this.circlePath(
                            0,
                            0,
                            isSelection
                                ? styling[mode].selectionPointWidth
                                : isMidpoint
                                    ? styling[mode].midPointWidth
                                    : styling[mode].pointWidth
                        ),
                        fillColor: isSelection
                            ? styling[mode].selectedColor
                            : isMidpoint
                                ? styling[mode].midPointColor
                                : styling[mode].pointColor,
                        fillOpacity: 1,
                        strokeColor: isSelection
                            ? styling[mode].selectedPointOutlineColor
                            : isMidpoint
                                ? styling[mode].midPointOutlineColor
                                : undefined,
                        strokeWeight: isSelection || isMidpoint ? 2 : 0,
                        rotation: 0,
                        scale: 1,
                    },
                };

            case "LineString":
                return {
                    strokeColor: selected
                        ? styling[mode].selectedColor
                        : styling[mode].lineStringColor,
                    strokeWeight: styling[mode].lineStringWidth,
                };
            case "Polygon":
                return {
                    strokeColor: selected
                        ? styling[mode].selectedColor
                        : styling[mode].polygonOutlineColor,
                    strokeWeight: styling[mode].polygonOutlineWidth,
                    fillOpacity: styling[mode].polygonFillOpacity,
                    fillColor: selected
                        ? styling[mode].selectedColor
                        : styling[mode].polygonFillColor,
                };
            }

            throw Error("Unknown feature type");
        });

        this._layers = true;
    }
}
