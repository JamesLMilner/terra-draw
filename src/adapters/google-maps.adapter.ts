import {
  TerraDrawCallbacks,
  TerraDrawAdapter,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
  TerraDrawChanges,
  TerraDrawMouseEvent,
} from "../common";
import { Feature, GeoJsonObject } from "geojson";

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
      const northWest = new this._lib.LatLng(
        bounds.getNorthEast().lat(),
        bounds.getSouthWest().lng()
      );
      const projection = this._map.getProjection();
      const projectedNorthWest = projection.fromLatLngToPoint(northWest);
      const projected = projection.fromLatLngToPoint({ lng, lat });

      const scale = Math.pow(2, this._map.getZoom());
      return {
        x: Math.floor((projected.x - projectedNorthWest.x) * scale),
        y: Math.floor((projected.y - projectedNorthWest.y) * scale),
      };
    };

    this.unproject = (point: { x: number; y: number }) => {
      const topRight = this._map
        .getProjection()
        .fromLatLngToPoint(this._map.getBounds().getNorthEast());
      const bottomLeft = this._map
        .getProjection()
        .fromLatLngToPoint(this._map.getBounds().getSouthWest());
      const scale = Math.pow(2, this._map.getZoom());

      const worldPoint = new google.maps.Point(
        point.x / scale + bottomLeft.x,
        point.y / scale + topRight.y
      );
      const { lng, lat } = this._map
        .getProjection()
        .fromPointToLatLng(worldPoint);

      return { lng: lng(), lat: lat() };
    };

    this.setCursor = (cursor) => {
      console.log(cursor);

      if (cursor === this._cursor) {
        return;
      }

      if (cursor === "unset") {
        this._cursorStyleSheet.remove();
        this._cursorStyleSheet = undefined;
      } else {
        console.log("adding stylesheet");
        // TODO: We could cache this
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

  private _cursor: string;
  private _cursorStyleSheet: HTMLStyleElement;
  private _coordinatePrecision: number;
  private _lib: typeof google.maps;
  private _map: google.maps.Map;
  private _onMouseMoveListener: google.maps.MapsEventListener;
  private _onMouseMoveCallback: (
    event: google.maps.MapMouseEvent & {
      domEvent: MouseEvent;
    }
  ) => void;
  private _onClickListener: google.maps.MapsEventListener;
  private _onClickCallback: (
    event: google.maps.MapMouseEvent & {
      domEvent: MouseEvent;
    }
  ) => void;
  private _onKeyUpListener: any;
  private _onDragStartListener: (event: MouseEvent) => void;
  private _onDragListener: (event: MouseEvent) => void;
  private _onDragEndListener: (event: MouseEvent) => void;
  private _layers: boolean;

  public getMapContainer: () => HTMLElement;

  public unproject: (point: {
    x: number;
    y: number;
  }) => { lng: number; lat: number };
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
      callbacks.onClick({
        lng: limitPrecision(event.latLng.lng(), this._coordinatePrecision),
        lat: limitPrecision(event.latLng.lat(), this._coordinatePrecision),
        containerX: event.domEvent.clientX - this.getMapContainer().offsetLeft,
        containerY: event.domEvent.clientY - this.getMapContainer().offsetTop,
      });
    };
    this._onClickListener = this._map.addListener(
      "click",
      this._onClickCallback
    );

    this._onMouseMoveCallback = (
      event: google.maps.MapMouseEvent & {
        domEvent: MouseEvent;
      }
    ) => {
      callbacks.onMouseMove({
        lng: limitPrecision(event.latLng.lng(), this._coordinatePrecision),
        lat: limitPrecision(event.latLng.lat(), this._coordinatePrecision),
        containerX: event.domEvent.clientX,
        containerY: event.domEvent.clientY,
      });
    };
    this._onMouseMoveListener = this._map.addListener(
      "mousemove",
      this._onMouseMoveCallback
    );

    this._onKeyUpListener = (event: KeyboardEvent) => {
      callbacks.onKeyPress({ key: event.key });
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

      const { lng, lat } = this.unproject(point);

      const drawEvent: TerraDrawMouseEvent = {
        lng: limitPrecision(lng, this._coordinatePrecision),
        lat: limitPrecision(lat, this._coordinatePrecision),
        containerX: event.clientX - container.offsetLeft,
        containerY: event.clientY - container.offsetTop,
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

        const { lng, lat } = this.unproject(point);

        callbacks.onDragEnd(
          {
            lng: limitPrecision(lng, this._coordinatePrecision),
            lat: limitPrecision(lat, this._coordinatePrecision),
            containerX: event.clientX - container.offsetLeft,
            containerY: event.clientY - container.offsetTop,
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
        this._map.data.remove(featureToDelete);
      });

      changes.updated.forEach((updatedFeature) => {
        const featureToUpdate = this._map.data.getFeatureById(
          updatedFeature.id
        );

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
          this._onClickCallback(event);
        }
      );

      this._map.data.addListener(
        "mousemove",
        (
          event: google.maps.MapMouseEvent & {
            domEvent: MouseEvent;
          }
        ) => {
          this._onMouseMoveCallback(event);
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
      const type = feature.getGeometry().getType();
      const selected = feature.getProperty("selected");

      const selectionPoint = feature.getProperty("selectionPoint");

      console.log(
        selected || selectionPoint,
        styling[mode].selectedPointOutlineColor
      );

      switch (type) {
        case "Point":
          const isSelection = selected || selectionPoint;
          return {
            icon: {
              path: this.circlePath(
                0,
                0,
                isSelection
                  ? styling[mode].selectionPointWidth
                  : styling[mode].pointWidth
              ),
              fillColor: isSelection
                ? styling[mode].selectedColor
                : styling[mode].pointColor,
              fillOpacity: 1,
              strokeColor: isSelection
                ? styling[mode].selectedPointOutlineColor
                : undefined,
              strokeWeight: isSelection ? 2 : 0,
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

      return;
    });

    this._layers = true;
  }
}
