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
	const modes = args.modes.map((mode) => mode());

	const modeButtons: HTMLButtonElement[] = [];

	const container = document.createElement("div");

	container.setAttribute("data-testid", `container`);
	container.style.display = "flex";
	container.style.flexDirection = "column";
	container.style.gap = "10px";

	// Create controls
	const controls = document.createElement("div");

	controls.style.display = "flex";
	controls.style.gap = "10px";
	controls.style.marginBottom = "10px";
	controls.style.height = "40px";

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

	// Create mode buttons
	modes.forEach((mode) => {
		// Create a button for each mode available
		const buttonLabel = modeToLabel(mode);
		const buttonId = getModeId(mode);
		const button = createButton({ label: buttonLabel, id: buttonId });
		controls.appendChild(button);
		button.disabled = true;
		controls.appendChild(button);

		modeButtons.push(button);
	});

	// Add clear button
	const clearButton = createButton({
		label: "Clear",
		id: "clear",
		background: COLORS.warning,
		color: COLORS.lightText,
	});

	controls.appendChild(clearButton);

	return {
		container,
		controls,
		mapContainer,
		modes,
		clearButton,
		modeButtons,
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

function getModeId(mode: TerraDrawBaseDrawMode<any>) {
	return `mode-button-${mode.mode}`;
}

/** This function applies the event handlers to the created button elements */
export function setupControls({
	show,
	changeMode,
	clear,
	clearButton,
	modeButtons,
	controls,
}: {
	modeButtons: HTMLButtonElement[];
	clearButton: HTMLButtonElement;
	show?: boolean;
	clear: () => void;
	changeMode: (mode: string) => void;
	controls: HTMLElement;
}) {
	if (show === false) {
		return;
	}

	// Create mode buttons
	modeButtons.forEach((button, i) => {
		// Extract the mode from the button ID
		const mode = button.id.split("mode-button-")[1];

		button.addEventListener("click", () => {
			// Set the mode in TerraDraw
			changeMode(mode);

			// Reset styles of all buttons
			resetButtonStyles(controls);

			// Update button styles to show active state
			setButtonActive(button);
		});

		button.disabled = false;

		// Activate the first mode button by default
		if (i === 0) {
			changeMode(mode);
			setButtonActive(button);
		}
	});

	clearButton.addEventListener("click", () => {
		clear();
	});
}

export function onNextFrame(fn: any) {
	requestAnimationFrame(() => requestAnimationFrame(fn));
}
