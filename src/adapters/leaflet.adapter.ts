import {
	TerraDrawChanges,
	SetCursor,
	TerraDrawStylingFunction,
} from "../common";
import L from "leaflet";
import { GeoJSONStoreFeatures } from "../store/store";
import { TerraDrawAdapterBase } from "./common/base-adapter";

export class TerraDrawLeafletAdapter extends TerraDrawAdapterBase {
	constructor(config: {
		lib: typeof L;
		map: L.Map;
		coordinatePrecision?: number;
		minPixelDragDistance?: number;
	}) {
		super(config);

		this._lib = config.lib;
		this._map = config.map;
	}

	private _lib: typeof L;
	private _map: L.Map;
	private _layer: L.Layer | undefined;
	private _panes: Record<string, HTMLStyleElement | undefined> = {};

	/**
	 * Creates a pane and its associated style sheet
	 * @param pane - The pane name
	 * @param zIndex - The zIndex value for the pane
	 * @returns The created style element
	 */
	private createPaneStyleSheet(pane: string, zIndex: number) {
		const style = document.createElement("style");
		style.type = "text/css";
		style.innerHTML = `.leaflet-${pane} {z-index: ${zIndex};}`;
		document.getElementsByTagName("head")[0].appendChild(style);
		this._map.createPane(pane);
		return style;
	}

	/**
	 * Returns the longitude and latitude coordinates from a given PointerEvent on the map.
	 * @param event The PointerEvent or MouseEvent  containing the screen coordinates of the pointer.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude, or null if the conversion is not possible.
	 */
	public getLngLatFromEvent(event: PointerEvent | MouseEvent) {
		const container = this.getMapContainer();

		const point = {
			x: event.clientX - container.offsetLeft,
			y: event.clientY - container.offsetTop,
		} as L.Point;

		// If is not valid point we don't want to convert
		if (isNaN(point.x) || isNaN(point.y)) {
			return null;
		}

		const latLng = this._map.containerPointToLatLng(point);
		if (isNaN(latLng.lng) || isNaN(latLng.lat)) {
			return null;
		}

		return { lng: latLng.lng, lat: latLng.lat };
	}

	/**
	 * Retrieves the HTML container element of the Leaflet map.
	 * @returns The HTMLElement representing the map container.
	 */
	public getMapContainer() {
		return this._map.getContainer();
	}

	/**
	 * Enables or disables the draggable functionality of the map.
	 * @param enabled Set to true to enable map dragging, or false to disable it.
	 */
	public setDraggability(enabled: boolean) {
		if (enabled) {
			this._map.dragging.enable();
		} else {
			this._map.dragging.disable();
		}
	}

	/**
	 * Converts longitude and latitude coordinates to pixel coordinates in the map container.
	 * @param lng The longitude coordinate to project.
	 * @param lat The latitude coordinate to project.
	 * @returns An object with 'x' and 'y' properties representing the pixel coordinates within the map container.
	 */
	public project(lng: number, lat: number) {
		const { x, y } = this._map.latLngToContainerPoint({ lng, lat });
		return { x, y };
	}

	/**
	 * Converts pixel coordinates in the map container to longitude and latitude coordinates.
	 * @param x The x-coordinate in the map container to unproject.
	 * @param y The y-coordinate in the map container to unproject.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude coordinates.
	 */
	public unproject(x: number, y: number) {
		const { lng, lat } = this._map.containerPointToLatLng({
			x,
			y,
		} as L.PointExpression);
		return { lng, lat };
	}

	/**
	 * Sets the cursor style for the map container.
	 * @param cursor The CSS cursor style to apply, or 'unset' to remove any previously applied cursor style.
	 */
	public setCursor(cursor: Parameters<SetCursor>[0]) {
		if (cursor === "unset") {
			this.getMapContainer().style.removeProperty("cursor");
		} else {
			this.getMapContainer().style.cursor = cursor;
		}
	}

	/**
	 * Enables or disables the double-click to zoom functionality on the map.
	 * @param enabled Set to true to enable double-click to zoom, or false to disable it.
	 */
	public setDoubleClickToZoom(enabled: boolean) {
		if (enabled) {
			this._map.doubleClickZoom.enable();
		} else {
			this._map.doubleClickZoom.disable();
		}
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

		if (this._layer) {
			this._map.removeLayer(this._layer);
		}

		const featureCollection = {
			type: "FeatureCollection",
			features,
		} as { type: "FeatureCollection"; features: GeoJSONStoreFeatures[] };

		const layer = this._lib.geoJSON(featureCollection, {
			// Style points - convert markers to circle markers
			pointToLayer: (
				feature: GeoJSONStoreFeatures,
				latlng: L.LatLngExpression
			) => {
				if (!feature.properties) {
					throw new Error("Feature has no properties");
				}
				if (typeof feature.properties.mode !== "string") {
					throw new Error("Feature mode is not a string");
				}

				const mode = feature.properties.mode;
				const modeStyle = styling[mode];
				const featureStyles = modeStyle(feature);
				const paneId = String(featureStyles.zIndex);
				const pane = this._panes[paneId];

				if (!pane) {
					this._panes[paneId] = this.createPaneStyleSheet(
						paneId,
						featureStyles.zIndex
					);
				}

				const styles = {
					radius: featureStyles.pointWidth,
					stroke: featureStyles.pointOutlineWidth || false,
					color: featureStyles.pointOutlineColor,
					weight: featureStyles.pointOutlineWidth,
					fillOpacity: 0.8,
					fillColor: featureStyles.pointColor,
					pane: paneId,
					interactive: false, // Removes mouse hover cursor styles
				} as L.CircleMarkerOptions;

				const marker = this._lib.circleMarker(latlng, styles);

				return marker;
			},

			// Style LineStrings and Polygons
			style: (_feature) => {
				if (!_feature || !_feature.properties) {
					return {};
				}

				const feature = _feature as GeoJSONStoreFeatures;

				const mode = feature.properties.mode as string;
				const modeStyle = styling[mode];
				const featureStyles = modeStyle(feature);

				if (feature.geometry.type === "LineString") {
					return {
						interactive: false, // Removes mouse hover cursor styles
						color: featureStyles.lineStringColor,
						weight: featureStyles.lineStringWidth,
					};
				} else if (feature.geometry.type === "Polygon") {
					return {
						interactive: false, // Removes mouse hover cursor styles
						fillOpacity: featureStyles.polygonFillOpacity,
						fillColor: featureStyles.polygonFillColor,
						weight: featureStyles.polygonOutlineWidth,
						stroke: true,
						color: featureStyles.polygonFillColor,
					};
				}

				return {};
			},
		});

		this._map.addLayer(layer);

		this._layer = layer;
	}
}
