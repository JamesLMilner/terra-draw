import { TerraDrawBaseDrawMode } from "../../../terra-draw/src/extend";
import { StoryArgs } from "./config";

const COLORS = {
	primary: "#019cfd",
	warning: "#f44336",
	border: "#ccc",
	background: "#fff",
	text: "#333",
	lightText: "#fff",
};

export function setupMapContainer(args: StoryArgs) {
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
	mapContainer.id = `map-${args.id}`;
	mapContainer.style.width = args.width;
	mapContainer.style.height = args.height;
	mapContainer.style.border = `1px solid ${COLORS.border}`;

	if (args.showButtons !== false) {
		container.appendChild(controls);
	}

	container.appendChild(mapContainer);

	if (args.instructions) {
		const instructions = document.createElement("h3");
		instructions.style.margin = "0";
		instructions.style.width = `${args.width}`;
		instructions.textContent = args.instructions;

		container.appendChild(instructions);
	}

	return {
		container,
		controls,
		mapContainer,
	};
}

function createButton({
	label,
	id,
	background,
	color,
}: {
	label: string;
	id: string;
	background?: string;
	color?: string;
}): HTMLButtonElement {
	const button = document.createElement("button");

	button.id = id;
	button.textContent = label;
	button.style.background = background || COLORS.background;
	button.style.color = color || COLORS.text;
	button.style.padding = "8px 16px";
	button.style.margin = "0 4px";
	button.style.border = background
		? `2px solid ${background}`
		: `2px solid ${COLORS.border}`;
	button.style.borderRadius = "4px";
	button.style.cursor = "pointer";
	button.style.width = "180px";
	button.style.fontWeight = "bold";

	return button;
}

/** Take a mode and return an appropriate label for the button */
const modeToLabel = (mode: TerraDrawBaseDrawMode<any>) => {
	return mode.mode
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};

/** Ensure button styles are reset when we change */
function resetButtonStyles(controls: HTMLElement) {
	const modeButtons: HTMLButtonElement[] = Array.from(
		controls.querySelectorAll(`button[id^="mode"]`),
	);

	modeButtons.forEach((button) => {
		// Move to light blue if currently selected
		button.style.border = `1px solid ${COLORS.border}`;
	});
}

function setButtonActive(button: HTMLButtonElement) {
	button.style.border = `solid 2px ${COLORS.primary}`;
}

function setupClearButton({
	controls,
	clear,
}: {
	controls: HTMLElement;
	clear: () => void;
}) {
	// Add clear button
	const clearButton = createButton({
		label: "Clear",
		id: "clear",
		background: COLORS.warning,
		color: COLORS.lightText,
	});

	clearButton.addEventListener("click", () => {
		clear();
	});

	controls.appendChild(clearButton);
}

export function setupControls({
	changeMode,
	clear,
	modes,
	controls,
}: {
	clear: () => void;
	changeMode: (mode: string) => void;
	modes: TerraDrawBaseDrawMode<any>[];
	controls: HTMLElement;
}) {
	// Create mode buttons
	modes.forEach((mode, i) => {
		// Create a button for each mode available
		const buttonLabel = modeToLabel(mode);
		const buttonId = `mode-${mode.mode.toLowerCase().replace(/\s+/g, "-")}`;
		const button = createButton({ label: buttonLabel, id: buttonId });

		button.addEventListener("click", () => {
			// Set the mode in TerraDraw
			changeMode(mode.mode);

			// Reset styles of all buttons
			resetButtonStyles(controls);

			// Update button styles to show active state
			setButtonActive(button);
		});

		// Activate the first mode button by default
		if (i === 0) {
			changeMode(mode.mode);
			setButtonActive(button);
		}

		controls.appendChild(button);
	});

	setupClearButton({
		controls,
		clear,
	});
}
