import { TerraDrawGoogleMapsAdapter } from "./adapters/google-maps.adapter";
import { TerraDrawLeafletAdapter } from "./adapters/leaflet.adapter";
import { TerraDrawMapboxGLAdapter } from "./adapters/mapbox-gl.adapter";
import { TerraDrawMapLibreGLAdapter } from "./adapters/maplibre-gl.adapter";
import { TerraDrawOpenLayersAdapter } from "./adapters/openlayers.adapter";
import { TerraDrawArcGISMapsSDKAdapter } from "./adapters/arcgis-maps-sdk.adapter";
import {
	TerraDrawAdapter,
	TerraDrawAdapterStyling,
	GetLngLatFromEvent,
	Project,
	SetCursor,
	TerraDrawChanges,
	TerraDrawStylingFunction,
	Unproject,
	HexColor,
	TerraDrawKeyboardEvent,
	TerraDrawMouseEvent,
	SELECT_PROPERTIES,
} from "./common";
import { TerraDrawBaseAdapter } from "./adapters/common/base.adapter";
import { ModeTypes, TerraDrawBaseDrawMode } from "./modes/base.mode";
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
	BBoxPolygon,
	GeoJSONStore,
	GeoJSONStoreFeatures,
	StoreChangeHandler,
} from "./store/store";
import { BehaviorConfig } from "./modes/base.behavior";
import { pixelDistance } from "./geometry/measure/pixel-distance";
import { pixelDistanceToLine } from "./geometry/measure/pixel-distance-to-line";
import { Position } from "geojson";
import { pointInPolygon } from "./geometry/boolean/point-in-polygon";
import { createBBoxFromPoint } from "./geometry/shape/create-bbox";

type FinishListener = (ids: string) => void;
type ChangeListener = (ids: string[], type: string) => void;
type SelectListener = (id: string) => void;
type DeselectListener = () => void;

interface TerraDrawEventListeners {
	finish: FinishListener;
	change: ChangeListener;
	select: SelectListener;
	deselect: DeselectListener;
}

type TerraDrawEvents = keyof TerraDrawEventListeners;

class TerraDraw {
	private _modes: { [mode: string]: TerraDrawBaseDrawMode<any> };
	private _mode: TerraDrawBaseDrawMode<any>;
	private _adapter: TerraDrawAdapter;
	private _enabled = false;
	private _store: GeoJSONStore;
	private _eventListeners: {
		change: ChangeListener[];
		finish: FinishListener[];
		select: SelectListener[];
		deselect: DeselectListener[];
	};
	// This is the select mode that is assigned in the instance.
	// There can only be 1 select mode active per instance
	private _instanceSelectMode: undefined | string;

	constructor(options: {
		adapter: TerraDrawAdapter;
		modes: TerraDrawBaseDrawMode<any>[];
	}) {
		this._adapter = options.adapter;

		this._mode = new TerraDrawStaticMode();

		// Keep track of if there are duplicate modes
		const duplicateModeTracker = new Set();

		// Construct a map of the mode name to the mode
		const modesMap = options.modes.reduce<{
			[mode: string]: TerraDrawBaseDrawMode<any>;
		}>((modeMap, currentMode) => {
			if (duplicateModeTracker.has(currentMode.mode)) {
				throw new Error(`There is already a ${currentMode.mode} mode provided`);
			}
			duplicateModeTracker.add(currentMode.mode);
			modeMap[currentMode.mode] = currentMode;
			return modeMap;
		}, {});

		// Construct an array of the mode keys (names)
		const modeKeys = Object.keys(modesMap);

		// Ensure at least one draw mode is provided
		if (modeKeys.length === 0) {
			throw new Error("No modes provided");
		}

		// Ensure only one select mode can be present
		modeKeys.forEach((mode) => {
			if (modesMap[mode].type !== ModeTypes.Select) {
				return;
			}
			if (this._instanceSelectMode) {
				throw new Error("only one type of select mode can be provided");
			} else {
				this._instanceSelectMode = mode;
			}
		});

		this._modes = { ...modesMap, static: this._mode };
		this._eventListeners = { change: [], select: [], deselect: [], finish: [] };
		this._store = new GeoJSONStore();

		const getChanged = (
			ids: string[],
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

		const onFinish = (finishedId: string) => {
			if (!this._enabled) {
				return;
			}

			this._eventListeners.finish.forEach((listener) => {
				listener(finishedId);
			});
		};

		const onChange: StoreChangeHandler = (ids, event) => {
			if (!this._enabled) {
				return;
			}

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
					this.getModeStyles(),
				);
			} else if (event === "update") {
				this._adapter.render(
					{
						created: [],
						deletedIds: [],
						unchanged,
						updated: changed,
					},
					this.getModeStyles(),
				);
			} else if (event === "delete") {
				this._adapter.render(
					{ created: [], deletedIds: ids, unchanged, updated: [] },
					this.getModeStyles(),
				);
			} else if (event === "styling") {
				this._adapter.render(
					{ created: [], deletedIds: [], unchanged, updated: [] },
					this.getModeStyles(),
				);
			}
		};

