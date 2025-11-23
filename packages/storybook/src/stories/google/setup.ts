import { Loader } from "@googlemaps/js-api-loader";
import {
	setupMapContainer,
	setupControls,
	onNextFrame,
} from "../../common/setup";
import { TerraDraw } from "../../../../terra-draw/src/terra-draw";
import { TerraDrawGoogleMapsAdapter } from "../../../../terra-draw-google-maps-adapter/src/terra-draw-google-maps-adapter";
import { StoryArgs } from "../../common/config";

const initialiseGoogleMap = async ({
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
	// Check for Google Maps API key (can be set via environment or global)
	let apiKey = (import.meta as any).env.GOOGLE_API_KEY;

	// If no API key is provided, use empty string (will still work for development)
	if (!apiKey) {
		throw new Error(
			"Google Maps API key is required. Please set it in your environment variables or as a global variable.",
		);
	}

	const loader = new Loader({
		apiKey,
		version: "weekly",
	});

	// Load Google Maps API
	const google = await loader.load();

	// Create Google Maps instance
	const map = new google.maps.Map(mapContainer, {
		disableDefaultUI: true,
		center: { lat: centerLat, lng: centerLng },
		zoom: zoom + 1, // adjusted to match other map libraries
		clickableIcons: false,
	});

	return {
		lib: google.maps,
		map,
	};
};

const rendered: { [key: string]: HTMLElement } = {};

export function SetupGoogle(args: StoryArgs): HTMLElement {
	if (rendered[args.id]) {
		return rendered[args.id];
	}

	const { container, controls, mapContainer, modeButtons, clearButton, modes } =
		setupMapContainer({ ...args, adapter: "google" });

	onNextFrame(() => {
		// Initialize Google Maps asynchronously
		initialiseGoogleMap({
			mapContainer,
			centerLat: args.centerLat,
			centerLng: args.centerLng,
			zoom: args.zoom,
		})
			.then((mapConfig) => {
				// Wait for projection to be ready
				mapConfig.map.addListener("projection_changed", () => {
					const adapter = new TerraDrawGoogleMapsAdapter({
						lib: mapConfig.lib,
						map: mapConfig.map,
					});

					const draw = new TerraDraw({
						adapter,
						modes,
					});

					draw.start();

					// Wait for TerraDraw to be ready before setting up controls
					draw.on("ready", () => {
						setupControls({
							show: args.showButtons,
							changeMode: (mode) => draw.setMode(mode),
							clear: () => draw.clear(),
							modeButtons,
							clearButton,
							controls,
						});

						args.afterRender?.(draw);
					});
				});
			})
			.catch((error) => {
				// We don't use console.error as this breaks Storybook tests

				// eslint-disable-next-line no-console
				console.warn("Error initializing Google Maps:", error);

				// Add error message to container
				const errorDiv = document.createElement("div");
				errorDiv.style.padding = "20px";
				errorDiv.style.textAlign = "center";
				errorDiv.style.color = "#d32f2f";
				errorDiv.innerHTML = `
			<h3>Google Maps Load Error</h3>
			<p>Failed to load Google Maps API. This might be due to:</p>
			<ul style="text-align: left; display: inline-block;">
				<li>Missing or invalid API key</li>
				<li>Network connectivity issues</li>
				<li>API quota exceeded</li>
			</ul>
			<p><small>Check console for details</small></p>
		`;
				mapContainer.appendChild(errorDiv);
			});
	});

	rendered[args.id] = container;

	return container;
}
