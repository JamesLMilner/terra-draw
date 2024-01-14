import {
	SetCursor,
	TerraDrawCallbacks,
	TerraDrawChanges,
	TerraDrawStylingFunction,
} from "../common";
import { BaseAdapterConfig, TerraDrawBaseAdapter } from "./common/base.adapter";
import MapView from "@arcgis/core/views/MapView";
import Point from "@arcgis/core/geometry/Point";
import Polyline from "@arcgis/core/geometry/Polyline";
import Polygon from "@arcgis/core/geometry/Polygon";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import { GeoJSONStoreFeatures } from "../store/store";
import Symbol from "@arcgis/core/symbols/Symbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import Color from "@arcgis/core/Color";
import Geometry from "@arcgis/core/geometry/Geometry";

type InjectableArcGISMapsSDK = {
	GraphicsLayer: typeof GraphicsLayer;
	Point: typeof Point;
	Polyline: typeof Polyline;
	Polygon: typeof Polygon;
	SimpleLineSymbol: typeof SimpleLineSymbol;
	SimpleMarkerSymbol: typeof SimpleMarkerSymbol;
	SimpleFillSymbol: typeof SimpleFillSymbol;
	Graphic: typeof Graphic;
	Color: typeof Color;
};

export class TerraDrawArcGISMapsSDKAdapter extends TerraDrawBaseAdapter {
	private readonly _lib: InjectableArcGISMapsSDK;
	private readonly _mapView: MapView;
	private readonly _container: HTMLElement;
	private readonly _featureIdAttributeName = "__tdId";
	private readonly _featureLayerName = "__terraDrawFeatures";
	private readonly _featureLayer: GraphicsLayer;

	private _dragEnabled = true;
	private _zoomEnabled = true;
	private _dragHandler: undefined | IHandle;
	private _doubleClickHandler: undefined | IHandle;

	constructor(
		config: {
			map: MapView;
			lib: InjectableArcGISMapsSDK;
		} & BaseAdapterConfig,
	) {
		super(config);

		this._mapView = config.map;
		this._lib = config.lib;
		this._container = this._mapView.container;
		this._featureLayer = new this._lib.GraphicsLayer({
			id: this._featureLayerName,
		});

		this._mapView.map.add(this._featureLayer);
	}

	public register(callbacks: TerraDrawCallbacks) {
		super.register(callbacks);

		this._dragHandler = this._mapView.on("drag", (event) => {
			if (!this._dragEnabled) {
				event.stopPropagation();
			}
		});
		this._doubleClickHandler = this._mapView.on("double-click", (event) => {
			if (!this._zoomEnabled) {
				event.stopPropagation();
			}
		});
	}

	public unregister() {
		super.unregister();

		if (this._dragHandler) {
			this._dragHandler.remove();
		}

		if (this._doubleClickHandler) {
			this._doubleClickHandler.remove();
		}
	}

	/**
	 * Returns the longitude and latitude coordinates from a given PointerEvent on the map.
	 * @param event The PointerEvent or MouseEvent  containing the screen coordinates of the pointer.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude, or null if the conversion is not possible.
	 */
	public getLngLatFromEvent(event: PointerEvent | MouseEvent) {
		const { containerX: x, containerY: y } =
			this.getMapElementXYPosition(event);
		return this.unproject(x, y);
	}

	/**
	 * Retrieves the HTML element of the ArcGIS element that handles interaction events
	 * @returns The HTMLElement representing the map container.
	 */
	public getMapEventElement() {
		return this._container.querySelector(".esri-view-surface") as HTMLElement;
	}

	/**
	 * Enables or disables the draggable functionality of the map.
	 * @param enabled Set to true to enable map dragging, or false to disable it.
	 */
	public setDraggability(enabled: boolean) {
		this._dragEnabled = enabled;
	}

	/**
	 * Converts longitude and latitude coordinates to pixel coordinates in the map container.
	 * @param lng The longitude coordinate to project.
	 * @param lat The latitude coordinate to project.
	 * @returns An object with 'x' and 'y' properties representing the pixel coordinates within the map container.
	 */
	public project(lng: number, lat: number) {
		const point = new this._lib.Point({ longitude: lng, latitude: lat });
		const { x, y } = this._mapView.toScreen(point);
		return { x, y };
	}

