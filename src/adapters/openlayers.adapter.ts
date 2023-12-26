import {
	TerraDrawChanges,
	SetCursor,
	TerraDrawStylingFunction,
	TerraDrawCallbacks,
} from "../common";
import { FeatureId, GeoJSONStoreFeatures } from "../store/store";
import Feature, { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import VectorSource from "ol/source/Vector";
import { Geometry } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import { toLonLat, fromLonLat, getUserProjection, Projection } from "ol/proj";
import { BaseAdapterConfig, TerraDrawBaseAdapter } from "./common/base.adapter";
import { Coordinate } from "ol/coordinate";
import { Pixel } from "ol/pixel";

export type InjectableOL = {
	Fill: typeof Fill;
	Feature: typeof Feature;
	GeoJSON: typeof GeoJSON;
	Style: typeof Style;
	Circle: typeof Circle;
	VectorLayer: typeof VectorLayer;
	VectorSource: typeof VectorSource;
	Stroke: typeof Stroke;
	getUserProjection: typeof getUserProjection;
};

export class TerraDrawOpenLayersAdapter extends TerraDrawBaseAdapter {
	constructor(
		config: {
			map: Map;
			lib: InjectableOL;
			zIndex?: number;
		} & BaseAdapterConfig,
	) {
		super(config);

		this._map = config.map;
		this._lib = config.lib;

		this._geoJSONReader = new this._lib.GeoJSON();
		this._projection = () =>
			this._lib.getUserProjection() ?? new Projection({ code: "EPSG:3857" });

		this._container = this._map.getViewport();

		// TODO: Is this the best way to recieve keyboard events
		this._container.setAttribute("tabindex", "0");

		const vectorSource = new this._lib.VectorSource({
			features: [],
		}) as unknown as VectorSource<Feature<Geometry>>;

		this._vectorSource = vectorSource as unknown as VectorSource<
			Feature<Geometry>
		>;

		const vectorLayer = new this._lib.VectorLayer({
			source: vectorSource as unknown as VectorSource<never>,
			style: (feature) => this.getStyles(feature, this.stylingFunction()),
			zIndex: config.zIndex ?? 100000,
		});

		this._map.addLayer(vectorLayer);
	}

	private stylingFunction = () => ({});

	private _lib: InjectableOL;
	private _map: Map;
	private _container: HTMLElement;
	private _projection: () => Projection;
	private _vectorSource: VectorSource<Feature<Geometry>>;
	private _geoJSONReader: GeoJSON;

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
					image: new this._lib.Circle({
						radius: style.pointWidth,
						fill: new this._lib.Fill({
							color: style.pointColor,
						}),
						stroke: new this._lib.Stroke({
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

				const width = this.getMapEventElement().width;

				return new this._lib.Style({
					stroke: new this._lib.Stroke({
						color: style.lineStringColor,
						width: style.lineStringWidth,
						lineDash: style.lineStringDash?.map((i) => (width / 100) * i), // Convert from % to pixel equivalent as OL does not support %
					}),
				});
			},
			Polygon: (feature: FeatureLike) => {
				const properties = feature.getProperties();
				const style = styling[properties.mode]({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties,
				});
				const { r, g, b } = this.hexToRGB(style.polygonFillColor);

				return new this._lib.Style({
					stroke: new this._lib.Stroke({
						color: style.polygonOutlineColor,
						width: style.polygonOutlineWidth,
					}),
					fill: new this._lib.Fill({
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
		const olFeature = this._geoJSONReader.readFeature(feature, {
			dataProjection: "EPSG:4326",
			featureProjection: this._projection(),
		}) as Feature<Geometry>;
		this._vectorSource.addFeature(olFeature);
	}

	private removeFeature(id: FeatureId) {
		const deleted = this._vectorSource.getFeatureById(id);
		if (!deleted) {
			return;
		}
		this._vectorSource.removeFeature(deleted);
	}

	/**
	 * Sorts an array of DOM elements based on their order in the document, from earliest to latest.
	 * @param elements - An array of `HTMLElement` objects to be sorted.
	 * @returns A new array of `HTMLElement` objects sorted by their document order.
	 */
	private sortElementsByDOMOrder(elements: HTMLElement[]) {
		// Sort the elements based on their DOM position
		return elements.sort((a, b) => {
			const position = a.compareDocumentPosition(b);

			// If a comes before b in the DOM
			if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
				return -1;
			}

			// If a comes after b in the DOM
			if (position & Node.DOCUMENT_POSITION_PRECEDING) {
				return 1;
			}

			// If they are the same element
			return 0;
		});
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
		// Each VectorLayer has a canvas element that is used to render the features, it orders
		// these in the order they are added to the map. The last canvas is the one that is on top
		// so we need to add the event listeners to this canvas so that the events are captured.
		const canvases = Array.from(this._container.querySelectorAll("canvas"));
		const sortedCanvases = this.sortElementsByDOMOrder(
			canvases,
		) as HTMLCanvasElement[];
		const topCanvas = sortedCanvases[sortedCanvases.length - 1];

		return topCanvas;
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
		const [x, y] = this._map.getPixelFromCoordinate(
			fromLonLat([lng, lat], this._projection()) as Coordinate,
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
		const [lng, lat] = toLonLat(
			this._map.getCoordinateFromPixel([x, y]) as Pixel,
			this._projection(),
		);
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

		changes.deletedIds.forEach((id) => {
			this.removeFeature(id);
		});

		changes.updated.forEach((feature) => {
			this.removeFeature(feature.id as FeatureId);
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
	public clear() {
		if (this._currentModeCallbacks) {
			// Clean up state first
			this._currentModeCallbacks.onClear();

			// Then clean up rendering
			this.clearLayers();
		}
	}

	private registeredLayerHandlers:
		| undefined
		| { addLayers: () => void; removeLayers: () => void };

	public register(callbacks: TerraDrawCallbacks) {
		super.register(callbacks);

		// We need to handle the complex case in OpenLayers where adding and removing layers
		// can change the canvas ordering preventing the event listeners from working correctly
		if (!this.registeredLayerHandlers) {
			const layerGroup = this._map.getLayerGroup();
			const layers = layerGroup.getLayers();

			const removeListeners = () => {
				this._listeners.forEach((listener) => {
					listener.unregister();
				});
			};

			const addListeners = () => {
				this._listeners = this.getAdapterListeners();

				this._listeners.forEach((listener) => {
					listener.register();
				});
			};

			this.registeredLayerHandlers = {
				addLayers: () => {
					removeListeners();
					this._map.once("rendercomplete", () => {
						if (this._currentModeCallbacks) {
							addListeners();
						}
					});
				},
				removeLayers: () => {
					removeListeners();
					this._map.once("rendercomplete", () => {
						if (this._currentModeCallbacks) {
							addListeners();
						}
					});
				},
			};

			layers.on("add", () => {
				removeListeners();
				this._map.once("rendercomplete", () => {
					if (this._currentModeCallbacks) {
						addListeners();
					}
				});
			});

			layers.on("remove", () => {
				removeListeners();
				this._map.once("rendercomplete", () => {
					if (this._currentModeCallbacks) {
						addListeners();
					}
				});
			});
		}

		this._currentModeCallbacks &&
			this._currentModeCallbacks.onReady &&
			this._currentModeCallbacks.onReady();
	}

	public getCoordinatePrecision(): number {
		return super.getCoordinatePrecision();
	}

	public unregister(): void {
		if (this.registeredLayerHandlers) {
			const layerGroup = this._map.getLayerGroup();
			if (layerGroup) {
				const layers = layerGroup.getLayers();

				if (layers) {
					layers.un("add", this.registeredLayerHandlers.addLayers);
					layers.un("remove", this.registeredLayerHandlers.removeLayers);
				}
			}
		}

		return super.unregister();
	}
}
