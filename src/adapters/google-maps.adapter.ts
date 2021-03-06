import {
  TerraDrawCallbacks,
  TerraDrawAdapter,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
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

    this.project = (lng: number, lat: number) => {
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
  }

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
  private _layers: boolean;

  public project: TerraDrawModeRegisterConfig["project"];

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
        containerX: event.domEvent.clientX - this._map.getDiv().offsetLeft,
        containerY: event.domEvent.clientY - this._map.getDiv().offsetTop,
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

    this._map.getDiv().addEventListener("keyup", this._onKeyUpListener);
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
      this._map.getDiv().removeEventListener("keyup", this._onKeyUpListener);
      this._onKeyUpListener = undefined;
    }
  }

  render(
    features: Feature[],
    styling: { [mode: string]: TerraDrawAdapterStyling }
  ) {
    if (this._layers) {
      this._map.data.forEach((layer) => {
        this._map.data.remove(layer);
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
      features,
    } as GeoJsonObject;

    this._map.data.addGeoJson(featureCollection);

    this._map.data.setStyle((feature) => {
      const mode = feature.getProperty("mode");
      const type = feature.getGeometry().getType();
      const selected = feature.getProperty("selected");

      switch (type) {
        case "Point":
          return {
            icon: {
              path: this.circlePath(
                styling[mode].pointWidth,
                styling[mode].pointWidth,
                styling[mode].pointWidth
              ),
              fillColor: selected
                ? styling[mode].selectedColor
                : styling[mode].pointColor,
              fillOpacity: 1,
              strokeWeight: 0,
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
            strokeColor: styling[mode].polygonOutlineColor,
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
