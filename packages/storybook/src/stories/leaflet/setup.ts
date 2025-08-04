import * as L from "leaflet";
import { getElements, setupControls } from "../../common/container";
import { TerraDraw } from "../../../../terra-draw/src/terra-draw";
import { TerraDrawLeafletAdapter } from "../../../../terra-draw-leaflet-adapter/src/terra-draw-leaflet-adapter";
import { StoryArgs } from "../../common/config";

export const initialiseLeafletMap = ({
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
	// Initialize Leaflet map
	const map = L.map(mapContainer.id, {
		center: [centerLat, centerLng],
		zoom: zoom,
	});

	// Configure tile layer
	const tileLayerUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
	const attribution =
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

	// Add tile layer to the map
	L.tileLayer(tileLayerUrl, { attribution }).addTo(map);

	return {
		lib: L,
		map,
	};
};

const current = {
	map: null as L.Map | null,
	draw: null as TerraDraw | null,
	container: null as HTMLElement | null,
};

export function SetupLeaflet(args: StoryArgs): HTMLElement {
	if (current.draw) {
		if (current.draw.enabled) {
			current.draw.stop();
		}
		current.draw = null;
	}
	if (current.map) {
		current.map.remove();
		current.map = null;
	}
	if (current.container) {
		current.container.remove();
		current.container = null;
	}

	const modes = args.modes.map((mode) => mode());

	const { container, controls, mapContainer } = getElements(args);

	const { lib, map } = initialiseLeafletMap({
		mapContainer,
		centerLat: args.centerLat,
		centerLng: args.centerLng,
		zoom: args.zoom,
	});

	const draw = new TerraDraw({
		adapter: new TerraDrawLeafletAdapter({
			lib,
			map,
		}),
		modes,
	});

	draw.start();

	current.map = map;
	current.container = container;
	current.draw = draw;

	setupControls({
		draw,
		modes,
		controls,
	});

	args.afterRender?.(draw);

	return container;
}