	/**
	 * Converts pixel coordinates in the map container to longitude and latitude coordinates.
	 * @param x The x-coordinate in the map container to unproject.
	 * @param y The y-coordinate in the map container to unproject.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude coordinates.
	 */
	public unproject(x: number, y: number) {
		const { latitude, longitude } = this._mapView.toMap({ x, y });
		return { lng: longitude, lat: latitude };
	}

	/**
	 * Sets the cursor style for the map container.
	 * @param cursor The CSS cursor style to apply, or 'unset' to remove any previously applied cursor style.
	 */
	public setCursor(cursor: Parameters<SetCursor>[0]) {
		if (cursor === "unset") {
			this.getMapEventElement().style.removeProperty("cursor");
		} else {
			this.getMapEventElement().style.cursor = cursor;
		}
	}

	/**
	 * Enables or disables the double-click to zoom functionality on the map.
	 * @param enabled Set to true to enable double-click to zoom, or false to disable it.
	 */
	public setDoubleClickToZoom(enabled: boolean) {
		this._zoomEnabled = enabled;
	}

	/**
	 * Renders GeoJSON features on the map using the provided styling configuration.
	 * @param changes An object containing arrays of created, updated, and unchanged features to render.
	 * @param styling An object mapping draw modes to feature styling functions
	 */
	public render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction) {
		changes.created.forEach((createdFeature) => {
			this.addFeature(createdFeature, styling);
		});

		changes.updated.forEach((updatedFeature) => {
			this.removeFeatureById(updatedFeature.id);
			this.addFeature(updatedFeature, styling);
		});

		changes.deletedIds.forEach((deletedId) => {
			this.removeFeatureById(deletedId);
		});
	}

	/**
	 * Clears the map and store of all rendered data layers
	 * @returns void
	 * */
	public clear() {
		this._featureLayer.graphics.removeAll();
	}

	private removeFeatureById(id: string | number | undefined) {
		const feature = this._featureLayer.graphics.find(
			(g) => g.attributes[this._featureIdAttributeName] === id,
		);
		this._featureLayer.remove(feature);
	}

	private addFeature(
		feature: GeoJSONStoreFeatures,
		styling: TerraDrawStylingFunction,
	) {
		const { coordinates, type } = feature.geometry;
		const style = styling[feature.properties.mode as string](feature);

		let symbol: Symbol | undefined = undefined; // eslint-disable-line @typescript-eslint/ban-types
		let geometry: Geometry | undefined = undefined;

		switch (type) {
			case "Point":
				geometry = new this._lib.Point({
					latitude: coordinates[1],
					longitude: coordinates[0],
				});
				symbol = new this._lib.SimpleMarkerSymbol({
					color: this.getColorFromHex(style.pointColor),
					size: style.pointWidth * 2 + "px",
					outline: {
						color: this.getColorFromHex(style.pointOutlineColor),
						width: style.pointOutlineWidth + "px",
					},
				});
				break;
			case "LineString":
				geometry = new this._lib.Polyline({ paths: [coordinates] });
				symbol = new this._lib.SimpleLineSymbol({
					color: this.getColorFromHex(style.lineStringColor),
					width: style.lineStringWidth + "px",
				});
				break;
			case "Polygon":
				geometry = new this._lib.Polygon({ rings: coordinates });
				symbol = new this._lib.SimpleFillSymbol({
					color: this.getColorFromHex(
						style.polygonFillColor,
						style.polygonFillOpacity,
					),
					outline: {
						color: this.getColorFromHex(style.polygonOutlineColor),
						width: style.polygonOutlineWidth + "px",
					},
				});
				break;
		}

		const graphic = new this._lib.Graphic({
			geometry,
			symbol,
			attributes: { [this._featureIdAttributeName]: feature.id },
		});

		// ensure we add points at the topmost position by adding other geometries at index 0
		if (type === "Point") {
			this._featureLayer.graphics.add(graphic);
		} else {
			this._featureLayer.graphics.add(graphic, 0);
		}
	}

	private getColorFromHex(hexColor: string, opacity?: number): Color {
		const color = this._lib.Color.fromHex(hexColor);
		if (opacity) {
			color.a = opacity;
		}
		return color;
	}
}
