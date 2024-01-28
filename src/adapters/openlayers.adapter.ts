import {
	TerraDrawChanges,
	SetCursor,
	TerraDrawStylingFunction,
} from "../common";
import { FeatureId, GeoJSONStoreFeatures } from "../store/store";
import CircleGeom from "ol/geom/Circle";
import Feature, { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
import Geometry from "ol/geom/Geometry";
import { BaseAdapterConfig, TerraDrawBaseAdapter } from "./common/base.adapter";

type InjectableOL = {
	Circle: typeof CircleGeom;
	Feature: typeof Feature;
	GeoJSON: typeof GeoJSON;
	Style: typeof Style;
	CircleStyle: typeof Circle;
	VectorLayer: typeof VectorLayer;
	VectorSource: typeof VectorSource;
	Stroke: typeof Stroke;
	toLonLat: typeof toLonLat;
};

export class TerraDrawOpenLayersAdapter extends TerraDrawBaseAdapter {
	constructor(
		config: {
			map: Map;
			lib: InjectableOL;
		} & BaseAdapterConfig,
	) {
		super(config);

		this._map = config.map;
		this._lib = config.lib;

		this._geoJSONReader = new this._lib.GeoJSON();

		this._container = this._map.getViewport();

		// TODO: Is this the best way to recieve keyboard events
		this._container.setAttribute("tabindex", "0");

		const vectorSource = new this._lib.VectorSource({
			features: [],
		});

		this._vectorSource = vectorSource;

		const vectorLayer = new this._lib.VectorLayer({
			source: vectorSource,
			style: (feature) => this.getStyles(feature, this.stylingFunction()),
		});

		this._map.addLayer(vectorLayer);
	}

	private stylingFunction = () => ({});

	private _lib: InjectableOL;
	private _map: Map;
	private _container: HTMLElement;
	private _projection = "EPSG:3857" as const;
	private _vectorSource: undefined | VectorSource<Geometry>;
	private _geoJSONReader: undefined | GeoJSON;

	/**
	 * Converts a hexideciaml color to RGB
	 * @param hex a string of the hexidecimal string
	 * @returns an object to red green and blue (RGB) color
	 */
	private hexToRGB(hex: string): { r: number; g: number; b: number } {
		return {
			r: parseInt(hex.slice(1, 3), 16),
			g: parseInt(hex.slice(3, 5), 16),
			b: parseInt(hex.slice(5, 7), 16),
		};
	}

	/**
	 * Converts a hexideciaml color to RGB
	 * @param feature
	 * @param styling
	 * @returns an object to red green and blue (RGB) color
	 */
	private getStyles(feature: FeatureLike, styling: TerraDrawStylingFunction) {
		const geometry = feature.getGeometry();
		if (!geometry) {
			return;
		}
		const key = geometry.getType() as "Point" | "LineString" | "Polygon";

		return {
			Point: (feature: FeatureLike) => {
				const properties = feature.getProperties();
				const style = styling[properties.mode]({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties,
				});
				return new this._lib.Style({
					image: new Circle({
						radius: style.pointWidth,
						fill: new Fill({
							color: style.pointColor,
						}),
						stroke: new Stroke({
							color: style.pointOutlineColor,
							width: style.pointOutlineWidth,
						}),
					}),
				});
			},
			LineString: (feature: FeatureLike) => {
				const properties = feature.getProperties();
				const style = styling[properties.mode]({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties,
				});
				return new this._lib.Style({
					stroke: new this._lib.Stroke({
						color: style.lineStringColor,
						width: style.lineStringWidth,
					}),
				});
			},
			Polygon: (feature: FeatureLike) => {
				const properties = feature.getProperties();
				const style = styling[properties.mode]({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties,
				});
				const { r, g, b } = this.hexToRGB(style.polygonFillColor);

				return new Style({
					stroke: new Stroke({
						color: style.polygonOutlineColor,
						width: style.polygonOutlineWidth,
					}),
					fill: new Fill({
						color: `rgba(${r},${g},${b},${style.polygonFillOpacity})`,
					}),
				});
			},
		}[key](feature);
	}

	/**
	 * Clears the layers created by the adapter
	 * @returns void
	 * */
	private clearLayers() {
		if (this._vectorSource) {
			this._vectorSource.clear();
		}
	}

	private addFeature(feature: GeoJSONStoreFeatures) {
		if (this._vectorSource && this._geoJSONReader) {
			const olFeature = this._geoJSONReader.readFeature(feature, {
				featureProjection: this._projection,
			});
			this._vectorSource.addFeature(olFeature);
		} else {
			throw new Error("Vector Source not initalised");
		}
	}

	private removeFeature(id: FeatureId) {
		if (this._vectorSource) {
			const deleted = this._vectorSource.getFeatureById(id);
			if (!deleted) {
				return;
			}
			this._vectorSource.removeFeature(deleted);
		} else {
			throw new Error("Vector Source not initalised");
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
		try {
			return this.unproject(x, y);
		} catch (_) {
			return null;
		}
	}

	/**
	 * Retrieves the HTML element of the OpenLayers element that handles interaction events
	 * @returns The HTMLElement representing the map container.
	 */
	public getMapEventElement() {
		const canvases = this._container.querySelectorAll("canvas");

		if (canvases.length > 1) {
			throw Error(
				"Terra Draw currently only supports 1 canvas with OpenLayers",
			);
		}

		return canvases[0];
	}

	/**
	 * Enables or disables the draggable functionality of the map.
	 * @param enabled Set to true to enable map dragging, or false to disable it.
	 */
	public setDraggability(enabled: boolean) {
		this._map.getInteractions().forEach((interaction) => {
			if (interaction.constructor.name === "DragPan") {
				interaction.setActive(enabled);
			}
		});
	}

	/**
	 * Converts longitude and latitude coordinates to pixel coordinates in the map container.
	 * @param lng The longitude coordinate to project.
	 * @param lat The latitude coordinate to project.
	 * @returns An object with 'x' and 'y' properties representing the pixel coordinates within the map container.
	 */
	public project(lng: number, lat: number) {
		const [x, y] = this._map.getPixelFromCoordinate(fromLonLat([lng, lat]));
		return { x, y };
	}

	/**
	 * Converts pixel coordinates in the map container to longitude and latitude coordinates.
	 * @param x The x-coordinate in the map container to unproject.
	 * @param y The y-coordinate in the map container to unproject.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude coordinates.
	 */
	public unproject(x: number, y: number) {
		const [lng, lat] = toLonLat(this._map.getCoordinateFromPixel([x, y]));
		return { lng, lat };
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
		this._map.getInteractions().forEach(function (interaction) {
			if (interaction.constructor.name === "DoubleClickZoom") {
				interaction.setActive(enabled);
			}
		});
	}

	/**
	 * Renders GeoJSON features on the map using the provided styling configuration.
	 * @param changes An object containing arrays of created, updated, and unchanged features to render.
	 * @param styling An object mapping draw modes to feature styling functions
	 */
	public render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction) {
		this.stylingFunction = () => styling;

		const source = this._vectorSource;

		if (!source) {
			throw new Error("Vector Layer source has disappeared");
		}

		changes.deletedIds.forEach((id) => {
			this.removeFeature(id);
		});

		changes.updated.forEach((feature) => {
			this.removeFeature(feature.id as string);
			this.addFeature(feature);
		});

		changes.created.forEach((feature) => {
			this.addFeature(feature);
		});
	}

	/**
	 * Clears the map and store of all rendered data layers
	 * @returns void
	 * */
	clear() {
		if (this._currentModeCallbacks) {
			// Clean up state first
			this._currentModeCallbacks.onClear();

			// Then clean up rendering
			this.clearLayers();
		}
	}
}
