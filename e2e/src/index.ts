import L from "leaflet";
import {
	TerraDraw,
	TerraDrawCircleMode,
	TerraDrawFreehandMode,
	TerraDrawGreatCircleMode,
	TerraDrawLeafletAdapter,
	TerraDrawLineStringMode,
	TerraDrawPointMode,
	TerraDrawPolygonMode,
	TerraDrawRectangleMode,
	TerraDrawRenderMode,
	TerraDrawSelectMode,
} from "../../src/terra-draw";

const example = {
	lng: -0.118092,
	lat: 51.509865,
	zoom: 12,
	initialised: [],
	initLeaflet() {
		const currentSelected: {
			mode: undefined | string;
			button: HTMLButtonElement | undefined;
		} = { mode: undefined, button: undefined };

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
									resizable: "opposite-corner-fixed",
								},
							},
						},
						circle: {
							feature: {
								draggable: true,
								coordinates: {
									draggable: true,
									resizable: "center-fixed",
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
					snapping: true,
					allowSelfIntersections: false,
				}),
				new TerraDrawGreatCircleMode({ snapping: true }),
				new TerraDrawPolygonMode({
					snapping: true,
					allowSelfIntersections: false,
				}),
				new TerraDrawRectangleMode(),
				new TerraDrawCircleMode(),
				new TerraDrawFreehandMode(),
				new TerraDrawRenderMode({
					modeName: "arbitary",
					styles: {
						polygonFillColor: "#4357AD",
						polygonOutlineColor: "#48A9A6",
						polygonOutlineWidth: 2,
					},
				}),
			],
		});

		draw.start();

		[
			"select",
			"point",
			"linestring",
			"polygon",
			"rectangle",
			"circle",
			"greatcircle",
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

example.initLeaflet();
