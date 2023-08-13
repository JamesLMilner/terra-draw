import {
	TerraDrawChanges,
	SetCursor,
	TerraDrawStylingFunction,
} from "../common";
import { Feature, LineString, Point, Polygon } from "geojson";
import {
	Point as MTKPoint,
	Coordinate,
	VectorLayer,
	GeoJSON,
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
} from "maptalks";
import { GeoJSONStoreFeatures, GeoJSONStoreGeometries } from "../store/store";
import { TerraDrawBaseAdapter } from "./common/base.adapter";

type Map = any;

export class TerraDrawMaptalksAdapter extends TerraDrawBaseAdapter {
	constructor(config: {
		map: Map;
		/**
		 * Latitude and longitude data accuracy
		 */
		coordinatePrecision?: number;

		/**
		 * Whether to enable webgl rendering
		 */
		useGLLayer?: boolean;

		/**
		 * layer zIndex
		 */
		zIndex?: number;
	}) {
		super(config);

		this._map = config.map;
		this._baseZIndex = config.zIndex ?? 99;
		this._container = this._map.getContainer();
		this._useGLLayer = Boolean(config.useGLLayer);

		if (config.useGLLayer) {
			this._layerImpl = {
				Point: VectorLayer,
				LineString: VectorLayer,
				Polygon: VectorLayer,
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				PointGL: require("@maptalks/gl-layers").PointLayer,
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				LineStringGL: require("@maptalks/gl-layers").LineStringLayer,
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				PolygonGL: require("@maptalks/gl-layers").PolygonLayer,
			};
		} else {
			this._layerImpl = {
				Point: VectorLayer,
				LineString: VectorLayer,
				Polygon: VectorLayer,
			};
		}
	}

	private _map: Map;
	private _container: HTMLElement;
	private _rendered = false;
	private readonly _useGLLayer: boolean;
	private _pointLayer: typeof VectorLayer;
	private _lineLayer: typeof VectorLayer;
	private _polygonLayer: typeof VectorLayer;
	private _baseZIndex: number;
	private _layerImpl: any;

	/**
	 * Clears the map of rendered layers
	 * @returns void
	 * */
	private clearLayers() {
		if (this._rendered) {
			const geometryTypes = ["point", "linestring", "polygon"] as const;
			geometryTypes.forEach((geometryKey) => {
				const id = `td-${geometryKey.toLowerCase()}`;
				this._map.removeLayer(id);
			});

			this._rendered = false;
		}
	}

