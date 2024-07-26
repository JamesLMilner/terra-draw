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
	TerraDrawArcGISMapsSDKAdapter,
	ValidateMinAreaSquareMeters,
} from "../../src/terra-draw";
import { TerraDrawRenderMode } from "../../src/modes/render/render.mode";
import { ValidateNotSelfIntersecting } from "../../src/validations/not-self-intersecting.validation";

import Circle from "ol/geom/Circle";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import { TerraDrawOpenLayersAdapter } from "../../src/adapters/openlayers.adapter";
import View from "ol/View";
import { Circle as CircleStyle, Stroke, Style } from "ol/style";
import { OSM, Vector as VectorSource } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { fromLonLat, toLonLat } from "ol/proj";
import EsriMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Point from "@arcgis/core/geometry/Point";
import Polyline from "@arcgis/core/geometry/Polyline";
import ArcGISPolygon from "@arcgis/core/geometry/Polygon";
import Graphic from "@arcgis/core/Graphic";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import Color from "@arcgis/core/Color";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import { Config, Libraries } from "./config";

const addModeChangeHandler = (
	draw: TerraDraw,
	currentSelected: { button: undefined | HTMLButtonElement; mode: string },
) => {
	[
		"select",
		"point",
		"linestring",
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
					mode,
				) as HTMLButtonElement;
				currentSelected.button.style.color = "#27ccff";
			},
		);
	});

	(document.getElementById("clear") as HTMLButtonElement).addEventListener(
		"click",
		() => {
			draw.clear();
		},
	);
};

const getModes = () => {
	return [
		new TerraDrawSelectMode({
			projection: "globe",
			flags: {
				arbitrary: {
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
						rotateable: true,
						scaleable: true,
						coordinates: {
							midpoints: true,
							draggable: true,
							deletable: true,
						},
					},
				},
				rectangle: {
					feature: {
						draggable: true,
						coordinates: {
							midpoints: false,
							draggable: true,
							resizable: "center-fixed",
							deletable: true,
						},
					},
				},
				circle: {
					feature: {
						validation: (feature) => {
							if (feature.geometry.type !== "Polygon") {
								return false;
							}

							return ValidateMinAreaSquareMeters(feature, 1000);
						},
						draggable: true,
						coordinates: {
							midpoints: false,
							draggable: true,
							resizable: "center-fixed",
							deletable: true,
						},
					},
				},
				point: {
					feature: {
						draggable: true,
					},
				},
			},
		}),
		new TerraDrawPointMode(),
		new TerraDrawLineStringMode({
			insertCoordinates: {
				strategy: "amount",
				value: 10,
			},
		}),
		new TerraDrawPolygonMode({
			snapping: true,
			validation: (feature, { updateType }) => {
				if (updateType === "finish" || updateType === "commit") {
					return ValidateNotSelfIntersecting(feature);
				}
				return true;
			},
		}),
		new TerraDrawRectangleMode(),
		new TerraDrawCircleMode(),
		new TerraDrawFreehandMode(),
		new TerraDrawRenderMode({
			modeName: "arbitrary",
			styles: {
				polygonFillColor: "#4357AD",
				polygonOutlineColor: "#48A9A6",
				polygonOutlineWidth: 2,
			},
		}),
	];
};

const currentSelected: { button: undefined | HTMLButtonElement; mode: string } =
	{
		button: undefined,
		mode: "static",
	};

// Used by both Mapbox and MapLibre
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

