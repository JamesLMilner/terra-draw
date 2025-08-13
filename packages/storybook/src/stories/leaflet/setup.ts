import * as L from "leaflet";
import {
	setupMapContainer,
	setupControls,
	onNextFrame,
} from "../../common/setup";
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

const rendered: { [key: string]: HTMLElement } = {};

export function SetupLeaflet(args: StoryArgs): HTMLElement {
	if (rendered[args.id]) {
		return rendered[args.id];
	}

	const { container, controls, mapContainer, modeButtons, clearButton, modes } =
		setupMapContainer(args);

	onNextFrame(() => {
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

	return container;
}
