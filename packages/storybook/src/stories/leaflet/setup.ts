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

const renderCheck: Record<string, HTMLElement> = {};

export function SetupLeaflet(args: StoryArgs): HTMLElement {
	// Ensure that the map is only rendered once per story
	if (renderCheck[args.id]) {
		return renderCheck[args.id];
	}

	const { container, controls, mapContainer } = getElements({
		width: args.width,
		height: args.height,
	});

	const draw = new TerraDraw({
		adapter: new TerraDrawLeafletAdapter({
			...initialiseLeafletMap({
				mapContainer,
				centerLat: args.centerLat,
				centerLng: args.centerLng,
				zoom: args.zoom,
			}),
		}),
		modes: args.modes,
	});

	draw.start();

	setupControls({
		draw,
		modes: args.modes,
		controls,
	});

	if (!renderCheck[args.id]) {
		renderCheck[args.id] = container;
	}

	return container;
}