	private _addLayer<T extends GeoJSONStoreGeometries>(
		featureType: "Point" | "LineString" | "Polygon",
		features: Feature<T>[]
	) {
		const id = `td-${featureType.toLowerCase()}`;
		const geometries = GeoJSON.toGeometry(features);

		const layerType = `${featureType}${this._useGLLayer ? "GL" : ""}`;

		if (featureType === "Point") {
			this._pointLayer = new this._layerImpl[layerType](id, geometries, {
				enableSimplify: false,
				geometryEvents: false,
				style: {
					symbol: {
						markerType: "ellipse",
						markerFill: {
							type: "identity",
							property: "pointColor",
							default: "#000",
						},
						markerFillOpacity: 1,
						markerLineColor: {
							type: "identity",
							property: "pointOutlineColor",
							default: "#000",
						},
						markerLineWidth: {
							type: "identity",
							property: "pointOutlineWidth",
							default: 1,
						},
						markerLineOpacity: 1,
						markerLineDasharray: [],
						markerWidth: {
							type: "identity",
							property: "pointWidth",
							default: 10,
						},
						markerHeight: {
							type: "identity",
							property: "pointWidth",
							default: 10,
						},
						markerDx: 0,
						markerDy: 0,
						markerOpacity: 1,
						markerVerticalAlignment: "middle",
					},
				},
				zIndex: this._baseZIndex + 2,
			});
			this._map.addLayer(this._pointLayer);
		}
		if (featureType === "LineString") {
			this._lineLayer = new this._layerImpl[layerType](id, geometries, {
				enableSimplify: false,
				geometryEvents: false,
				style: {
					symbol: {
						lineColor: {
							type: "identity",
							property: "lineStringColor",
							default: "#1bbc9b",
						},
						lineWidth: {
							type: "identity",
							property: "lineStringWidth",
							default: 1,
						},
						lineJoin: "round", //miter, round, bevel
						lineCap: "round", //butt, round, square
						lineDasharray: null, //dasharray, e.g. [10, 5, 5]
						lineOpacity: 1,
					},
				},
				zIndex: this._baseZIndex + 1,
			});
			this._map.addLayer(this._lineLayer);
		}
		if (featureType === "Polygon") {
			this._polygonLayer = new this._layerImpl[layerType](id, geometries, {
				enableSimplify: false,
				geometryEvents: false,
				style: {
					symbol: {
						polygonFill: {
							type: "identity",
							property: "polygonFillColor",
							default: "rgb(135,196,240)",
						},
						polygonOpacity: {
							type: "identity",
							property: "polygonFillOpacity",
							default: 1,
						},
						lineColor: {
							type: "identity",
							property: "polygonOutlineColor",
							default: "#1bbc9b",
						},
						lineWidth: {
							type: "identity",
							property: "polygonOutlineWidth",
							default: 1,
						},
						lineJoin: "round", //miter, round, bevel
						lineCap: "round", //butt, round, square
						lineDasharray: null, //dasharray, e.g. [10, 5, 5]
						"lineOpacity ": 1,
					},
				},
				zIndex: this._baseZIndex,
			});
			this._map.addLayer(this._polygonLayer);
		}
	}

	private getEmptyGeometries(): {
		points: GeoJSONStoreFeatures[];
		linestrings: GeoJSONStoreFeatures[];
		polygons: GeoJSONStoreFeatures[];
	} {
		return {
			points: [],
			linestrings: [],
			polygons: [],
		};
	}

	/**
	 * Returns the longitude and latitude coordinates from a given PointerEvent on the map.
	 * @param event The PointerEvent or MouseEvent  containing the screen coordinates of the pointer.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude, or null if the conversion is not possible.
	 */
	public getLngLatFromEvent(event: PointerEvent | MouseEvent) {
		const { left, top } = this.getMapContainer().getBoundingClientRect();
		const x = event.clientX - left;
		const y = event.clientY - top;

		return this.unproject(x, y);
	}

	/**
	 * Retrieves the HTML container element of the Leaflet map.
	 * @returns The HTMLElement representing the map container.
	 */
	public getMapContainer() {
		return this._container;
	}

	/**
	 * Enables or disables the draggable functionality of the map.
	 * 开启或者关闭地图的拖拽事件
	 * @param enabled Set to true to enable map dragging, or false to disable it.
	 */
	public setDraggability(enabled: boolean) {
		this._map.config("draggable", enabled);
	}

	/**
	 * Converts longitude and latitude coordinates to pixel coordinates in the map container.
	 * @param lng The longitude coordinate to project.
	 * @param lat The latitude coordinate to project.
	 * @returns An object with 'x' and 'y' properties representing the pixel coordinates within the map container.
	 */
	public project(lng: number, lat: number) {
		const { x, y } = this._map.coordinateToContainerPoint(
			new Coordinate(lng, lat)
		);
		return { x, y };
	}

	/**
	 * Converts pixel coordinates in the map container to longitude and latitude coordinates.
	 * @param x The x-coordinate in the map container to unproject.
	 * @param y The y-coordinate in the map container to unproject.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude coordinates.
	 */
	public unproject(x: number, y: number) {
		const coordinates = this._map.containerPointToCoordinate(
			new MTKPoint(x, y)
		);
		return { lng: coordinates.x, lat: coordinates.y };
	}

