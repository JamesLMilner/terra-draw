// Import Leaflet CSS for map styling
import "leaflet/dist/leaflet.css";
// Import MapLibre CSS for map styling
import "maplibre-gl/dist/maplibre-gl.css";
// Import Mapbox CSS for map styling
import "mapbox-gl/dist/mapbox-gl.css";
// Import OpenLayers CSS for map styling
import "ol/ol.css";
// Import ArcGIS CSS for map styling
import "@arcgis/core/assets/esri/themes/light/main.css";

const preview = {
	parameters: {
		actions: { argTypesRegex: "^on[A-Z].*" },
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
