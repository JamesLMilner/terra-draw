import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import View from "ol/View";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { OSM, Vector as VectorSource } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { toLonLat, fromLonLat, getUserProjection } from "ol/proj";
import Projection from "ol/proj/Projection";
import { getElements, setupControls } from "../../common/container";
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
		},
		map,
	};
};

const current = {
	map: null as Map | null,
	draw: null as TerraDraw | null,
	container: null as HTMLElement | null,
};

export function SetupOpenLayers(args: StoryArgs): HTMLElement {
	if (current.draw) {
		if (current.draw.enabled) {
			current.draw.stop();
		}
		current.draw = null;
	}
	if (current.map) {
		current.map = null;
	}
	if (current.container) {
		current.container.remove();
		current.container = null;
	}

	const modes = args.modes.map((mode) => mode());

	const { container, controls, mapContainer } = getElements({
		width: args.width,
		height: args.height,
	});

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
				coordinatePrecision: 9,
			}),
			modes,
		});

		draw.start();

		setupControls({
			draw,
			modes,
			controls,
		});
	});

	return container;
}