	/**
	 * Sets the cursor style for the map container.
	 * @param cursor The CSS cursor style to apply, or 'unset' to remove any previously applied cursor style.
	 */
	public setCursor(cursor: Parameters<SetCursor>[0]) {
		if (cursor === "unset") {
			this._map.resetCursor();
		} else {
			this._map.setCursor(cursor);
		}
	}

	/**
	 * Enables or disables the double-click to zoom functionality on the map.
	 * @param enabled Set to true to enable double-click to zoom, or false to disable it.
	 */
	public setDoubleClickToZoom(enabled: boolean) {
		this._map.config({
			doubleClickZoom: enabled,
		});
	}

	public addGeometry(feature: GeoJSONStoreFeatures) {
		switch (feature.geometry.type) {
			case "Point":
				this._pointLayer.addGeometry(GeoJSON.toGeometry(feature));
				break;
			case "LineString":
				this._lineLayer.addGeometry(GeoJSON.toGeometry(feature));
				break;
			case "Polygon":
				this._polygonLayer.addGeometry(GeoJSON.toGeometry(feature));
				break;
		}
	}

	/**
	 * remove geometry from map
	 * @param id
	 */
	public removeGeometry(id: string) {
		this._pointLayer.removeGeometry(id);
		this._lineLayer.removeGeometry(id);
		this._polygonLayer.removeGeometry(id);
	}

	/**
	 * Renders GeoJSON features on the map using the provided styling configuration.
	 * @param changes An object containing arrays of created, updated, and unchanged features to render.
	 * @param styling An object mapping draw modes to feature styling functions
	 */
	public render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction) {
		const features = [
			...changes.created,
			...changes.updated,
			...changes.unchanged,
		];

		const geometryFeatures = this.getEmptyGeometries();

		for (let i = 0; i < features.length; i++) {
			const feature = features[i];

			Object.keys(styling).forEach((mode) => {
				const { properties } = feature;

				if (properties.mode !== mode) {
					return;
				}

				const styles = styling[mode](feature);

				if (feature.geometry.type === "Point") {
					properties.pointColor = styles.pointColor;
					properties.pointOutlineColor = styles.pointOutlineColor;
					properties.pointOutlineWidth = styles.pointOutlineWidth;
					properties.pointWidth = styles.pointWidth;
					geometryFeatures.points.push(feature);
				} else if (feature.geometry.type === "LineString") {
					properties.lineStringColor = styles.lineStringColor;
					properties.lineStringWidth = styles.lineStringWidth;
					geometryFeatures.linestrings.push(feature);
				} else if (feature.geometry.type === "Polygon") {
					properties.polygonFillColor = styles.polygonFillColor;
					properties.polygonFillOpacity = styles.polygonFillOpacity;
					properties.polygonOutlineColor = styles.polygonOutlineColor;
					properties.polygonOutlineWidth = styles.polygonOutlineWidth;
					geometryFeatures.polygons.push(feature);
				}
			});
		}

		const { points, linestrings, polygons } = geometryFeatures;

		if (!this._rendered) {
			this._rendered = true;

			this._addLayer<Point>("Point", points as Feature<Point>[]);
			this._addLayer<LineString>(
				"LineString",
				linestrings as Feature<LineString>[]
			);
			this._addLayer<Polygon>("Polygon", polygons as Feature<Polygon>[]);
		} else {
			changes.deletedIds.forEach((id) => {
				this.removeGeometry(id);
			});

			changes.updated.forEach((feature) => {
				this.removeGeometry(feature.id as string);
				this.addGeometry(feature);
			});

			changes.created.forEach((feature) => {
				this.addGeometry(feature);
			});
		}
	}

	/**
	 * Clears the map and store of all rendered data layers.
	 * @returns void
	 * */
	public clear() {
		if (this._currentModeCallbacks) {
			// Clear up state first
			this._currentModeCallbacks.onClear();

			// Then clean up rendering
			this.clearLayers();
		}
	}
}
