import {
	TerraDraw,
	TerraDrawPolygonMode,
} from "../../../../terra-draw/src/terra-draw";
import { TerraDrawGoogleMapsAdapter } from "../../../../terra-draw-google-maps-adapter/src/terra-draw-google-maps-adapter";
import { whenElementExists } from "../../common/setup";
import { StoryArgs } from "../../common/config";
import { initialiseGoogleMap } from "./setup";

const PRIMARY = "#019cfd";
const BORDER = "#ccc";
const WARNING = "#f44336";
const BACKGROUND = "#fff";
const TEXT = "#333";
const LIGHT_TEXT = "#fff";

function createButton(
	label: string,
	id: string,
	opts?: { background?: string; color?: string },
): HTMLButtonElement {
	const btn = document.createElement("button");
	btn.id = id;
	btn.textContent = label;
	btn.disabled = true;
	btn.style.padding = "8px 16px";
	btn.style.margin = "0 4px";
	btn.style.border = opts?.background
		? `2px solid ${opts.background}`
		: `2px solid ${BORDER}`;
	btn.style.borderRadius = "4px";
	btn.style.background = opts?.background ?? BACKGROUND;
	btn.style.color = opts?.color ?? TEXT;
	btn.style.cursor = "pointer";
	btn.style.width = "180px";
	btn.style.fontWeight = "bold";
	return btn;
}

function setActive(btn: HTMLButtonElement) {
	btn.style.border = `solid 2px ${PRIMARY}`;
}

function setInactive(btn: HTMLButtonElement) {
	btn.style.border = `1px solid ${BORDER}`;
}

const rendered: { [key: string]: HTMLElement } = {};

export function SetupGoogleMultipleInstances(args: StoryArgs): HTMLElement {
	if (rendered[args.id]) {
		return rendered[args.id];
	}

	const container = document.createElement("div");
	container.setAttribute("data-adapter", "google");
	container.setAttribute("data-testid", "container");
	container.style.display = "flex";
	container.style.flexDirection = "column";
	container.style.gap = "10px";

	const makeControlRow = (label: string) => {
		const row = document.createElement("div");
		row.style.display = "flex";
		row.style.alignItems = "center";
		row.style.gap = "10px";
		row.style.height = "40px";
		const labelEl = document.createElement("strong");
		labelEl.textContent = label;
		labelEl.style.minWidth = "90px";
		row.appendChild(labelEl);
		return row;
	};

	const drawBtn1 = createButton("Draw Polygon", "mode-button-polygon-1");
	const clearBtn1 = createButton("Clear", "clear-1", {
		background: WARNING,
		color: LIGHT_TEXT,
	});
	const controls1 = makeControlRow("Instance 1:");
	controls1.appendChild(drawBtn1);
	controls1.appendChild(clearBtn1);

	const drawBtn2 = createButton("Draw Polygon", "mode-button-polygon-2");
	const clearBtn2 = createButton("Clear", "clear-2", {
		background: WARNING,
		color: LIGHT_TEXT,
	});
	const controls2 = makeControlRow("Instance 2:");
	controls2.appendChild(drawBtn2);
	controls2.appendChild(clearBtn2);

	const mapContainer = document.createElement("div");
	mapContainer.id = `map-${args.id}`;
	mapContainer.style.width = args.width;
	mapContainer.style.height = args.height;
	mapContainer.style.border = `1px solid ${BORDER}`;

	container.appendChild(controls1);
	container.appendChild(controls2);
	container.appendChild(mapContainer);

	whenElementExists(`#${mapContainer.id}`, () => {
		initialiseGoogleMap({
			mapContainer,
			centerLat: args.centerLat,
			centerLng: args.centerLng,
			zoom: args.zoom,
		})
			.then((mapConfig) => {
				mapConfig.map.addListener("projection_changed", () => {
					const adapter1 = new TerraDrawGoogleMapsAdapter({
						lib: mapConfig.lib,
						map: mapConfig.map,
					});
					const draw1 = new TerraDraw({
						adapter: adapter1,
						modes: [
							new TerraDrawPolygonMode({
								styles: {
									fillColor: "#3b82f6",
									fillOpacity: 0.3,
									outlineColor: "#1d4ed8",
									outlineWidth: 2,
								},
							}),
						],
					});

					const adapter2 = new TerraDrawGoogleMapsAdapter({
						lib: mapConfig.lib,
						map: mapConfig.map,
					});
					const draw2 = new TerraDraw({
						adapter: adapter2,
						modes: [
							new TerraDrawPolygonMode({
								styles: {
									fillColor: "#ef4444",
									fillOpacity: 0.3,
									outlineColor: "#b91c1c",
									outlineWidth: 2,
								},
							}),
						],
					});

					draw1.start();
					draw2.start();

					draw1.on("ready", () => {
						// Seed instance 1 with a blue polygon (on left)
						draw1.addFeatures([
							{
								type: "Feature",
								properties: { mode: "polygon" },
								geometry: {
									type: "Polygon",
									coordinates: [
										[
											[-74.025, 40.705],
											[-74.01, 40.705],
											[-74.01, 40.72],
											[-74.025, 40.72],
											[-74.025, 40.705],
										],
									],
								},
							},
						]);

						drawBtn1.disabled = false;
						clearBtn1.disabled = false;

						// Start with instance 1 active
						draw1.setMode("polygon");
						draw2.setMode("static");
						setActive(drawBtn1);

						drawBtn1.addEventListener("click", () => {
							draw1.setMode("polygon");
							draw2.setMode("static");
							setActive(drawBtn1);
							setInactive(drawBtn2);
						});

						clearBtn1.addEventListener("click", () => draw1.clear());
					});

					draw2.on("ready", () => {
						// Seed instance 2 with a red polygon (on right)
						draw2.addFeatures([
							{
								type: "Feature",
								properties: { mode: "polygon" },
								geometry: {
									type: "Polygon",
									coordinates: [
										[
											[-74.002, 40.705],
											[-73.987, 40.705],
											[-73.987, 40.72],
											[-74.002, 40.72],
											[-74.002, 40.705],
										],
									],
								},
							},
						]);

						drawBtn2.disabled = false;
						clearBtn2.disabled = false;

						drawBtn2.addEventListener("click", () => {
							draw2.setMode("polygon");
							draw1.setMode("static");
							setActive(drawBtn2);
							setInactive(drawBtn1);
						});

						clearBtn2.addEventListener("click", () => draw2.clear());
					});
				});
			})
			.catch((error) => {
				// eslint-disable-next-line no-console
				console.warn("Error initializing Google Maps:", error);
				const errorDiv = document.createElement("div");
				errorDiv.style.padding = "20px";
				errorDiv.style.color = "#d32f2f";
				errorDiv.textContent =
					"Failed to load Google Maps. Check console for details.";
				mapContainer.appendChild(errorDiv);
			});
	});

	rendered[args.id] = container;
	return container;
}