		const onSelect = (selectedId: string) => {
			if (!this._enabled) {
				return;
			}

			this._eventListeners.select.forEach((listener) => {
				listener(selectedId);
			});

			const { changed, unchanged } = getChanged([selectedId]);

			this._adapter.render(
				{ created: [], deletedIds: [], unchanged, updated: changed },
				this.getModeStyles(),
			);
		};

		const onDeselect = (deselectedId: string) => {
			if (!this._enabled) {
				return;
			}

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
					this.getModeStyles(),
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
					this._adapter,
				),
				onChange: onChange,
				onSelect: onSelect,
				onDeselect: onDeselect,
				onFinish: onFinish,
				coordinatePrecision: this._adapter.getCoordinatePrecision(),
			});
		});
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
			modeStyles[mode] = (feature: GeoJSONStoreFeatures) => {
				// If the feature is selected, we want to use the select mode styling
				if (
					this._instanceSelectMode &&
					feature.properties[SELECT_PROPERTIES.SELECTED]
				) {
					return this._modes[this._instanceSelectMode].styleFeature.bind(
						this._modes[this._instanceSelectMode],
					)(feature);
				}

				// Otherwise use regular styling
				return this._modes[mode].styleFeature.bind(this._modes[mode])(feature);
			};
		});
		return modeStyles;
	}

	private featuresAtLocation(
		{
			lng,
			lat,
		}: {
			lng: number;
			lat: number;
		},
		options?: { pointerDistance: number; ignoreSelectFeatures: boolean },
	) {
		const pointerDistance =
			options && options.pointerDistance !== undefined
				? options.pointerDistance
				: 30; // default is 30px

		const ignoreSelectFeatures =
			options && options.ignoreSelectFeatures !== undefined
				? options.ignoreSelectFeatures
				: true;

		const unproject = this._adapter.unproject.bind(this._adapter);
		const project = this._adapter.project.bind(this._adapter);

		const inputPoint = project(lng, lat);

		const bbox = createBBoxFromPoint({
			unproject,
			point: inputPoint,
			pointerDistance,
		});

		const features = this._store.search(bbox as BBoxPolygon);

		// TODO: This is designed to work in a similar way as FeatureAtPointerEvent
		// perhaps at some point we could figure out how to unify them
		return features.filter((feature) => {
			if (
				ignoreSelectFeatures &&
				(feature.properties[SELECT_PROPERTIES.MID_POINT] ||
					feature.properties[SELECT_PROPERTIES.SELECTION_POINT])
			) {
				return false;
			}

			if (feature.geometry.type === "Point") {
				const pointCoordinates = feature.geometry.coordinates;
				const pointXY = project(pointCoordinates[0], pointCoordinates[1]);
				const distance = pixelDistance(inputPoint, pointXY);
				return distance < pointerDistance;
			} else if (feature.geometry.type === "LineString") {
				const coordinates: Position[] = feature.geometry.coordinates;

				for (let i = 0; i < coordinates.length - 1; i++) {
					const coord = coordinates[i];
					const nextCoord = coordinates[i + 1];
					const distanceToLine = pixelDistanceToLine(
						inputPoint,
						project(coord[0], coord[1]),
						project(nextCoord[0], nextCoord[1]),
					);

					if (distanceToLine < pointerDistance) {
						return true;
					}
				}
				return false;
			} else {
				const lngLatInsidePolygon = pointInPolygon(
					[lng, lat],
					feature.geometry.coordinates,
				);

				if (lngLatInsidePolygon) {
					return true;
				}
			}
		});
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
	setModeStyles<Styling extends Record<string, number | HexColor>>(
		mode: string,
		styles: Styling,
	) {
		this.checkEnabled();
		if (!this._modes[mode]) {
			throw new Error("No mode with this name present");
		}

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
	 * Removes all data from the current store and removes any rendered layers
	 * via the registering the adapter.
	 *
	 * @alpha
	 */
	clear() {
		this.checkEnabled();
		this._adapter.clear();
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
	 * A method for removing features to the store
	 * @param ids
	 * @returns
	 *
	 * @alpha
	 */
	removeFeatures(ids: string[]) {
		this.checkEnabled();
		this._store.delete(ids);
	}

	/**
	 * A method for adding features to the store. This method will validate the features.
	 * Features must match one of the modes enabled in the instance.
	 * @param mode
	 * @param features
	 * @returns
	 *
	 * @alpha
	 */
	addFeatures(features: GeoJSONStoreFeatures[]) {
		this.checkEnabled();

		if (features.length === 0) {
			return;
		}

		this._store.load(features, (feature) => {
			const hasModeProperty = Boolean(
				feature &&
					typeof feature === "object" &&
					"properties" in feature &&
					typeof feature.properties === "object" &&
					feature.properties !== null &&
					"mode" in feature.properties,
			);

			if (hasModeProperty) {
				const modeToAddTo =
					this._modes[
						(feature as { properties: { mode: string } }).properties.mode
					];

				// if the mode does not exist, we return false
				if (!modeToAddTo) {
					return false;
				}

				// use the inbuilt validation of the mode
				const validation = modeToAddTo.validateFeature.bind(modeToAddTo);
				return validation(feature);
			}

			// If the feature does not have a mode property, we return false
			return false;
		});
	}

	/**
	 * A method starting Terra Draw. It put the instance into a started state, and
	 * in registers the passed adapter giving it all the callbacks required to operate.
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
			onDrag: (event, setMapDraggability) => {
				this._mode.onDrag(event, setMapDraggability);
			},
			onDragEnd: (event, setMapDraggability) => {
				this._mode.onDragEnd(event, setMapDraggability);
			},
			onClear: () => {
				// Ensure that the mode resets its state
				// as it may be storing feature ids internally in it's instance
				this._mode.cleanUp();

				// Remove all features from the store
				this._store.clear();
			},
		});
	}

	/**
	 * Gets the features at a given longitude and latitude.
	 * Will return point and linestrings that are a given pixel distance
	 * away from the lng/lat and any polygons which contain it.
	 *
	 * @alpha
	 */
	getFeaturesAtLngLat(
		lngLat: { lng: number; lat: number },
		options?: { pointerDistance: number; ignoreSelectFeatures: boolean },
	) {
		const { lng, lat } = lngLat;

		return this.featuresAtLocation(
			{
				lng,
				lat,
			},
			options,
		);
	}

	/**
	 * Takes a given pointer event and
	 * Will return point and linestrings that are a given pixel distance
	 * away from the lng/lat and any polygons which contain it.
	 *
	 * @alpha
	 */
	getFeaturesAtPointerEvent(
		event: PointerEvent | MouseEvent,
		options?: { pointerDistance: number; ignoreSelectFeatures: boolean },
	) {
		const getLngLatFromEvent = this._adapter.getLngLatFromEvent.bind(
			this._adapter,
		);

		const lngLat = getLngLatFromEvent(event);

		// If the pointer event is outside the container or the underlying library is
		// not ready we can get null as a returned value
		if (lngLat === null) {
			return [];
		}

		return this.featuresAtLocation(lngLat, options);
	}

	/**
	 * A method for stopping Terra Draw. Will clear the store, deregister the adapter and
	 * remove any rendered layers in the process.
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
		callback: TerraDrawEventListeners[T],
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
		callback: TerraDrawEventListeners[T],
	) {
		const listeners = this._eventListeners[
			event
		] as TerraDrawEventListeners[T][];
		if (listeners.includes(callback)) {
			listeners.splice(listeners.indexOf(callback), 1);
		}
	}
}

// This object allows 3rd party developers to
// extend these abstract classes and create there
// own modes and adapters
const TerraDrawExtend = {
	TerraDrawBaseDrawMode,
	TerraDrawBaseAdapter,
};

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
	TerraDrawArcGISMapsSDKAdapter,
	TerraDrawExtend,

	// Types that are required for 3rd party developers to extend

	// TerraDrawBaseMode
	BehaviorConfig,
	GeoJSONStoreFeatures,
	HexColor,
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,

	// TerraDrawBaseAdapter
	TerraDrawChanges,
	TerraDrawStylingFunction,
	Project,
	Unproject,
	SetCursor,
	GetLngLatFromEvent,
};
