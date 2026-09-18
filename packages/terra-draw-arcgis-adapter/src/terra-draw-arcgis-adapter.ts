/**
 * @module terra-draw-arcgis-adapter
 */
import {
	SetCursor,
	TerraDrawExtend,
	TerraDrawChanges,
	TerraDrawStylingFunction,
	TerraDrawAdapterStyling,
	GeoJSONStoreFeatures,
} from "terra-draw";

import {
	load,
	isLoaded,
	execute,
} from "@arcgis/core/geometry/operators/projectOperator.js";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import type MapView from "@arcgis/core/views/MapView";
import type Point from "@arcgis/core/geometry/Point";
import type Polyline from "@arcgis/core/geometry/Polyline";
import type Polygon from "@arcgis/core/geometry/Polygon";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type Graphic from "@arcgis/core/Graphic";
import type SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import type { SymbolUnion } from "@arcgis/core/symbols/types";
import type PictureMarkerSymbol from "@arcgis/core/symbols/PictureMarkerSymbol.js";
import type SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import type SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import type Color from "@arcgis/core/Color";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type { GeometryWithoutMeshUnion } from "@arcgis/core/geometry/types.js";
import type { DoubleClickEvent } from "@arcgis/core/views/input/types";
import type { ResourceHandle } from "@arcgis/core/core/Handles";

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
	PictureMarkerSymbol: typeof PictureMarkerSymbol;
};

