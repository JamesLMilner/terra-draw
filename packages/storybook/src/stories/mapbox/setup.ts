import mapboxgl from "mapbox-gl";
import {
	setupMapContainer,
	setupControls,
	onNextFrame,
} from "../../common/setup";
import { TerraDraw } from "../../../../terra-draw/src/terra-draw";
import { TerraDrawMapboxGLAdapter } from "../../../../terra-draw-mapbox-gl-adapter/src/terra-draw-mapbox-gl-adapter";
import { StoryArgs } from "../../common/config";

// OpenStreetMap style for Mapbox (fallback when no access token)
const OSMStyle = {
	version: 8,
	sources: {
		"osm-tiles": {
			type: "raster",
			tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
			tileSize: 256,
			attribution:
				'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		},
	},
	layers: [
		{
			id: "osm-tiles",
			type: "raster",
			source: "osm-tiles",
		},
	],
} as mapboxgl.Style;

export const initialiseMapboxMap = ({
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
	// Check for Mapbox access token (can be set via environment or global)

	const accessToken = (import.meta as any).env.MAPBOX_ACCESS_TOKEN;

	// Set access token (use placeholder if not available)
	if (accessToken) {
		mapboxgl.accessToken = accessToken;
	} else {
		throw new Error(
			"Mapbox access token is required. Set it via environment variable MAPBOX_ACCESS_TOKEN or globally.",
		);
	}

	// Initialize Mapbox map
	const map = new mapboxgl.Map({
		container: mapContainer.id,
		center: [centerLng, centerLat], // Mapbox uses [lng, lat] format
		zoom: zoom,
		style: mapboxgl.accessToken
			? "mapbox://styles/mapbox/streets-v11"
			: OSMStyle,
	});

	return {
		map,
	};
};

const rendered: { [key: string]: HTMLElement } = {};

export function SetupMapbox(args: StoryArgs): HTMLElement {
	if (rendered[args.id]) {
		return rendered[args.id];
	}

	const { container, controls, mapContainer, modeButtons, clearButton, modes } =
		setupMapContainer({ ...args, adapter: "mapbox" });

	onNextFrame(() => {
		const { map } = initialiseMapboxMap({
			mapContainer,
			centerLat: args.centerLat,
			centerLng: args.centerLng,
			zoom: args.zoom,
		});

		// Wait for style to load before initializing TerraDraw
		map.once("style.load", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawMapboxGLAdapter({
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
	});

	rendered[args.id] = container;

	return container;
}
