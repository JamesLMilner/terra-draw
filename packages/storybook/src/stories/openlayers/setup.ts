import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import View from "ol/View";
import { Circle, Fill, Icon, Stroke, Style } from "ol/style";
import { OSM, Vector as VectorSource } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { toLonLat, fromLonLat, getUserProjection } from "ol/proj";
import Projection from "ol/proj/Projection";
import {
	setupMapContainer,
	setupControls,
	onNextFrame,
} from "../../common/setup";
import { TerraDraw } from "../../../../terra-draw/src/terra-draw";
import { TerraDrawOpenLayersAdapter } from "../../../../terra-draw-openlayers-adapter/src/terra-draw-openlayers-adapter";
import { StoryArgs } from "../../common/config";

export const initialiseOpenLayersMap = ({
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
	// Convert lat/lng to OpenLayers projection
	const center = fromLonLat([centerLng, centerLat]);

	// Initialize OpenLayers map
	const map = new Map({
		layers: [
			new TileLayer({
				source: new OSM(),
			}),
		],
		target: mapContainer.id,
		view: new View({
			center,
			zoom: zoom + 1, // adjusted to match other map libraries
		}),
		controls: [], // Remove default controls for cleaner story presentation
	});

	return {
		lib: {
			Feature,
			GeoJSON,
			Style,
			VectorLayer,
			VectorSource,
			Stroke,
			getUserProjection,
			Circle,
			Fill,
			Projection,
			fromLonLat,
			toLonLat,
			Icon,
		},
		map,
	};
};

const rendered: { [key: string]: HTMLElement } = {};

export function SetupOpenLayers(args: StoryArgs): HTMLElement {
	if (rendered[args.id]) {
		return rendered[args.id];
	}

	const { container, controls, mapContainer, modeButtons, clearButton, modes } =
		setupMapContainer({ ...args, adapter: "openlayers" });

	onNextFrame(() => {
		const mapConfig = initialiseOpenLayersMap({
			mapContainer,
			centerLat: args.centerLat,
			centerLng: args.centerLng,
			zoom: args.zoom,
		});

		// Wait for the map to be rendered before initializing TerraDraw
		mapConfig.map.once("rendercomplete", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawOpenLayersAdapter({
					...mapConfig,
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
		});
	});

	rendered[args.id] = container;

	return container;
}
