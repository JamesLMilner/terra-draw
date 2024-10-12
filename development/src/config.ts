export const Libraries = {
	Leaflet: "Leaflet",
	Mapbox: "Mapbox",
	OpenLayers: "OpenLayers",
	Google: "Google",
	ArcGIS: "ArcGIS",
	MapLibre: "MapLibre",
} as const;

export const Config = {
	// You can set this array to just one library or any number and combination
	// and the development page will respond accordingly. This is useful if you just want to
	// test one map at a time, or you're on a low powered machine.
	libraries: [
		Libraries.Leaflet,
		Libraries.MapLibre,
		Libraries.Mapbox,
		Libraries.Google,
		Libraries.OpenLayers,
		Libraries.ArcGIS,
	] as const,
};
