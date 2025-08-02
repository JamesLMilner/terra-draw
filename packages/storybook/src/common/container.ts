import { TerraDrawBaseDrawMode } from "../../../terra-draw/src/extend";
import { TerraDraw } from "../../../terra-draw/src/terra-draw";

export function getElements(args: { width: string; height: string }) {
	const container = document.createElement("div");
	container.style.display = "flex";
	container.style.flexDirection = "column";
	container.style.gap = "10px";

	document.body.appendChild(container);

	// Create controls
	const controls = document.createElement("div");
	controls.style.display = "flex";
	controls.style.gap = "10px";
	controls.style.marginBottom = "10px";

	// Create map container
	const mapContainer = document.createElement("div");
	mapContainer.id = `map-${Math.random().toString(36).substr(2, 9)}`;
	mapContainer.style.width = args.width;
	mapContainer.style.height = args.height;
	mapContainer.style.border = "1px solid #ccc";

	container.appendChild(controls);
	container.appendChild(mapContainer);

	return {
		container,
		controls,
		mapContainer,
	};
}

export function setupControls({
	draw,
	modes,
	controls,
}: {
	draw: TerraDraw;
	modes: TerraDrawBaseDrawMode<any>[];
	controls: HTMLElement;
}) {
	// Create mode buttons
	modes.forEach((mode) => {
		const button = document.createElement("button");
		button.textContent = mode.mode
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
		button.style.padding = "8px 16px";
		button.style.margin = "0 4px";
		button.style.border = "1px solid #ccc";
		button.style.borderRadius = "4px";
		button.style.background = "#fff";
		button.style.cursor = "pointer";
		button.style.width = "140px";

		button.addEventListener("click", () => {
			draw.setMode(mode.mode);
			// Update button styles to show active state
			controls.querySelectorAll("button").forEach((btn) => {
				if (btn.id !== "clear") {
					btn.style.background = "#fff";
					btn.style.color = "#000";
				}
			});
			button.style.background = "#007cba";
			button.style.color = "#fff";
		});

		controls.appendChild(button);
	});

	// Add clear button
	const clearButton = document.createElement("button");
	clearButton.id = "clear";
	clearButton.textContent = "Clear";
	clearButton.style.padding = "8px 16px";
	clearButton.style.margin = "0 4px";
	clearButton.style.border = "1px solid #ccc";
	clearButton.style.borderRadius = "4px";
	clearButton.style.background = "#dc3545";
	clearButton.style.color = "#fff";
	clearButton.style.cursor = "pointer";
	clearButton.style.width = "140px";

	clearButton.addEventListener("click", () => {
		draw.clear();
	});

	controls.appendChild(clearButton);

	// Set default mode to first available mode
	if (modes.length > 0) {
		draw.setMode(modes[0].mode);
		(controls.firstChild as HTMLButtonElement).style.background = "#007cba";
		(controls.firstChild as HTMLButtonElement).style.color = "#fff";
	}
}
