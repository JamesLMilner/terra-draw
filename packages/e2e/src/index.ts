import L from "leaflet";

import { TerraDrawLeafletAdapter } from "terra-draw-leaflet-adapter";

import {
	TerraDraw,
	TerraDrawCircleMode,
	TerraDrawFreehandMode,
	TerraDrawLineStringMode,
	TerraDrawPointMode,
	TerraDrawPolygonMode,
	TerraDrawRectangleMode,
	TerraDrawAngledRectangleMode,
	TerraDrawSectorMode,
	TerraDrawSensorMode,
	TerraDrawRenderMode,
	TerraDrawSelectMode,
	ValidateMaxAreaSquareMeters,
} from "terra-draw";

const example = {
	lng: -0.118092,
	lat: 51.509865,
	zoom: 12,
	initialised: [],
	config: null as string[] | null,
	initPageConfig() {
		const urlParams = new URLSearchParams(window.location.search);
		// eslint-disable-next-line no-console
		console.log(urlParams);
		const config = urlParams.get("config");

		if (config) {
			this.config = config.split(",");
		}
	},
	initLeaflet() {
		const { lng, lat, zoom } = this;

		const map = L.map("map", {
			center: [lat, lng],
			zoom: zoom + 1, // starting zoom
		});

		map.removeControl(map.zoomControl);

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(map);

		return map;
	},

	initDraw(map: L.Map) {
		// eslint-disable-next-line no-console
		console.log(this.config);

		const draw = new TerraDraw({
			adapter: new TerraDrawLeafletAdapter({
				lib: L,
				map,
				coordinatePrecision: 6,
			}),
			modes: [
				new TerraDrawSelectMode({
					dragEventThrottle: 0,
					flags: {
						arbitary: {
							feature: {},
						},
						polygon: {
							feature: {
								validation:
									this.config?.includes("validationSuccess") ||
									this.config?.includes("validationFailure")
										? (feature) => {
												return ValidateMaxAreaSquareMeters(
													feature,
													this.config?.includes("validationFailure")
														? 1000000
														: 2000000,
												);
											}
										: undefined,
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
						rectangle: {
							feature: {
								draggable: true,
								coordinates: {
									draggable: true,
									resizable: "opposite",
								},
							},
						},
						circle: {
							feature: {
								draggable: true,
								coordinates: {
									draggable: true,
									resizable: "center",
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
					snapping: {
						toCoordinate: this.config?.includes("snappingCoordinate"),
					},
					...(this.config?.includes("insertCoordinates")
						? {
								insertCoordinates: {
									strategy: "amount",
									value: 10,
								},
							}
						: this.config?.includes("insertCoordinatesGlobe")
							? {
									projection: "globe",
									insertCoordinates: {
										strategy: "amount",
										value: 10,
									},
								}
							: undefined),
				}),
				new TerraDrawPolygonMode({
					validation:
						this.config?.includes("validationSuccess") ||
						this.config?.includes("validationFailure")
							? (feature) => {
									return ValidateMaxAreaSquareMeters(
										feature,
										this.config?.includes("validationFailure")
											? 1000000
											: 2000000,
									);
								}
							: undefined,
					snapping: {
						toCoordinate: this.config?.includes("snappingCoordinate"),
					},
				}),
				new TerraDrawRectangleMode(),
				new TerraDrawCircleMode({
					projection: this.config?.includes("globeCircle")
						? "globe"
						: "web-mercator",
				}),
				new TerraDrawFreehandMode(),
				new TerraDrawAngledRectangleMode(),
				new TerraDrawSectorMode(),
				new TerraDrawSensorMode(),
				new TerraDrawRenderMode({
					modeName: "arbitrary",
					styles: {
						polygonFillColor: "#4357AD",
						polygonOutlineColor: "#48A9A6",
						polygonOutlineWidth: 2,
					},
				}),
			],
		});

		draw.start();

		return draw;
	},
	initControls(draw: TerraDraw) {
		const currentSelected = { mode: "static", button: undefined } as {
			mode: string;
			button: undefined | HTMLButtonElement;
		};

		[
			"select",
			"point",
			"linestring",
			"polygon",
			"rectangle",
			"circle",
			"angled-rectangle",
			"sector",
			"sensor",
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
	},
};

example.initPageConfig();
const map = example.initLeaflet();
const draw = example.initDraw(map);
example.initControls(draw);