const example = {
	lng: -0.118092,
	lat: 51.509865,
	zoom: 12,
	generateId(id: keyof typeof Libraries) {
		return `${id.toLowerCase()}-map`;
	},
	init() {
		for (const index in Config.libraries) {
			const div = document.createElement("div");
			div.style.position = "relative";
			div.style.cursor = "pointer";
			div.style.fontFamily = "sans-serif";
			div.style.height = "100%";
			div.style.width = `${100 / Object.keys(Config.libraries).length}%`;
			div.style.outline = "solid 1px #d7d7d7";

			div.id = this.generateId(Config.libraries[index]);
			div.innerHTML = `<div class="label">${Config.libraries[index]}</div>`;

			const container = document.getElementById("library-container");
			if (container) {
				container.appendChild(div);
			}
		}

		Config.libraries.forEach((library) => {
			this[library]();
		});

		// Key press output
		document.addEventListener("keyup", (event) => {
			(document.getElementById("keybind") as HTMLButtonElement).innerHTML =
				event.key;
		});
	},
	initialised: [] as string[],
	[Libraries.Leaflet]() {
		if (this.initialised.includes(Libraries.Leaflet)) {
			return;
		}

		const { lng, lat, zoom } = this;

		const map = L.map(this.generateId(Libraries.Leaflet), {
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

		this.initialised.push(Libraries.Leaflet);
	},
	[Libraries.Mapbox]() {
		if (this.initialised.includes(Libraries.Mapbox)) {
			return;
		}

		const { lng, lat, zoom } = this;

		const map = new mapboxgl.Map({
			container: this.generateId(Libraries.Mapbox), // container ID
			center: [lng, lat], // starting position [lng, lat]
			zoom: zoom, // starting zoom
			projection: { name: "globe" },
		});

		const accessToken = process.env.MAPBOX_ACCESS_TOKEN;

		// If we have an access token
		if (accessToken) {
			// Use it
			mapboxgl.accessToken = accessToken;

			// Use the Mapbox Streets style
			map.setStyle("mapbox://styles/mapbox/streets-v11");
		} else {
			// Use invalid access token
			mapboxgl.accessToken = "123";

			// Use the OpenStreetMap style
			map.setStyle(OSMStyle as mapboxgl.Style);
		}

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
		this.initialised.push(Libraries.Mapbox);
	},
	[Libraries.MapLibre]() {
		if (this.initialised.includes(Libraries.MapLibre)) {
			return;
		}

		const { lng, lat, zoom } = this;

		const map = new maplibregl.Map({
			container: this.generateId(Libraries.MapLibre),
			style: OSMStyle as maplibregl.StyleSpecification,
			center: [lng, lat],
			zoom: zoom,
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
		this.initialised.push(Libraries.MapLibre);
	},
	[Libraries.OpenLayers]() {
		if (this.initialised.includes(Libraries.OpenLayers)) {
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
			target: this.generateId(Libraries.OpenLayers),
			view: new View({
				center,
				zoom: zoom + 1, // adjusted to match raster maps
			}),
			controls: [],
		});

		map.once("postrender", () => {
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

			this.initialised.push(Libraries.OpenLayers);
		});
	},
	[Libraries.Google]() {
		if (this.initialised.includes(Libraries.Google)) {
			return;
		}

		let apiKey = process.env.GOOGLE_API_KEY;

		// If no API key is provided
		if (!apiKey) {
			// Using an empty key will still work for development
			apiKey = "";
		}

		const loader = new Loader({
			apiKey,
			version: "weekly",
		});

		loader.load().then((google) => {
			const map = new google.maps.Map(
				document.getElementById(
					this.generateId(Libraries.Google),
				) as HTMLElement,
				{
					disableDefaultUI: true,
					center: { lat: this.lat, lng: this.lng },
					zoom: this.zoom + 1, // adjusted to match raster maps
					clickableIcons: false,
					mapId: process.env.GOOGLE_MAP_ID,
				},
			);

			map.addListener("projection_changed", () => {
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: google.maps,
					map,
					coordinatePrecision: 9,
				});

				const draw = new TerraDraw({
					adapter,
					modes: getModes(),
				});

				draw.start();

				draw.on("ready", () => {
					// If we wanted to do operaations which require project/unproject
					// we ould ned to do them in here
					this.initialised.push("google");
					addModeChangeHandler(draw, currentSelected);
				});
			});

			this.initialised.push("google");
		});
	},
	[Libraries.ArcGIS]() {
		if (this.initialised.includes(Libraries.ArcGIS)) {
			return;
		}

		const { lng, lat, zoom } = this;
		const map = new EsriMap({
			basemap: "osm", // Basemap layer service
		});

		const view = new MapView({
			map: map,
			center: [lng, lat], // Longitude, latitude
			zoom: zoom + 1, // Zoom level
			container: this.generateId(Libraries.ArcGIS), // Div element
		});

		const draw = new TerraDraw({
			adapter: new TerraDrawArcGISMapsSDKAdapter({
				lib: {
					GraphicsLayer,
					Point,
					Polyline,
					Polygon: ArcGISPolygon,
					Graphic,
					SimpleLineSymbol,
					SimpleFillSymbol,
					SimpleMarkerSymbol,
					Color,
				},
				map: view,
			}),
			modes: getModes(),
		});

		draw.start();
		addModeChangeHandler(draw, currentSelected);

		this.initialised.push(Libraries.ArcGIS);
	},
};

console.log(process.env);
console.log(Config.libraries);

// Load base container and then load up all configured maps
example.init();
