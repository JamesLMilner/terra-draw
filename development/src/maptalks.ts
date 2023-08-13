// @ts-ignore
import * as maptalks from "maptalks";

import {
	TerraDraw,
	TerraDrawPointMode,
	TerraDrawCircleMode,
	TerraDrawLineStringMode,
	TerraDrawPolygonMode,
	TerraDrawSelectMode,
	TerraDrawFreehandMode,
	TerraDrawGreatCircleMode,
	TerraDrawRectangleMode,
	TerraDrawMaptalksAdapter,
} from "../../src/terra-draw";
import { TerraDrawRenderMode } from "../../src/modes/render/render.mode";

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
	return [
		new TerraDrawSelectMode({
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
			styles: {
				// Point
				selectedPointWidth: 14,
				selectedPointOutlineWidth: 2,

				// Selection Points (points at vertices of a polygon/linestring feature)
				selectionPointWidth: 14,
				selectionPointOutlineWidth: 2,

				// Mid points (points at mid point of a polygon/linestring feature)
				midPointWidth: 10,
				midPointOutlineWidth: 2,
			},
		}),
		new TerraDrawPointMode({
			styles: {
				pointWidth: 14,
			},
		}),
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
				pointWidth: 14,
				pointOutlineWidth: 2,
			},
		}),
	];
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
	initMaptalks(id: string) {
		if (this.initialised.includes("maptalks")) {
			return;
		}

		const { lng, lat, zoom } = this;

		const map = new maptalks.Map(id, {
			center: [lng, lat], // starting position [lng, lat]
			zoom: zoom, // starting zoom
			baseLayer: new maptalks.TileLayer("base", {
				urlTemplate:
					"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
				subdomains: ["a", "b", "c", "d"],
				attribution:
					'&copy; <a href="http://osm.org">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>',
			}),
		});

		const draw = new TerraDraw({
			adapter: new TerraDrawMaptalksAdapter({
				map,
				coordinatePrecision: 8,
				useGLLayer: true,
			}),
			modes: getModes(),
		});

		draw.start();

		addModeChangeHandler(draw, currentSelected);
		this.initialised.push("maptalks");
	},
};

console.log(process.env);

example.initMaptalks("maptalks-map");
document.addEventListener("keyup", (event) => {
	(document.getElementById("keybind") as HTMLButtonElement).innerHTML =
		event.key;
});
