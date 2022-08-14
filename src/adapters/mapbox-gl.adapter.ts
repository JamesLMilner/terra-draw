import {
  TerraDrawCallbacks,
  TerraDrawAdapter,
  TerraDrawModeRegisterConfig,
  TerraDrawAdapterStyling,
  TerraDrawChanges,
  TerraDrawMouseEvent,
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

  private _coordinatePrecision: number;
  private _map: mapboxgl.Map;
  private _onMouseMoveListener: (
    event: mapboxgl.MapMouseEvent & mapboxgl.EventData
  ) => void;
  private _onClickListener: (
    event: mapboxgl.MapMouseEvent & mapboxgl.EventData
  ) => void;
  private _onDragStartListener: (event: MouseEvent) => void;
  private _onDragListener: (event: MouseEvent) => void;
  private _onDragEndListener: (event: MouseEvent) => void;
  private _onKeyPressListener: (event: KeyboardEvent) => any;
  private _rendered: boolean = false;

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
        "fill-color": ["get", "selectedColor"],
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
        "line-color": ["get", "selectedColor"],
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
        "line-color": ["get", "selectedColor"],
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
        "circle-stroke-color": ["get", "selectedPointOutlineColor"],
        "circle-stroke-width": 2,
        "circle-radius": ["get", "selectionPointWidth"],
        "circle-color": ["get", "selectedColor"],
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

  private _addGeoJSONLayer<T extends GeoJSONStoreGeometries>(
    mode: string,
    featureType: Feature<T>["geometry"]["type"],
    features: Feature<T>[],
    styling: TerraDrawAdapterStyling
  ) {
    const id = `${mode}-${featureType.toLowerCase()}`;

    this._addGeoJSONSource(id, features);

    this._addLayer(id, mode, featureType, styling);
  }

  private _setGeoJSONLayerData<T extends GeoJSONStoreGeometries>(
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
      callbacks.onClick({
        lng: limitPrecision(event.lngLat.lng, this._coordinatePrecision),
        lat: limitPrecision(event.lngLat.lat, this._coordinatePrecision),
        containerX:
          event.originalEvent.clientX - this.getMapContainer().offsetLeft,
        containerY:
          event.originalEvent.clientY - this.getMapContainer().offsetTop,
      });
    };
    this._map.on("click", this._onClickListener);

    this._onMouseMoveListener = (event) => {
      callbacks.onMouseMove({
        lng: limitPrecision(event.lngLat.lng, this._coordinatePrecision),
        lat: limitPrecision(event.lngLat.lat, this._coordinatePrecision),
        containerX:
          event.originalEvent.clientX - this.getMapContainer().offsetLeft,
        containerY:
          event.originalEvent.clientY - this.getMapContainer().offsetTop,
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
    this._onKeyPressListener = (event: KeyboardEvent) => {
      event.preventDefault();

      callbacks.onKeyPress({ key: event.key });
    };
    container.addEventListener("keyup", this._onKeyPressListener);
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

    const getFeatureOfType = <T extends GeoJSONStoreGeometries>(
      type: T["type"],
      features: GeoJSONStoreFeatures[]
    ) => {
      return features.filter((f) => f.geometry.type === type) as Feature<T>[];
    };

    const createUpdateGeoJSONLayers = (method: "create" | "update") => {
      Object.keys(styling).forEach((mode) => {
        const styles = styling[mode];

        const modeFeatures = features.filter((f) => f.properties.mode === mode);

        const points = getFeatureOfType<Point>("Point", modeFeatures);

        points.forEach((feature) => {
          if (
            feature.properties.selected ||
            feature.properties.selectionPoint
          ) {
            feature.properties.selectedColor = styles.selectedColor;
            feature.properties.selectedPointOutlineColor =
              styles.selectedPointOutlineColor;
            feature.properties.selectionPointWidth = styles.selectionPointWidth;
          } else {
            feature.properties.selectedColor = styles.pointColor;
            feature.properties.selectedPointOutlineColor = styles.pointColor;
            feature.properties.selectionPointWidth = styles.pointWidth;
          }
        });

        const lines = getFeatureOfType<LineString>("LineString", modeFeatures);

        lines.forEach((feature) => {
          if (feature.properties.selected) {
            feature.properties.selectedColor = styles.selectedColor;
          } else {
            feature.properties.selectedColor = styles.lineStringColor;
          }
        });

        const polygons = getFeatureOfType<Polygon>("Polygon", modeFeatures);

        polygons.forEach((feature) => {
          if (feature.properties.selected) {
            feature.properties.selectedColor = styles.selectedColor;
          } else {
            feature.properties.selectedColor = styles.polygonFillColor;
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
