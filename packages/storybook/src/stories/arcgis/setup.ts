import EsriMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Point from "@arcgis/core/geometry/Point";
import Polyline from "@arcgis/core/geometry/Polyline";
import ArcGISPolygon from "@arcgis/core/geometry/Polygon";
import Graphic from "@arcgis/core/Graphic";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import Color from "@arcgis/core/Color";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import {
	setupMapContainer,
	setupControls,
	onNextFrame,
} from "../../common/setup";
import { TerraDraw } from "../../../../terra-draw/src/terra-draw";
import { TerraDrawArcGISMapsSDKAdapter } from "../../../../terra-draw-arcgis-adapter/src/terra-draw-arcgis-adapter";
import { StoryArgs } from "../../common/config";
import { PictureMarkerSymbol } from "@arcgis/core/symbols";

export const initialiseArcGISMap = ({
	mapContainer,
	centerLat,
	centerLng,
	zoom,
}: {
	mapContainer: HTMLElement;
	centerLat: number;
	centerLng: number;
	zoom: number;
}) => {
	// Create ArcGIS Map with OSM basemap
	const map = new EsriMap({
		basemap: "osm", // OpenStreetMap basemap
	});

	// Create MapView
	const view = new MapView({
		map: map,
		center: [centerLng, centerLat], // ArcGIS uses [lng, lat] format
		zoom: zoom + 1, // adjusted to match other map libraries
		container: mapContainer.id,
	});

	return {
		lib: {
			PictureMarkerSymbol,
			GraphicsLayer,
			Point,
			Polyline,
			Polygon: ArcGISPolygon,
			Graphic,
			SimpleLineSymbol,
			SimpleFillSymbol,
			SimpleMarkerSymbol,
			Color,
		},
		map: view, // Pass the MapView, not the Map
	};
};

const rendered: { [key: string]: HTMLElement } = {};

export function SetupArcGIS(args: StoryArgs): HTMLElement {
	if (rendered[args.id]) {
		return rendered[args.id];
	}

	const { container, controls, mapContainer, modes, modeButtons, clearButton } =
		setupMapContainer({ ...args, adapter: "arcgis" });

	onNextFrame(() => {
		try {
			const mapConfig = initialiseArcGISMap({
				mapContainer,
				centerLat: args.centerLat,
				centerLng: args.centerLng,
				zoom: args.zoom,
			});

			const draw = new TerraDraw({
				adapter: new TerraDrawArcGISMapsSDKAdapter({
					lib: mapConfig.lib,
					map: mapConfig.map,
				}),
				modes,
			});

			draw.start();

			setupControls({
				show: args.showButtons,
				changeMode: (mode) => draw.setMode(mode),
				clear: () => draw.clear(),
				modeButtons,
				clearButton,
				controls,
			});

			args.afterRender?.(draw);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error initializing ArcGIS Map:", error);

			// Add error message to container
			const errorDiv = document.createElement("div");
			errorDiv.style.padding = "20px";
			errorDiv.style.textAlign = "center";
			errorDiv.style.color = "#d32f2f";
			errorDiv.innerHTML = `
			<h3>ArcGIS Map Load Error</h3>
			<p>Failed to initialize ArcGIS JavaScript SDK. This might be due to:</p>
			<ul style="text-align: left; display: inline-block;">
				<li>Network connectivity issues</li>
				<li>ArcGIS SDK loading problems</li>
				<li>Browser compatibility issues</li>
			</ul>
			<p><small>Check console for details</small></p>
		`;
			mapContainer.appendChild(errorDiv);
		}
	});

	return container;
}
