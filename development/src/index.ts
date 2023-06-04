import mapboxgl from "mapbox-gl";
import maplibregl from "maplibre-gl";
import * as L from "leaflet";
import { Loader } from "@googlemaps/js-api-loader";

import {
	TerraDraw,
	TerraDrawPointMode,
	TerraDrawCircleMode,
	TerraDrawLineStringMode,
	TerraDrawPolygonMode,
	TerraDrawSelectMode,
	TerraDrawFreehandMode,
	TerraDrawRectangleMode,
	TerraDrawMapboxGLAdapter,
	TerraDrawLeafletAdapter,
	TerraDrawGoogleMapsAdapter,
	TerraDrawMapLibreGLAdapter,
	TerraDrawGreatCircleMode,
} from "../../src/terra-draw";
import { TerraDrawRenderMode } from "../../src/modes/render/render.mode";

import Circle from "ol/geom/Circle";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import { TerraDrawOpenLayersAdapter } from "../../src/adapters/openlayers.adapter";
import View from "ol/View";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { OSM, Vector as VectorSource } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { fromLonLat, toLonLat } from "ol/proj";

const addModeChangeHandler = (
	draw: TerraDraw,
	currentSelected: { button: undefined | HTMLButtonElement; mode: string }
) => {
	[
		"select",
		"point",
		"linestring",
		"greatcircle",
		"polygon",
		"freehand",
		"circle",
		"rectangle",
	].forEach((mode) => {
		(document.getElementById(mode) as HTMLButtonElement).addEventListener(
			"click",
			() => {
				currentSelected.mode = mode;
				draw.setMode(currentSelected.mode);

				if (currentSelected.button) {
					currentSelected.button.style.color = "565656";
				}
				currentSelected.button = document.getElementById(
					mode
				) as HTMLButtonElement;
				currentSelected.button.style.color = "#27ccff";
			}
		);
	});

	(document.getElementById("clear") as HTMLButtonElement).addEventListener(
		"click",
		() => {
			draw.clear();
		}
	);
};

const getModes = () => {
	return {
		select: new TerraDrawSelectMode({
			flags: {
				arbitary: {
					feature: {},
				},
				polygon: {
					feature: {
						draggable: true,
						rotateable: true,
						scaleable: true,
						coordinates: {
							midpoints: true,
							draggable: true,
							deletable: true,
						},
					},
				},
				freehand: {
					feature: { draggable: true, coordinates: {} },
				},
				linestring: {
					feature: {
						draggable: true,
						coordinates: {
							midpoints: true,
							draggable: true,
							deletable: true,
						},
					},
				},
				circle: {
					feature: {
						draggable: true,
					},
				},
				point: {
					feature: {
						draggable: true,
					},
				},
			},
		}),
		point: new TerraDrawPointMode(),
		linestring: new TerraDrawLineStringMode({
			snapping: true,
			allowSelfIntersections: false,
		}),
		greatcircle: new TerraDrawGreatCircleMode({ snapping: true }),
		polygon: new TerraDrawPolygonMode({
			snapping: true,
			allowSelfIntersections: false,
		}),
		rectangle: new TerraDrawRectangleMode(),
		circle: new TerraDrawCircleMode(),
		freehand: new TerraDrawFreehandMode(),
		arbitary: new TerraDrawRenderMode({
			styles: {
				polygonFillColor: "#4357AD",
				polygonOutlineColor: "#48A9A6",
				polygonOutlineWidth: 2,
			},
		}),
	};
};

let currentSelected: { button: undefined | HTMLButtonElement; mode: string } = {
	button: undefined,
	mode: "static",
};

