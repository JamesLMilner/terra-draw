import maplibregl, { StyleSpecification } from "maplibre-gl";
import { getElements, setupControls } from "../../common/container";
import { TerraDraw } from "../../../../terra-draw/src/terra-draw";
import { TerraDrawMapLibreGLAdapter } from "../../../../terra-draw-maplibre-gl-adapter/src/terra-draw-maplibre-gl-adapter";
import { StoryArgs } from "../../common/config";

// OpenStreetMap style for MapLibre
const OSMStyle: StyleSpecification = {
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

export const initialiseMapLibreMap = ({
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
	// Initialize MapLibre map
	const map = new maplibregl.Map({
		container: mapContainer.id,
		style: OSMStyle,
		center: [centerLng, centerLat], // MapLibre uses [lng, lat] format
		zoom: zoom,
	});

	return {
		map,
	};
};

const renderCheck: Record<string, HTMLElement> = {};

export function SetupMapLibre(args: StoryArgs): HTMLElement {
	// Ensure that the map is only rendered once per story
	if (renderCheck[args.id]) {
		return renderCheck[args.id];
	}

	const { container, controls, mapContainer } = getElements({
		width: args.width,
		height: args.height,
	});

	const draw = new TerraDraw({
		adapter: new TerraDrawMapLibreGLAdapter({
			...initialiseMapLibreMap({
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
