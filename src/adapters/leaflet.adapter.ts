import {
  TerraDrawCallbacks,
  TerraDrawAdapter,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
} from "../common";
import { Feature, GeoJsonObject } from "geojson";
import L from "leaflet";
import { limitPrecision } from "../geometry/limit-decimal-precision";

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

    this.project = (lng: number, lat: number) => {
      const { x, y } = this._map.latLngToContainerPoint({ lng, lat });
      return { x, y };
    };
  }

  private _lib: typeof L;
  private _coordinatePrecision: number;
  private _map: L.Map;
  private _onMouseMoveListener: (ev: any) => void;
  private _onClickListener: (ev: any) => void;
  private _onKeyPressListener: (ev: any) => void;
  private _layer: L.Layer;

  public project: TerraDrawModeRegisterConfig["project"];

  register(callbacks: TerraDrawCallbacks) {
    this._onClickListener = (event: L.LeafletMouseEvent) => {
      event.originalEvent.preventDefault();

      console.log({
        containerX:
          event.originalEvent.clientX - this._map.getContainer().offsetLeft,
        containerY:
          event.originalEvent.clientY - this._map.getContainer().offsetTop,
      });

      callbacks.onClick({
        lng: limitPrecision(event.latlng.lng, this._coordinatePrecision),
        lat: limitPrecision(event.latlng.lat, this._coordinatePrecision),
        containerX:
          event.originalEvent.clientX - this._map.getContainer().offsetLeft,
        containerY:
          event.originalEvent.clientY - this._map.getContainer().offsetTop,
      });
    };

    this._map.on("click", this._onClickListener);

    this._onMouseMoveListener = (event: L.LeafletMouseEvent) => {
      event.originalEvent.preventDefault();

      callbacks.onMouseMove({
        lng: limitPrecision(event.latlng.lng, this._coordinatePrecision),
        lat: limitPrecision(event.latlng.lat, this._coordinatePrecision),
        containerX:
          event.originalEvent.clientX - this._map.getContainer().offsetLeft,
        containerY:
          event.originalEvent.clientY - this._map.getContainer().offsetTop,
      });
    };

    this._map.on("mousemove", this._onMouseMoveListener);

    this._onKeyPressListener = (event: L.LeafletKeyboardEvent) => {
      event.originalEvent.preventDefault();

      callbacks.onKeyPress({ key: event.originalEvent.key });
    };

    this._map.on("keyup", this._onKeyPressListener);
  }

  unregister() {
    if (this._onClickListener) {
      this._map.off("click", this._onClickListener);
      this._onClickListener = undefined;
    }
    if (this._onMouseMoveListener) {
      this._map.off("click", this._onClickListener);
      this._onClickListener = undefined;
    }
  }

  render(
    features: Feature[],
    styling: { [mode: string]: TerraDrawAdapterStyling }
  ) {
    if (this._layer) {
      this._map.removeLayer(this._layer);
    }

    const featureCollection = {
      type: "FeatureCollection",
      features,
    } as GeoJsonObject;

    // Style points - convert markers to circle markers
    const pointToLayer = (feature: Feature, latlng: L.LatLngExpression) => {
      const mode = feature.properties.mode;
      const modeStyle = styling[mode];

      return this._lib.circleMarker(latlng, {
        radius: modeStyle.pointWidth,
        fillColor: feature.properties.selected
          ? modeStyle.selectedColor
          : modeStyle.pointColor,
        color: modeStyle.pointOutlineColor,
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
      });
    };

    // Style LineStrings and Polygons
    const style = (feature: Feature) => {
      const mode = feature.properties.mode;
      const modeStyle = styling[mode];

      if (feature.geometry.type === "LineString") {
        return {
          color: feature.properties.selected
            ? modeStyle.selectedColor
            : modeStyle.lineStringColor,

          weight: modeStyle.lineStringWidth,
        };
      } else if (feature.geometry.type === "Polygon") {
        return {
          fillOpacity: modeStyle.polygonFillOpacity,
          color: feature.properties.selected
            ? modeStyle.selectedColor
            : modeStyle.polygonFillColor,
        };
      }
    };

    const layer = this._lib.geoJSON(featureCollection, {
      pointToLayer,
      style,
    });

    layer.addTo(this._map);

    this._layer = layer;
  }
}
