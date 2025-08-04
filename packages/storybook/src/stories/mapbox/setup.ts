import mapboxgl from "mapbox-gl";
import { getElements, setupControls } from "../../common/container";
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
};

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
	});

	// Set style based on token availability
	if (accessToken) {
		// Use Mapbox Streets style with valid token
		map.setStyle("mapbox://styles/mapbox/streets-v11");
	} else {
		// Use OpenStreetMap style as fallback
		map.setStyle(OSMStyle as mapboxgl.Style);
	}

	return {
		map,
	};
};

const current = {
	map: null as mapboxgl.Map | null,
	draw: null as TerraDraw | null,
	container: null as HTMLElement | null,
};

export function SetupMapbox(args: StoryArgs): HTMLElement {
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

	const { container, controls, mapContainer } = getElements(args);

	const { map } = initialiseMapboxMap({
		mapContainer,
		centerLat: args.centerLat,
		centerLng: args.centerLng,
		zoom: args.zoom,
	});

	const modes = args.modes.map((mode) => mode());

	// Wait for style to load before initializing TerraDraw
	map.once("style.load", () => {
		const draw = new TerraDraw({
			adapter: new TerraDrawMapboxGLAdapter({
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
	});

	return container;
}
