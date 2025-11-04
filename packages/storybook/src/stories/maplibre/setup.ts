import maplibregl, { StyleSpecification } from "maplibre-gl";
import {
	setupMapContainer,
	setupControls,
	onNextFrame,
} from "../../common/setup";
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

const rendered: { [key: string]: HTMLElement } = {};

export function SetupMapLibre(args: StoryArgs): HTMLElement {
	if (rendered[args.id]) {
		return rendered[args.id];
	}

	const { container, controls, mapContainer, modeButtons, clearButton, modes } =
		setupMapContainer(args);

	onNextFrame(() => {
		try {
			const mapConfig = initialiseMapLibreMap({
				mapContainer,
				centerLat: args.centerLat,
				centerLng: args.centerLng,
				zoom: args.zoom,
			});

			// Wait for style to load before initializing TerraDraw
			mapConfig.map.once("style.load", () => {
				console.log("MapLibre style loaded");

				try {
					const draw = new TerraDraw({
						adapter: new TerraDrawMapLibreGLAdapter({
							map: mapConfig.map,
						}),
						modes,
					});
					draw.start();

					console.log("MapLibre map and Terra Draw initialized");

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
					console.error("Error initializing Terra Draw:", error);
				}
			});
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error initializing MapLibre:", error);
		}
	});

	rendered[args.id] = container;

	return container;
}
