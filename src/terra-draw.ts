import { TerraDrawGoogleMapsAdapter } from "./adapters/google-maps.adapter";
import { TerraDrawLeafletAdapter } from "./adapters/leaflet.adapter";
import { TerraDrawMapboxGLAdapter } from "./adapters/mapbox-gl.adapter";
import { TerraDrawMapLibreGLAdapter } from "./adapters/maplibre-gl.adapter";
import { TerraDrawOpenLayersAdapter } from "./adapters/openlayers.adapter";
import {
	TerraDrawMode,
	TerraDrawAdapter,
	TerraDrawAdapterStyling,
} from "./common";
import { TerraDrawCircleMode } from "./modes/circle/circle.mode";
import { TerraDrawFreehandMode } from "./modes/freehand/freehand.mode";
import { TerraDrawGreatCircleMode } from "./modes/greatcircle/great-circle.mode";
import { TerraDrawLineStringMode } from "./modes/linestring/linestring.mode";
import { TerraDrawPointMode } from "./modes/point/point.mode";
import { TerraDrawPolygonMode } from "./modes/polygon/polygon.mode";
import { TerraDrawRectangleMode } from "./modes/rectangle/rectangle.mode";
import { TerraDrawRenderMode } from "./modes/render/render.mode";
import { TerraDrawSelectMode } from "./modes/select/select.mode";
import { TerraDrawStaticMode } from "./modes/static/static.mode";
import {
	GeoJSONStore,
	GeoJSONStoreFeatures,
	StoreChangeHandler,
} from "./store/store";

type ChangeListener = (ids: string[], type: string) => void;
type SelectListener = (id: string) => void;
type DeselectListener = () => void;

interface TerraDrawEventListeners {
	change: ChangeListener;
	select: SelectListener;
	deselect: DeselectListener;
}

type TerraDrawEvents = keyof TerraDrawEventListeners;

class TerraDraw {
	private _modes: { [mode: string]: TerraDrawMode };
	private _mode: TerraDrawMode;
	private _adapter: TerraDrawAdapter;
	private _enabled = false;
	private _store: GeoJSONStore;
	private _eventListeners: {
		change: ChangeListener[];
		select: SelectListener[];
		deselect: DeselectListener[];
	};

	constructor(options: {
		adapter: TerraDrawAdapter;
		modes: { [mode: string]: TerraDrawMode };
		data?: GeoJSONStoreFeatures[];
	}) {
		this._adapter = options.adapter;
		this._mode = new TerraDrawStaticMode();
		this._modes = { ...options.modes, static: this._mode };
		this._eventListeners = { change: [], select: [], deselect: [] };

		if (options.data) {
			this._store = new GeoJSONStore({ data: options.data });
		} else {
			this._store = new GeoJSONStore();
		}

		const getChanged = (
			ids: string[]
		): {
			changed: GeoJSONStoreFeatures[];
			unchanged: GeoJSONStoreFeatures[];
		} => {
			const changed: GeoJSONStoreFeatures[] = [];

			const unchanged = this._store.copyAll().filter((f) => {
				if (ids.includes(f.id as string)) {
					changed.push(f);
					return false;
				}

				return true;
			});

			return { changed, unchanged };
		};

		const onChange: StoreChangeHandler = (ids, event) => {
			this._eventListeners.change.forEach((listener) => {
				listener(ids, event);
			});

			const { changed, unchanged } = getChanged(ids);

			if (event === "create") {
				this._adapter.render(
					{
						created: changed,
						deletedIds: [],
						unchanged,
						updated: [],
					},
					this.getModeStyles()
				);
			} else if (event === "update") {
				this._adapter.render(
					{
						created: [],
						deletedIds: [],
						unchanged,
						updated: changed,
					},
					this.getModeStyles()
				);
			} else if (event === "delete") {
				this._adapter.render(
					{ created: [], deletedIds: ids, unchanged, updated: [] },
					this.getModeStyles()
				);
			} else if (event === "styling") {
				this._adapter.render(
					{ created: [], deletedIds: [], unchanged, updated: [] },
					this.getModeStyles()
				);
			}
		};

		const onSelect = (selectedId: string) => {
			this._eventListeners.select.forEach((listener) => {
				listener(selectedId);
			});

			const { changed, unchanged } = getChanged([selectedId]);

			this._adapter.render(
				{ created: [], deletedIds: [], unchanged, updated: changed },
				this.getModeStyles()
			);
		};

		const onDeselect = (deselectedId: string) => {
			this._eventListeners.deselect.forEach((listener) => {
				listener();
			});

			const { changed, unchanged } = getChanged([deselectedId]);

			// onDeselect can be called after a delete call which means that
			// you are deselecting a feature that has been deleted. We
			// double check here to ensure that the feature still exists.
			if (changed) {
				this._adapter.render(
					{
						created: [],
						deletedIds: [],
						unchanged,
						updated: changed,
					},
					this.getModeStyles()
				);
			}
		};

		// Register stores and callbacks
		Object.keys(this._modes).forEach((modeId) => {
			this._modes[modeId].register({
				mode: modeId,
				store: this._store,
				setCursor: this._adapter.setCursor.bind(this._adapter),
				project: this._adapter.project.bind(this._adapter),
				unproject: this._adapter.unproject.bind(this._adapter),
				setDoubleClickToZoom: this._adapter.setDoubleClickToZoom.bind(
					this._adapter
				),
				onChange: onChange,
				onSelect: onSelect,
				onDeselect: onDeselect,
			});
		});

		// If we pass in data, we want to render it on startup
		if (options.data) {
			// Remove all non mode features
			const initialRender = this._store.copyAll().filter((feature) => {
				if (
					feature.properties &&
					!Object.keys(this._modes).includes(feature.properties.mode as string)
				) {
					this._store.delete([feature.id as string]);
					return false;
				}
				return true;
			});

			this._adapter.render(
				{
					created: initialRender,
					deletedIds: [],
					unchanged: [],
					updated: [],
				},
				this.getModeStyles()
			);
		}
	}

