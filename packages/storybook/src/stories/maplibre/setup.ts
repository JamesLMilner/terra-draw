import maplibregl, { StyleSpecification } from "maplibre-gl";
import { getElements, setupControls } from "../../common/container";
import { TerraDraw } from "../../../../terra-draw/src/terra-draw";
import { TerraDrawMapLibreGLAdapter } from "../../../../terra-draw-maplibre-gl-adapter/src/terra-draw-maplibre-gl-adapter";
import { StoryArgs } from "../../common/config";

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

const current = {
	map: null as maplibregl.Map | null,
	draw: null as TerraDraw | null,
	container: null as HTMLElement | null,
};

export function SetupMapLibre(args: StoryArgs): HTMLElement {
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

	const { container, controls, mapContainer } = getElements({
		width: args.width,
		height: args.height,
	});

	const { map } = initialiseMapLibreMap({
		mapContainer,
		centerLat: args.centerLat,
		centerLng: args.centerLng,
		zoom: args.zoom,
	});

	map.once("style.load", () => {
		const draw = new TerraDraw({
			adapter: new TerraDrawMapLibreGLAdapter({
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
	});

	return container;
}
