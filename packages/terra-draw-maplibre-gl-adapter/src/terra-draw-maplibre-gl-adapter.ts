/**
 * @module terra-draw-maplibre-gl-adapter
 */
import {
	TerraDrawChanges,
	SetCursor,
	TerraDrawStylingFunction,
	TerraDrawExtend,
	GeoJSONStoreGeometries,
} from "terra-draw";
import {
	CircleLayerSpecification,
	FillLayerSpecification,
	GeoJSONSource,
	LineLayerSpecification,
	Map,
	PointLike,
} from "maplibre-gl";
import { Feature, LineString, Point, Polygon } from "geojson";

export class TerraDrawMapLibreGLAdapter<
	MapType,
> extends TerraDrawExtend.TerraDrawBaseAdapter {
	constructor(
		config: {
			map: MapType;
			renderBelowLayerId?: string;
			renderPointsBelowLayerId?: string;
			renderLinesBelowLayerId?: string;
			renderPolygonsBelowLayerId?: string;
			prefixId?: string;
		} & TerraDrawExtend.BaseAdapterConfig,
	) {
		super(config);

		this._map = config.map as Map;
		this._container = this._map.getContainer();

		// We want to respect the initial map settings
		this._initialDragRotate = this._map.dragRotate.isEnabled();
		this._initialDragPan = this._map.dragPan.isEnabled();
		this._renderLinesBeforeLayerId =
			config.renderLinesBelowLayerId ?? config.renderBelowLayerId;
		this._renderPointsBeforeLayerId =
			config.renderPointsBelowLayerId ?? config.renderBelowLayerId;
		this._renderPolygonsBeforeLayerId =
			config.renderPolygonsBelowLayerId ?? config.renderBelowLayerId;

		this._prefixId = config.prefixId || "td";
	}

	private _renderPolygonsBeforeLayerId: string | undefined;
	private _renderPointsBeforeLayerId: string | undefined;
	private _renderLinesBeforeLayerId: string | undefined;
	private _prefixId: string;
	private _initialDragPan: boolean;
	private _initialDragRotate: boolean;
	private _nextRender: number | undefined;
	private _map: Map;
	private _container: HTMLElement;

	private _addGeoJSONSource(id: string, features: Feature[]) {
		this._map.addSource(id, {
			type: "geojson",
			data: {
				type: "FeatureCollection",
				features: features,
			},
			tolerance: 0,
		});
	}

	private _addFillLayer(id: string) {
		return this._map.addLayer({
			id,
			source: id,
			type: "fill",
			layout: {
				"fill-sort-key": ["get", "zIndex"],
			},
			// No need for filters as style is driven by properties
			paint: {
				"fill-color": ["get", "polygonFillColor"],
				"fill-opacity": ["get", "polygonFillOpacity"],
			},
		} as FillLayerSpecification);
	}

	private _addFillOutlineLayer(id: string) {
		const layer = this._map.addLayer({
			id: id + "-outline",
			source: id,
			type: "line",
			layout: {
				"line-sort-key": ["get", "zIndex"],
			},
			// No need for filters as style is driven by properties
			paint: {
				"line-width": ["get", "polygonOutlineWidth"],
				"line-color": ["get", "polygonOutlineColor"],
			},
		} as LineLayerSpecification);

		return layer;
	}

	private _addLineLayer(id: string) {
		const layer = this._map.addLayer({
			id,
			source: id,
			type: "line",
			layout: {
				"line-sort-key": ["get", "zIndex"],
			},
			// No need for filters as style is driven by properties
			paint: {
				"line-width": ["get", "lineStringWidth"],
				"line-color": ["get", "lineStringColor"],
			},
		} as LineLayerSpecification);

		return layer;
	}

	private _addPointLayer(id: string) {
		const layer = this._map.addLayer({
			id,
			source: id,
			type: "circle",
			layout: {
				"circle-sort-key": ["get", "zIndex"],
			},
			// No need for filters as style is driven by properties
			paint: {
				"circle-stroke-color": ["get", "pointOutlineColor"],
				"circle-stroke-width": ["get", "pointOutlineWidth"],
				"circle-radius": ["get", "pointWidth"],
				"circle-color": ["get", "pointColor"],
			},
		} as CircleLayerSpecification);

		return layer;
	}

	private _addLayer(
		id: string,
		featureType: "Point" | "LineString" | "Polygon",
	) {
		if (featureType === "Point") {
			this._addPointLayer(id);
		}
		if (featureType === "LineString") {
			this._addLineLayer(id);
		}
		if (featureType === "Polygon") {
			this._addFillLayer(id);
			this._addFillOutlineLayer(id);
		}
	}

	private _addGeoJSONLayer<T extends GeoJSONStoreGeometries>(
		featureType: Feature<T>["geometry"]["type"],
		features: Feature<T>[],
	) {
		const id = `${this._prefixId}-${featureType.toLowerCase()}`;
		this._addGeoJSONSource(id, features);
		this._addLayer(id, featureType);

		return id;
	}

	private _setGeoJSONLayerData<T extends GeoJSONStoreGeometries>(
		featureType: Feature<T>["geometry"]["type"],
		features: Feature<T>[],
	) {
		const id = `${this._prefixId}-${featureType.toLowerCase()}`;
		(this._map.getSource(id) as GeoJSONSource).setData({
			type: "FeatureCollection",
			features: features,
		});
		return id;
	}

	private changedIds: {
		deletion: boolean;
		points: boolean;
		linestrings: boolean;
		polygons: boolean;
		styling: boolean;
	} = {
		deletion: false,
		points: false,
		linestrings: false,
		polygons: false,
		styling: false,
	};

	private updateChangedIds(changes: TerraDrawChanges) {
		[...changes.updated, ...changes.created].forEach((feature) => {
			if (feature.geometry.type === "Point") {
				this.changedIds.points = true;
			} else if (feature.geometry.type === "LineString") {
				this.changedIds.linestrings = true;
			} else if (feature.geometry.type === "Polygon") {
				this.changedIds.polygons = true;
			}
		});

		if (changes.deletedIds.length > 0) {
			this.changedIds.deletion = true;
		}

		if (
			changes.created.length === 0 &&
			changes.updated.length === 0 &&
			changes.deletedIds.length === 0
		) {
			this.changedIds.styling = true;
		}
	}

	/**
	 * Returns the longitude and latitude coordinates from a given PointerEvent on the map.
	 * @param event The PointerEvent or MouseEvent  containing the screen coordinates of the pointer.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude, or null if the conversion is not possible.
	 */
	public getLngLatFromEvent(event: PointerEvent | MouseEvent) {
		const { left, top } = this._container.getBoundingClientRect();
		const x = event.clientX - left;
		const y = event.clientY - top;

		return this.unproject(x, y);
	}

	/**
	 *Retrieves the HTML element of the MapLibre element that handles interaction events
	 * @returns The HTMLElement representing the map container.
	 */
	public getMapEventElement() {
		return this._map.getCanvas();
	}

	/**
	 * Enables or disables the draggable functionality of the map.
	 * @param enabled Set to true to enable map dragging, or false to disable it.
	 */
	public setDraggability(enabled: boolean) {
		if (enabled) {
			// MapLibre GL has both drag rotation and drag panning interactions
			// hence having to enable/disable both
			if (this._initialDragRotate) {
				this._map.dragRotate.enable();
			}
			if (this._initialDragPan) {
				this._map.dragPan.enable();
			}
		} else {
			if (this._initialDragRotate) {
				this._map.dragRotate.disable();
			}
			if (this._initialDragPan) {
				this._map.dragPan.disable();
			}
		}
	}

	/**
	 * Converts longitude and latitude coordinates to pixel coordinates in the map container.
	 * @param lng The longitude coordinate to project.
	 * @param lat The latitude coordinate to project.
	 * @returns An object with 'x' and 'y' properties representing the pixel coordinates within the map container.
	 */
	public project(lng: number, lat: number) {
		const { x, y } = this._map.project({ lng, lat });
		return { x, y };
	}

	/**
	 * Converts pixel coordinates in the map container to longitude and latitude coordinates.
	 * @param x The x-coordinate in the map container to unproject.
	 * @param y The y-coordinate in the map container to unproject.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude coordinates.
	 */
	public unproject(x: number, y: number) {
		const { lng, lat } = this._map.unproject({ x, y } as PointLike);
		return { lng, lat };
	}

	/**
	 * Sets the cursor style for the map container.
	 * @param cursor The CSS cursor style to apply, or 'unset' to remove any previously applied cursor style.
	 */
	public setCursor(cursor: Parameters<SetCursor>[0]) {
		const canvas = this._map.getCanvas();
		if (cursor === "unset") {
			canvas.style.removeProperty("cursor");
		} else {
			canvas.style.cursor = cursor;
		}
	}

	/**
	 * Enables or disables the double-click to zoom functionality on the map.
	 * @param enabled Set to true to enable double-click to zoom, or false to disable it.
	 */
	public setDoubleClickToZoom(enabled: boolean) {
		if (enabled) {
			this._map.doubleClickZoom.enable();
		} else {
			this._map.doubleClickZoom.disable();
		}
	}

	/**
	 * Renders GeoJSON features on the map using the provided styling configuration.
	 * @param changes An object containing arrays of created, updated, and unchanged features to render.
	 * @param styling An object mapping draw modes to feature styling functions
	 */
	public render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction) {
		this.updateChangedIds(changes);

		if (this._nextRender) {
			cancelAnimationFrame(this._nextRender);
		}

		// Because Maplibre GL makes us pass in a full re-render of all the features
		// we can do debounce rendering to only render the last render in a given
		// frame bucket (16ms)
		this._nextRender = requestAnimationFrame(() => {
			// Because unregister may be called synchronously, and the rAF can occur after
			// it lets ensure the adapter is actually registered
			if (!this._currentModeCallbacks) {
				return;
			}

			// Get a map of the changed feature IDs by geometry type
			// We use this to determine which MB layers need to be updated

			const features = [
				...changes.created,
				...changes.updated,
				...changes.unchanged,
			];

			const points = [];
			const linestrings = [];
			const polygons = [];

			for (let i = 0; i < features.length; i++) {
				const feature = features[i];
				const { properties } = feature;
				const mode = properties.mode as string;
				const styles = styling[mode](feature);
				properties.zIndex = styles.zIndex;

				// Set the zIndex property for the feature regardless of geometry type
				// NOTE: Render ordering is predominately controlled by the layer order.
				// In this instance we are only controlling the zIndex order in relation to the layer itself. Since we have a
				// layer for each geometry type, the zIndex is only used to control the order of features within that layer.
				// Long term we need to consider how to handle zIndex ordering across multiple geometry types.
				properties.zIndex = styles.zIndex;

				if (feature.geometry.type === "Point") {
					properties.pointColor = styles.pointColor;
					properties.pointOutlineColor = styles.pointOutlineColor;
					properties.pointOutlineWidth = styles.pointOutlineWidth;
					properties.pointWidth = styles.pointWidth;
					points.push(feature);
				} else if (feature.geometry.type === "LineString") {
					properties.lineStringColor = styles.lineStringColor;
					properties.lineStringWidth = styles.lineStringWidth;
					linestrings.push(feature);
				} else if (feature.geometry.type === "Polygon") {
					properties.polygonFillColor = styles.polygonFillColor;
					properties.polygonFillOpacity = styles.polygonFillOpacity;
					properties.polygonOutlineColor = styles.polygonOutlineColor;
					properties.polygonOutlineWidth = styles.polygonOutlineWidth;
					polygons.push(feature);
				}
			}

			// If deletion occurred we always have to update all layers
			// as we don't know the type (TODO: perhaps we could pass that back?)
			const deletionOccurred = this.changedIds.deletion;
			const styleUpdatedOccurred = this.changedIds.styling;
			const forceUpdate = deletionOccurred || styleUpdatedOccurred;

			// Determine if we need to update each layer by geometry type
			const updatePoints = forceUpdate || this.changedIds.points;
			const updateLineStrings = forceUpdate || this.changedIds.linestrings;
			const updatedPolygon = forceUpdate || this.changedIds.polygons;

			if (updatePoints) {
				this._setGeoJSONLayerData<Point>("Point", points as Feature<Point>[]);
			}

			if (updateLineStrings) {
				this._setGeoJSONLayerData<LineString>(
					"LineString",
					linestrings as Feature<LineString>[],
				);
			}

			if (updatedPolygon) {
				this._setGeoJSONLayerData<Polygon>(
					"Polygon",
					polygons as Feature<Polygon>[],
				);
			}

			// Reset changed ids
			this.changedIds = {
				points: false,
				linestrings: false,
				polygons: false,
				deletion: false,
				styling: false,
			};
		});
	}

	/**
	 * Clears the map and store of all rendered data layers
	 * @returns void
	 * */
	public clear() {
		// If we are not registered, do nothing
		if (!this._currentModeCallbacks) {
			return;
		}

		// Clear up state first
		this._currentModeCallbacks.onClear();

		// TODO: This is necessary to prevent render artifacts, perhaps there is a nicer solution?
		if (this._nextRender) {
			cancelAnimationFrame(this._nextRender);
			this._nextRender = undefined;
		}

		this._setGeoJSONLayerData<Point>("Point", []);

		this._setGeoJSONLayerData<LineString>("LineString", []);

		this._setGeoJSONLayerData<Polygon>("Polygon", []);
	}

	public getCoordinatePrecision(): number {
		return super.getCoordinatePrecision();
	}

	public unregister(): void {
		super.unregister();

		this.changedIds = {
			points: false,
			linestrings: false,
			polygons: false,
			deletion: false,
			styling: false,
		};

		this._map.removeLayer(`${this._prefixId}-point`);
		this._map.removeSource(`${this._prefixId}-point`);
		this._map.removeLayer(`${this._prefixId}-linestring`);
		this._map.removeSource(`${this._prefixId}-linestring`);
		this._map.removeLayer(`${this._prefixId}-polygon`);
		this._map.removeLayer(`${this._prefixId}-polygon-outline`);
		this._map.removeSource(`${this._prefixId}-polygon`);
	}

	public register(callbacks: TerraDrawExtend.TerraDrawCallbacks) {
		super.register(callbacks);

		const polygonStringId = this._addGeoJSONLayer<Polygon>(
			"Polygon",
			[] as Feature<Polygon>[],
		);

		const lineStringId = this._addGeoJSONLayer<LineString>(
			"LineString",
			[] as Feature<LineString>[],
		);

		const pointId = this._addGeoJSONLayer<Point>(
			"Point",
			[] as Feature<Point>[],
		);

		if (this._renderPointsBeforeLayerId) {
			this._map.moveLayer(pointId, this._renderPointsBeforeLayerId);
		}

		if (this._renderLinesBeforeLayerId) {
			this._map.moveLayer(lineStringId, this._renderLinesBeforeLayerId);
			this._map.moveLayer(polygonStringId + "-outline", lineStringId);
		}

		if (this._renderPolygonsBeforeLayerId) {
			this._map.moveLayer(polygonStringId, this._renderPolygonsBeforeLayerId);
		}

		if (this._currentModeCallbacks?.onReady) {
			this._currentModeCallbacks.onReady();
		}
	}
}