	private checkEnabled() {
		if (!this._enabled) {
			throw new Error("Terra Draw is not enabled");
		}
	}

	private getModeStyles() {
		const modeStyles: {
			[key: string]: (feature: GeoJSONStoreFeatures) => TerraDrawAdapterStyling;
		} = {};
		Object.keys(this._modes).forEach((mode) => {
			modeStyles[mode] = this._modes[mode].styleFeature.bind(this._modes[mode]);
		});
		return modeStyles;
	}

	/**
	 * Allows the setting of a style for a given mode
	 *
	 * @param mode - The mode you wish to set a style for
	 * @param styles - The styles you wish to set for the mode - this is
	 * the same as the initialisation style schema
	 *
	 * @alpha
	 */
	setModeStyles(mode: string, styles: TerraDrawAdapterStyling) {
		this.checkEnabled();
		this._modes[mode].styles = styles;
	}

	/**
	 * Allows the user to get a snapshot (copy) of all given features
	 *
	 * @returns An array of all given Feature Geometries in the instances store
	 *
	 * @alpha
	 */
	getSnapshot() {
		// This is a read only method so we do not need to check if enabled
		return this._store.copyAll();
	}

	/**
	 * Removes all data from the current store
	 *
	 * @alpha
	 */
	clear() {
		this.checkEnabled();
		this._store.clear();
	}

	/**
	 * A property used to determine whether the instance is active or not. You
	 * can use the start method to set this to true, and stop method to set this to false.
	 * This is a read only property.
	 *
	 * @return true or false depending on if the instance is stopped or started
	 * @readonly
	 * @alpha
	 */
	get enabled(): boolean {
		return this._enabled;
	}

	/**
	 * enabled is a read only property and will throw and error if you try and set it.
	 *
	 * @alpha
	 */
	set enabled(_) {
		throw new Error("Enabled is read only");
	}

	/**
	 * A method for getting the current mode name
	 *
	 * @return the current mode name
	 *
	 * @alpha
	 */
	getMode(): string {
		// This is a read only method so we do not need to check if enabled
		return this._mode.mode;
	}

	/**
	 * A method for setting the current mode by name. Under the hood this will stop
	 * the previous mode and start the new one.
	 * @param mode - The mode name you wish to start
	 *
	 * @alpha
	 */
	setMode(mode: string) {
		this.checkEnabled();

		if (this._modes[mode]) {
			// Before we swap modes we want to
			// clean up any state that has been left behind,
			// for example current drawing geometries
			// and mode state
			this._mode.stop();

			// Swap the mode to the new mode
			this._mode = this._modes[mode];

			// Start the new mode
			this._mode.start();
		} else {
			// If the mode doesn't exist, we throw an error
			throw new Error("No mode with this name present");
		}
	}

	/**
	 * A method starting the current mode if it has not been started already
	 *
	 * @alpha
	 */
	start() {
		this._enabled = true;
		this._adapter.register({
			getState: () => {
				return this._mode.state;
			},
			onClick: (event) => {
				this._mode.onClick(event);
			},
			onMouseMove: (event) => {
				this._mode.onMouseMove(event);
			},
			onKeyDown: (event) => {
				this._mode.onKeyDown(event);
			},
			onKeyUp: (event) => {
				this._mode.onKeyUp(event);
			},
			onDragStart: (event, setMapDraggability) => {
				this._mode.onDragStart(event, setMapDraggability);
			},
			onDrag: (event) => {
				this._mode.onDrag(event);
			},
			onDragEnd: (event, setMapDraggability) => {
				this._mode.onDragEnd(event, setMapDraggability);
			},
		});
	}

	/**
	 * A a method for stopping the current mode
	 *
	 * @alpha
	 */
	stop() {
		this._enabled = false;
		this._adapter.unregister();
	}

	/**
	 * Registers a Terra Draw event
	 *
	 * @param event - The name of the event you wish to listen for
	 * @param callback - The callback with you wish to be called when this event occurs
	 *
	 * @alpha
	 */
	on<T extends TerraDrawEvents>(
		event: T,
		callback: TerraDrawEventListeners[T]
	) {
		const listeners = this._eventListeners[
			event
		] as TerraDrawEventListeners[T][];
		if (!listeners.includes(callback)) {
			listeners.push(callback);
		}
	}

	/**
	 * Unregisters a Terra Draw event
	 *
	 * @param event - The name of the event you wish to unregister
	 * @param callback - The callback you originally provided to the 'on' method
	 *
	 * @alpha
	 */
	off<T extends TerraDrawEvents>(
		event: TerraDrawEvents,
		callback: TerraDrawEventListeners[T]
	) {
		const listeners = this._eventListeners[
			event
		] as TerraDrawEventListeners[T][];
		if (listeners.includes(callback)) {
			listeners.splice(listeners.indexOf(callback), 1);
		}
	}
}

export {
	TerraDraw,
	TerraDrawSelectMode,
	TerraDrawPointMode,
	TerraDrawLineStringMode,
	TerraDrawGreatCircleMode,
	TerraDrawPolygonMode,
	TerraDrawCircleMode,
	TerraDrawFreehandMode,
	TerraDrawRenderMode,
	TerraDrawRectangleMode,
	TerraDrawGoogleMapsAdapter,
	TerraDrawMapboxGLAdapter,
	TerraDrawLeafletAdapter,
	TerraDrawMapLibreGLAdapter,
	TerraDrawOpenLayersAdapter,
};