const example = {
	lng: -0.118092,
	lat: 51.509865,
	zoom: 12,
	initialised: [] as string[],
	initLeaflet(id: string) {
		if (this.initialised.includes("leaflet")) {
			return;
		}

		const { lng, lat, zoom } = this;

		const map = L.map(id, {
			center: [lat, lng],
			zoom: zoom + 1, // starting zoom
		});

		map.removeControl(map.zoomControl);

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(map);

		const draw = new TerraDraw({
			adapter: new TerraDrawLeafletAdapter({
				lib: L,
				map,
				coordinatePrecision: 9,
			}),
			modes: getModes(),
		});

		draw.start();

		addModeChangeHandler(draw, currentSelected);

		this.initialised.push("leaflet");
	},
	initMapbox(id: string, accessToken: string | undefined) {
		if (this.initialised.includes("mapbox")) {
			return;
		}

		if (!accessToken) {
			return;
		}

		const { lng, lat, zoom } = this;

		mapboxgl.accessToken = accessToken;

		const map = new mapboxgl.Map({
			container: id, // container ID
			style: "mapbox://styles/mapbox/streets-v11", // style URL
			center: [lng, lat], // starting position [lng, lat]
			zoom: zoom, // starting zoom
		});

		map.on("style.load", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawMapboxGLAdapter({
					map,
					coordinatePrecision: 9,
				}),
				modes: getModes(),
			});

			draw.start();

			addModeChangeHandler(draw, currentSelected);
		});
		this.initialised.push("mapbox");
	},
	initMapLibre(id: string, accessToken: string | undefined) {
		if (this.initialised.includes("maplibre")) {
			return;
		}

		if (!accessToken) {
			return;
		}

		const { lng, lat, zoom } = this;

		mapboxgl.accessToken = accessToken;

		const map = new maplibregl.Map({
			container: id, // container ID
			style: "https://demotiles.maplibre.org/style.json", // style URL
			center: [lng, lat], // starting position [lng, lat]
			zoom: zoom, // starting zoom
		});

		map.on("style.load", () => {
			const draw = new TerraDraw({
				adapter: new TerraDrawMapLibreGLAdapter({
					map,
					coordinatePrecision: 9,
				}),
				modes: getModes(),
			});

			draw.start();

			addModeChangeHandler(draw, currentSelected);
		});
		this.initialised.push("maplibre");
	},
	initOpenLayers(id: string) {
		if (this.initialised.includes("openlayers")) {
			return;
		}

		const { lng, lat, zoom } = this;

		console.log(lng, lat, zoom);
		const center = fromLonLat([lng, lat]);

		const map = new Map({
			layers: [
				new TileLayer({
					source: new OSM(),
				}),
			],
			target: id,
			view: new View({
				center,
				zoom,
			}),
			controls: [],
		});

		const draw = new TerraDraw({
			adapter: new TerraDrawOpenLayersAdapter({
				lib: {
					Circle,
					Feature,
					GeoJSON,
					Style,
					VectorLayer,
					VectorSource,
					Stroke,
					toLonLat,
					CircleStyle,
				},
				map,
				coordinatePrecision: 9,
			}),
			modes: getModes(),
		});
		draw.start();

		addModeChangeHandler(draw, currentSelected);

		this.initialised.push("openlayers");
	},
	initGoogleMaps(id: string, apiKey: string | undefined) {
		if (this.initialised.includes("google")) {
			return;
		}

		if (!apiKey) {
			return;
		}

		const loader = new Loader({
			apiKey,
			version: "weekly",
		});

		loader.load().then((google) => {
			const map = new google.maps.Map(
				document.getElementById(id) as HTMLElement,
				{
					disableDefaultUI: true,
					center: { lat: this.lat, lng: this.lng },
					zoom: this.zoom,
					clickableIcons: false,
				}
			);

			map.addListener("projection_changed", () => {
				const draw = new TerraDraw({
					adapter: new TerraDrawGoogleMapsAdapter({
						lib: google.maps,
						map,
						coordinatePrecision: 9,
					}),
					modes: getModes(),
				});
				draw.start();

				addModeChangeHandler(draw, currentSelected);

				this.initialised.push("google");
			});
		});
	},
};

console.log(process.env);

example.initOpenLayers("openlayers-map");
example.initLeaflet("leaflet-map");
example.initMapbox("mapbox-map", process.env.MAPBOX_ACCESS_TOKEN);
example.initGoogleMaps("google-map", process.env.GOOGLE_API_KEY);
example.initMapLibre("maplibre-map", process.env.MAPBOX_ACCESS_TOKEN);
document.addEventListener("keyup", (event) => {
	(document.getElementById("keybind") as HTMLButtonElement).innerHTML =
		event.key;
});
