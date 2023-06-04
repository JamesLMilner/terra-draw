import {
	TerraDrawChanges,
	SetCursor,
	TerraDrawStylingFunction,
} from "../common";
import { Feature, LineString, Point, Polygon } from "geojson";
import mapboxgl, {
	CircleLayer,
	FillLayer,
	LineLayer,
	PointLike,
} from "mapbox-gl";
import { GeoJSONStoreFeatures, GeoJSONStoreGeometries } from "../store/store";
import { TerraDrawBaseAdapter } from "./common/base.adapter";

export class TerraDrawMapboxGLAdapter extends TerraDrawBaseAdapter {
	constructor(config: { map: mapboxgl.Map; coordinatePrecision?: number }) {
		super(config);

		this._map = config.map;
		this._container = this._map.getContainer();
	}

	private _nextRender: any;
	private _map: mapboxgl.Map;
	private _container: HTMLElement;
	private _rendered = false;

	/**
	 * Clears the map of rendered layers and sources
	 * @returns void
	 * */
	private clearLayers() {
		if (this._rendered) {
			Object.keys(["point", "linestring", "polygon"]).forEach((geometryKey) => {
				const id = `td-${geometryKey.toLowerCase()}`;
				this._map.removeLayer(id);

				// Special case for polygons as it has another id for the outline
				// that we need to make sure we remove
				if (geometryKey === "polygonId") {
					this._map.removeLayer(id + "-outline");
				}
				this._map.removeSource(id);
			});

			this._rendered = false;
		}
	}

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
			// No need for filters as style is driven by properties
			paint: {
				"fill-color": ["get", "polygonFillColor"],
				"fill-opacity": ["get", "polygonFillOpacity"],
			},
		} as FillLayer);
	}

	private _addFillOutlineLayer(id: string, beneath?: string) {
		const layer = this._map.addLayer({
			id: id + "-outline",
			source: id,
			type: "line",
			// No need for filters as style is driven by properties
			paint: {
				"line-width": ["get", "polygonOutlineWidth"],
				"line-color": ["get", "polygonOutlineColor"],
			},
		} as LineLayer);

		if (beneath) {
			this._map.moveLayer(id, beneath);
		}

		return layer;
	}

	private _addLineLayer(id: string, beneath?: string) {
		const layer = this._map.addLayer({
			id,
			source: id,
			type: "line",
			// No need for filters as style is driven by properties
			paint: {
				"line-width": ["get", "lineStringWidth"],
				"line-color": ["get", "lineStringColor"],
			},
		} as LineLayer);

		if (beneath) {
			this._map.moveLayer(id, beneath);
		}

		return layer;
	}

	private _addPointLayer(id: string, beneath?: string) {
		const layer = this._map.addLayer({
			id,
			source: id,
			type: "circle",
			// No need for filters as style is driven by properties
			paint: {
				"circle-stroke-color": ["get", "pointOutlineColor"],
				"circle-stroke-width": ["get", "pointOutlineWidth"],
				"circle-radius": ["get", "pointWidth"],
				"circle-color": ["get", "pointColor"],
			},
		} as CircleLayer);
		if (beneath) {
			this._map.moveLayer(id, beneath);
		}
		return layer;
	}

	private _addLayer(
		id: string,
		featureType: "Point" | "LineString" | "Polygon",
		beneath?: string
	) {
		if (featureType === "Point") {
			this._addPointLayer(id, beneath);
		}
		if (featureType === "LineString") {
			this._addLineLayer(id, beneath);
		}
		if (featureType === "Polygon") {
			this._addFillLayer(id);
			this._addFillOutlineLayer(id, beneath);
		}
	}

	private _addGeoJSONLayer<T extends GeoJSONStoreGeometries>(
		featureType: Feature<T>["geometry"]["type"],
		features: Feature<T>[]
	) {
		const id = `td-${featureType.toLowerCase()}`;
		this._addGeoJSONSource(id, features);
		this._addLayer(id, featureType);

		return id;
	}

	private _setGeoJSONLayerData<T extends GeoJSONStoreGeometries>(
		featureType: Feature<T>["geometry"]["type"],
		features: Feature<T>[]
	) {
		const id = `td-${featureType.toLowerCase()}`;
		(this._map.getSource(id) as any).setData({
			type: "FeatureCollection",
			features: features,
		});
		return id;
	}

	/**
	 * Returns the longitude and latitude coordinates from a given PointerEvent on the map.
	 * @param event The PointerEvent or MouseEvent  containing the screen coordinates of the pointer.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude, or null if the conversion is not possible.
	 */
	public getLngLatFromEvent(event: PointerEvent | MouseEvent) {
		const { left, top } = this.getMapContainer().getBoundingClientRect();
		const x = event.clientX - left;
		const y = event.clientY - top;

		return this.unproject(x, y);
	}

	/**
	 * Retrieves the HTML container element of the Leaflet map.
	 * @returns The HTMLElement representing the map container.
	 */
	public getMapContainer() {
		return this._container;
	}

	/**
	 * Enables or disables the draggable functionality of the map.
	 * @param enabled Set to true to enable map dragging, or false to disable it.
	 */
	public setDraggability(enabled: boolean) {
		if (enabled) {
			this._map.dragPan.enable();
		} else {
			this._map.dragPan.disable();
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
	public setCursor(style: Parameters<SetCursor>[0]) {
		this._map.getCanvas().style.cursor = style;
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
		if (this._nextRender) {
			cancelAnimationFrame(this._nextRender);
		}

		// Because Mapbox GL makes us pass in a full re-render of alll the features
		// we can do debounce rendering to only render the last render in a given
		// frame bucket (16ms)

		this._nextRender = requestAnimationFrame(() => {
			const features = [
				...changes.created,
				...changes.updated,
				...changes.unchanged,
			];

			const geometryFeatures: {
				points: GeoJSONStoreFeatures[];
				linestrings: GeoJSONStoreFeatures[];
				polygons: GeoJSONStoreFeatures[];
			} = {
				points: [],
				linestrings: [],
				polygons: [],
			};

			for (let i = 0; i < features.length; i++) {
				const feature = features[i];

				Object.keys(styling).forEach((mode) => {
					const { properties } = feature;

					if (properties.mode !== mode) {
						return;
					}

					const styles = styling[mode](feature);

					if (feature.geometry.type === "Point") {
						properties.pointColor = styles.pointColor;
						properties.pointOutlineColor = styles.pointOutlineColor;
						properties.pointOutlineWidth = styles.pointOutlineWidth;
						properties.pointWidth = styles.pointWidth;
						geometryFeatures.points.push(feature);
					} else if (feature.geometry.type === "LineString") {
						properties.lineStringColor = styles.lineStringColor;
						properties.lineStringWidth = styles.lineStringWidth;
						geometryFeatures.linestrings.push(feature);
					} else if (feature.geometry.type === "Polygon") {
						properties.polygonFillColor = styles.polygonFillColor;
						properties.polygonFillOpacity = styles.polygonFillOpacity;
						properties.polygonOutlineColor = styles.polygonOutlineColor;
						properties.polygonOutlineWidth = styles.polygonOutlineWidth;
						geometryFeatures.polygons.push(feature);
					}
				});
			}

			const { points, linestrings, polygons } = geometryFeatures;

			if (!this._rendered) {
				this._addGeoJSONLayer<Point>("Point", points as Feature<Point>[]);
				this._addGeoJSONLayer<LineString>(
					"LineString",
					linestrings as Feature<LineString>[]
				);
				this._addGeoJSONLayer<Polygon>(
					"Polygon",
					polygons as Feature<Polygon>[]
				);
				this._rendered = true;
			} else {
				const deletionOccured = changes.deletedIds.length > 0;

				let pointId;

				if (deletionOccured || points.length) {
					pointId = this._setGeoJSONLayerData<Point>(
						"Point",
						points as Feature<Point>[]
					);
				}

				if (deletionOccured || linestrings.length) {
					this._setGeoJSONLayerData<LineString>(
						"LineString",
						linestrings as Feature<LineString>[]
					);
				}

				if (deletionOccured || polygons.length) {
					this._setGeoJSONLayerData<Polygon>(
						"Polygon",
						polygons as Feature<Polygon>[]
					);
				}

				// TODO: This logic could be better - I think this will render the selection points above user
				// defined layers outside of TerraDraw which is perhaps unideal

				// Ensure selection/mid points are rendered on top
				pointId && this._map.moveLayer(pointId);
			}
			// });

			// TODO: Figure out why this was added?
			// Probably to do with forcing style changes?
			// if ((this._map as any).style) {
			//     // cancel the scheduled update
			//     if ((this._map as any)._frame) {
			//         (this._map as any)._frame.cancel();
			//         (this._map as any)._frame = null;
			//     }
			//     (this._map as any)._render();
			// }
			// this._nextRender = undefined;
		});
	}

	/**
	 * Clears the map and store of all rendered data layers
	 * @returns void
	 * */
	public clear() {
		if (this._currentModeCallbacks) {
			// Clear up state first
			this._currentModeCallbacks.onClear();

			// Then clean up rendering
			this.clearLayers();
		}
	}
}
