import {
	TerraDrawChanges,
	SetCursor,
	TerraDrawStylingFunction,
	TerraDrawCallbacks,
} from "../common";
import { Map } from "maplibre-gl";
import { TerraDrawMapboxGLAdapter } from "./mapbox-gl.adapter";
import { BaseAdapterConfig, TerraDrawBaseAdapter } from "./common/base.adapter";

export class TerraDrawMapLibreGLAdapter extends TerraDrawBaseAdapter {
	private mapboxglAdapter: TerraDrawMapboxGLAdapter;

	constructor(config: { map: Map } & BaseAdapterConfig) {
		super(config);

		// At the moment the APIs of MapboxGL and MapLibre are so compatible that
		// there is not need to bother completely reimplementing the internals of the adapter.
		// This may change over time and gives us a shell to allow for rewriting the internals
		// of the adapter should the MapboxGL and MapbLibre APIs diverge in the instances where
		// we rely on them.
		this.mapboxglAdapter = new TerraDrawMapboxGLAdapter(
			config as {
				map: any; //
				coordinatePrecision: number;
			},
		);
	}

	public register(callbacks: TerraDrawCallbacks): void {
		this.mapboxglAdapter.register(callbacks);
	}

	public unregister(): void {
		this.mapboxglAdapter.unregister();
	}

	/**
	 * Returns the longitude and latitude coordinates from a given PointerEvent on the map.
	 * @param event The PointerEvent or MouseEvent  containing the screen coordinates of the pointer.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude, or null if the conversion is not possible.
	 */
	public getLngLatFromEvent(event: PointerEvent | MouseEvent) {
		return this.mapboxglAdapter.getLngLatFromEvent(event);
	}

	/**
	 * Retrieves the HTML element of the MapLibre element that handles interaction events
	 * @returns The HTMLElement representing the map container.
	 */
	public getMapEventElement() {
		return this.mapboxglAdapter.getMapEventElement();
	}

	/**
	 * Enables or disables the draggable functionality of the map.
	 * @param enabled Set to true to enable map dragging, or false to disable it.
	 */
	public setDraggability(enabled: boolean) {
		this.mapboxglAdapter.setDraggability(enabled);
	}

	/**
	 * Converts longitude and latitude coordinates to pixel coordinates in the map container.
	 * @param lng The longitude coordinate to project.
	 * @param lat The latitude coordinate to project.
	 * @returns An object with 'x' and 'y' properties representing the pixel coordinates within the map container.
	 */
	public project(lng: number, lat: number) {
		return this.mapboxglAdapter.project(lng, lat);
	}

	/**
	 * Converts pixel coordinates in the map container to longitude and latitude coordinates.
	 * @param x The x-coordinate in the map container to unproject.
	 * @param y The y-coordinate in the map container to unproject.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude coordinates.
	 */
	public unproject(x: number, y: number) {
		return this.mapboxglAdapter.unproject(x, y);
	}

	/**
	 * Sets the cursor style for the map container.
	 * @param cursor The CSS cursor style to apply, or 'unset' to remove any previously applied cursor style.
	 */
	public setCursor(style: Parameters<SetCursor>[0]) {
		this.mapboxglAdapter.setCursor(style);
	}

	/**
	 * Enables or disables the double-click to zoom functionality on the map.
	 * @param enabled Set to true to enable double-click to zoom, or false to disable it.
	 */
	public setDoubleClickToZoom(enabled: boolean) {
		this.mapboxglAdapter.setDoubleClickToZoom(enabled);
	}

	/**
	 * Renders GeoJSON features on the map using the provided styling configuration.
	 * @param changes An object containing arrays of created, updated, and unchanged features to render.
	 * @param styling An object mapping draw modes to feature styling functions
	 */
	public render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction) {
		this.mapboxglAdapter.render(changes, styling);
	}

	/**
	 * Clears the map and store of all rendered data layers
	 * @returns void
	 * */
	public clear() {
		this.mapboxglAdapter.clear();
	}
}