export class TerraDrawArcGISMapsSDKAdapter
	extends TerraDrawExtend.TerraDrawBaseAdapter
{
	private readonly _lib: InjectableArcGISMapsSDK;
	private readonly _mapView: MapView;
	private readonly _container: HTMLElement;
	private readonly _featureIdAttributeName = "__tdId";
	private readonly _featureLayerName = "__terraDrawFeatures";
	private readonly _featureLayer: GraphicsLayer;

	private _dragEnabled = true;
	private _zoomEnabled = true;
	private _dragHandler: undefined | ResourceHandle;
	private _doubleClickHandler: undefined | ResourceHandle;

	constructor(
		config: {
			map: MapView;
			lib: InjectableArcGISMapsSDK;
		} & TerraDrawExtend.BaseAdapterConfig,
	) {
		super(config);

		this._mapView = config.map;
		this._lib = config.lib;
		this._container = this._mapView.container!;
		this._featureLayer = new this._lib.GraphicsLayer({
			id: this._featureLayerName,
		});

		if (!this._mapView.map) {
			throw new Error("MapView does not have a valid map instance");
		}

		this._mapView.map.add(this._featureLayer);
		this._mapView.when(() => this.loadProjector());
	}

	public register(callbacks: TerraDrawExtend.TerraDrawCallbacks) {
		super.register(callbacks);

		this._dragHandler = this._mapView.on("drag", (event: DragEvent) => {
			if (!this._dragEnabled) {
				event.stopPropagation();
			}
		});
		this._doubleClickHandler = this._mapView.on(
			"double-click",
			(event: DoubleClickEvent) => {
				if (!this._zoomEnabled) {
					event.stopPropagation();
				}
			},
		);

		if (this._currentModeCallbacks?.onReady) {
			this._currentModeCallbacks.onReady();
		}
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

	public getCoordinatePrecision(): number {
		// TODO: It seems this shouldn't be necessary as extends BaseAdapter which as this method
		return super.getCoordinatePrecision();
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
		const screenPoint = this._mapView.toScreen(point);
		if (!screenPoint) throw new Error("Screen point could not be determined");
		return { x: screenPoint.x, y: screenPoint.y };
	}

	/**
	 * Converts pixel coordinates in the map container to longitude and latitude coordinates.
	 * @param x The x-coordinate in the map container to unproject.
	 * @param y The y-coordinate in the map container to unproject.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude coordinates.
	 */
	public unproject(x: number, y: number) {
		const mapPoint = this._mapView.toMap({ x, y });
		if (!mapPoint) throw new Error("ArcGIS could not resolve the map point");

		if (
			mapPoint.spatialReference.isWGS84 ||
			mapPoint.spatialReference.isWebMercator
		) {
			const { longitude, latitude } = mapPoint;

			if (longitude == null || latitude == null) {
				throw new Error("WGS84 map point has invalid coordinates");
			}

			return { lng: longitude, lat: latitude };
		}

		const { longitude, latitude } = execute(
			mapPoint,
			SpatialReference.WGS84,
		) as Point;

		if (longitude == null || latitude == null) {
			throw new Error("Projected map point has invalid coordinates");
		}

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
			const updateFeature = this.getFeatureById(updatedFeature.id);
			if (updateFeature) {
				updateFeature.geometry =
					this.convertGeoJSONToArcGisGeometry(updatedFeature);
			}
		});

		changes.deletedIds.forEach((deletedId) => {
			const deleteFeature = this.getFeatureById(deletedId);
			if (deleteFeature) {
				this._featureLayer.graphics.remove(deleteFeature);
			}
		});
	}

	/**
	 * Clears the map and store of all rendered data layers
	 * @returns void
	 * */
	public clear() {
		this._featureLayer.graphics.removeAll();
	}

	private projectionRequired(spatialReference: SpatialReference): boolean {
		return !spatialReference.isWGS84 && !spatialReference.isWebMercator;
	}

	private async loadProjector() {
		if (
			this.projectionRequired(this._mapView.spatialReference) &&
			!isLoaded()
		) {
			await load();
		}
	}

	private getFeatureById(id: string | number | undefined) {
		return this._featureLayer.graphics.find(
			(g) => g.attributes[this._featureIdAttributeName] === id,
		);
	}

	private pxToArcGisPoints(value: number): number {
		return Math.max(0.0001, value) * 0.75;
	}

	private toArcGisDashTemplate(
		dash: [number, number] | undefined,
	): [number, number] | null {
		if (!dash) {
			return null;
		}

		const [onPx, offPx] = dash;
		if (
			!Number.isFinite(onPx) ||
			!Number.isFinite(offPx) ||
			onPx < 0 ||
			offPx < 0
		) {
			return null;
		}

		return [this.pxToArcGisPoints(onPx), this.pxToArcGisPoints(offPx)];
	}

	private toArcGisAlpha(opacity: number | undefined): number {
		const normalized =
			opacity === undefined ? 1 : Math.max(0, Math.min(1, opacity));
		return Math.round(normalized * 255);
	}

	private addFeature(
		feature: GeoJSONStoreFeatures,
		styling: TerraDrawStylingFunction,
	) {
		const { type } = feature.geometry;
		const style = styling[feature.properties.mode as string](feature);
		const geometry = this.convertGeoJSONToArcGisGeometry(feature);
		const symbol = this.convertStyleToArcGisSymbol(style, type);

		const graphic = new this._lib.Graphic({
			geometry,
			symbol,
			attributes: { [this._featureIdAttributeName]: feature.id },
		});

		// ensure we add points at the topmost position by adding other geometries at index 0
		if (type === "Point" && style.zIndex >= 30) {
			this._featureLayer.graphics.add(graphic);
		} else {
			this._featureLayer.graphics.add(graphic, 0);
		}
	}

	private convertGeoJSONToArcGisGeometry(
		feature: GeoJSONStoreFeatures,
	): Geometry {
		const { type, coordinates } = feature.geometry;

		let geometry: GeometryWithoutMeshUnion;
		switch (type) {
			case "Point":
				geometry = new this._lib.Point({
					latitude: coordinates[1],
					longitude: coordinates[0],
				});
				break;
			case "LineString":
				geometry = new this._lib.Polyline({ paths: [coordinates] });
				break;
			case "Polygon":
				// A ring needs 3 distinct vertices to be a valid polygon, so render it as a line until then
				geometry = this.isIncompletePolygonPreview(feature)
					? new this._lib.Polyline({ paths: coordinates })
					: new this._lib.Polygon({ rings: coordinates });
				break;
			default:
				throw new Error(`Unsupported geometry type: ${type}`);
		}

		return geometry;
	}

	private isIncompletePolygonPreview(feature: GeoJSONStoreFeatures): boolean {
		if (feature.geometry.type !== "Polygon") return false;

		const committedCoordinateCount =
			feature.properties["committedCoordinateCount"];

		return (
			typeof committedCoordinateCount === "number" &&
			committedCoordinateCount < 3
		);
	}

	private convertStyleToArcGisSymbol(
		style: TerraDrawAdapterStyling,
		type: GeoJSONStoreFeatures["geometry"]["type"],
	): SymbolUnion {
		switch (type) {
			case "Point":
				if (style.markerUrl && style.markerHeight && style.markerWidth) {
					return new this._lib.PictureMarkerSymbol({
						url: style.markerUrl,
						width: style.markerWidth + "px",
						height: style.markerHeight + "px",
						xoffset: 0,
						yoffset: style.markerHeight / 2,
					});
				}

				return new this._lib.SimpleMarkerSymbol({
					color: this.getColorFromHex(
						style.pointColor,
						style.pointOpacity === undefined ? 1 : style.pointOpacity,
					),
					size: style.pointWidth * 2 + "px",
					outline: {
						color: this.getColorFromHex(
							style.pointOutlineColor,
							style.pointOutlineOpacity === undefined
								? 1
								: style.pointOutlineOpacity,
						),
						width: style.pointOutlineWidth + "px",
					},
				});
			case "LineString": {
				const lineColor = this.getColorFromHex(
					style.lineStringColor,
					style.lineStringOpacity === undefined ? 1 : style.lineStringOpacity,
				);
				const lineStringDash = style.lineStringDash as
					| [number, number]
					| undefined;
				const dashTemplate = this.toArcGisDashTemplate(lineStringDash);

				if (dashTemplate) {
					return {
						type: "cim",
						data: {
							type: "CIMSymbolReference",
							symbol: {
								type: "CIMLineSymbol",
								symbolLayers: [
									{
										type: "CIMSolidStroke",
										enable: true,
										width: this.pxToArcGisPoints(style.lineStringWidth),
										color: [
											lineColor.r,
											lineColor.g,
											lineColor.b,
											this.toArcGisAlpha(style.lineStringOpacity),
										],
										capStyle: "Butt",
										joinStyle: "Round",
										effects: [
											{
												type: "CIMGeometricEffectDashes",
												dashTemplate,
												lineDashEnding: "FullGap",
												offsetAlong: 0,
											},
										],
									},
								],
							},
						},
					} as any;
				}

				return new this._lib.SimpleLineSymbol({
					color: lineColor,
					width: style.lineStringWidth + "px",
				});
			}
			case "Polygon":
				return new this._lib.SimpleFillSymbol({
					color: this.getColorFromHex(
						style.polygonFillColor,
						style.polygonFillOpacity,
					),
					outline: {
						color: this.getColorFromHex(
							style.polygonOutlineColor,
							style.polygonOutlineOpacity,
						),
						width: style.polygonOutlineWidth + "px",
					},
				});
		}
	}

	private getColorFromHex(hexColor: string, opacity?: number): Color {
		const color = this._lib.Color.fromHex(hexColor);
		if (!color) throw new Error(`Invalid color: ${hexColor}`);

		if (opacity !== undefined) {
			color.a = opacity;
		}
		return color;
	}
}
