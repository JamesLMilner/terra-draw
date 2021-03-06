import {
  TerraDrawCallbacks,
  TerraDrawAdapter,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
} from "../common";
import { Feature, LineString, Point, Polygon } from "geojson";
import { limitPrecision } from "../geometry/limit-decimal-precision";
import { CircleLayer, FillLayer, LineLayer } from "mapbox-gl";

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
  }

  private _coordinatePrecision: number;
  private _map: mapboxgl.Map;
  private _onMouseMoveListener: (
    event: mapboxgl.MapMouseEvent & mapboxgl.EventData
  ) => void;
  private _onClickListener: (
    event: mapboxgl.MapMouseEvent & mapboxgl.EventData
  ) => void;
  private _onKeyPressListener: (event: KeyboardEvent) => any;
  private _rendered: boolean = false;

  public project: TerraDrawModeRegisterConfig["project"];

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
        "fill-color": ["get", "selectedStyle"],
        "fill-opacity": styling.polygonFillOpacity,
      },
    } as FillLayer);
  }

  private _addFillOutlineLayer(
    id: string,
    mode: string,
    styling: TerraDrawAdapterStyling
  ) {
    return this._map.addLayer({
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
        "line-color": ["get", "selectedStyle"],
      },
    } as LineLayer);
  }

  private _addLineLayer(
    id: string,
    mode: string,
    styling: TerraDrawAdapterStyling
  ) {
    return this._map.addLayer({
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
        "line-color": ["get", "selectedStyle"],
      },
    } as LineLayer);
  }

  private _addPointLayer(
    id: string,
    mode: string,
    styling: TerraDrawAdapterStyling
  ) {
    return this._map.addLayer({
      id,
      source: id,
      type: "circle",
      filter: [
        "all",
        ["match", ["geometry-type"], "Point", true, false],
        ["match", ["get", "mode"], mode, true, false],
      ],
      paint: {
        "circle-radius": styling.pointWidth,
        "circle-color": ["get", "selectedStyle"],
      },
    } as CircleLayer);
  }

  private _addLayer(
    id: string,
    mode: string,
    featureType: "Point" | "LineString" | "Polygon",
    styling: TerraDrawAdapterStyling
  ) {
    if (featureType === "Point") {
      this._addPointLayer(id, mode, styling);
    }
    if (featureType === "LineString") {
      this._addLineLayer(id, mode, styling);
    }
    if (featureType === "Polygon") {
      this._addFillLayer(id, mode, styling);
      this._addFillOutlineLayer(id, mode, styling);
    }
  }

  private _addGeoJSONLayer<T extends Polygon | LineString | Point>(
    mode: string,
    featureType: Feature<T>["geometry"]["type"],
    features: Feature<T>[],
    styling: TerraDrawAdapterStyling
  ) {
    const id = `${mode}-${featureType.toLowerCase()}`;

    this._addGeoJSONSource(id, features);

    this._addLayer(id, mode, featureType, styling);
  }

  private _setGeoJSONLayerData<T extends Polygon | LineString | Point>(
    mode: string,
    featureType: Feature<T>["geometry"]["type"],
    features: Feature<T>[]
  ) {
    const id = `${mode}-${featureType.toLowerCase()}`;
    (this._map.getSource(id) as any).setData({
      type: "FeatureCollection",
      features: features,
    });
  }
  register(callbacks: TerraDrawCallbacks) {
    this._onClickListener = (event) => {
      event.preventDefault();

      callbacks.onClick({
        lng: limitPrecision(event.lngLat.lng, this._coordinatePrecision),
        lat: limitPrecision(event.lngLat.lat, this._coordinatePrecision),
        containerX:
          event.originalEvent.clientX - this._map.getContainer().offsetLeft,
        containerY:
          event.originalEvent.clientY - this._map.getContainer().offsetTop,
      });
    };
    this._map.on("click", this._onClickListener);

    this._onMouseMoveListener = (event) => {
      event.preventDefault();

      callbacks.onMouseMove({
        lng: limitPrecision(event.lngLat.lng, this._coordinatePrecision),
        lat: limitPrecision(event.lngLat.lat, this._coordinatePrecision),
        containerX:
          event.originalEvent.clientX - this._map.getContainer().offsetLeft,
        containerY:
          event.originalEvent.clientY - this._map.getContainer().offsetTop,
      });
    };
    this._map.on("mousemove", this._onMouseMoveListener);

    // map has no keypress event, so we add one to the canvas itself
    this._onKeyPressListener = (event: KeyboardEvent) => {
      event.preventDefault();

      callbacks.onKeyPress({ key: event.key });
    };
    this._map.getCanvas().addEventListener("keyup", this._onKeyPressListener);
  }

  unregister() {
    if (this._onClickListener) {
      this._map.off("click", this._onClickListener);
      this._onClickListener = undefined;
    }
    if (this._onMouseMoveListener) {
      this._map.off("mousemove", this._onMouseMoveListener);
      this._onMouseMoveListener = undefined;
    }

    if (this._onKeyPressListener) {
      this._map
        .getCanvas()
        .removeEventListener("keypress", this._onKeyPressListener);
    }
  }

  render(
    features: (Feature<Point> | Feature<LineString> | Feature<Polygon>)[],
    styling: { [mode: string]: TerraDrawAdapterStyling }
  ) {
    const getFeatureOfType = <T extends Point | LineString | Polygon>(
      type: T["type"],
      features: (Feature<Polygon> | Feature<LineString> | Feature<Point>)[]
    ) => {
      return features.filter((f) => f.geometry.type === type) as Feature<T>[];
    };

    const createUpdateGeoJSONLayers = (method: "create" | "update") => {
      Object.keys(styling).forEach((mode) => {
        const styles = styling[mode];

        const modeFeatures = features.filter((f) => f.properties.mode === mode);

        const points = getFeatureOfType<Point>("Point", modeFeatures);

        points.forEach((feature) => {
          if (feature.properties.selected) {
            feature.properties.selectedStyle = styles.selectedColor;
          } else {
            feature.properties.selectedStyle = styles.pointColor;
          }
        });

        const lines = getFeatureOfType<LineString>("LineString", modeFeatures);

        lines.forEach((feature) => {
          if (feature.properties.selected) {
            feature.properties.selectedStyle = styles.selectedColor;
          } else {
            feature.properties.selectedStyle = styles.lineStringColor;
          }
        });

        const polygons = getFeatureOfType<Polygon>("Polygon", modeFeatures);

        polygons.forEach((feature) => {
          if (feature.properties.selected) {
            feature.properties.selectedStyle = styles.selectedColor;
          } else {
            feature.properties.selectedStyle = styles.polygonFillColor;
          }
        });

        if (method === "create") {
          this._addGeoJSONLayer<Point>(mode, "Point", points, styles);
          this._addGeoJSONLayer<LineString>(mode, "LineString", lines, styles);
          this._addGeoJSONLayer<Polygon>(mode, "Polygon", polygons, styles);
        } else if (method === "update") {
          this._setGeoJSONLayerData<Point>(mode, "Point", points);
          this._setGeoJSONLayerData<LineString>(mode, "LineString", lines);
          this._setGeoJSONLayerData<Polygon>(mode, "Polygon", polygons);
        }
      });
    };

    if (!this._rendered) {
      createUpdateGeoJSONLayers("create");
      this._rendered = true;
    } else {
      createUpdateGeoJSONLayers("update");
    }
  }
}
