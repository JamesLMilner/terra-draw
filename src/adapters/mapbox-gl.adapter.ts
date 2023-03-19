import {
	TerraDrawCallbacks,
	TerraDrawAdapter,
	TerraDrawModeRegisterConfig,
	TerraDrawAdapterStyling,
	TerraDrawChanges,
	TerraDrawMouseEvent,
} from "../common";
import { Feature, LineString, Point, Polygon } from "geojson";
import { limitPrecision } from "../geometry/limit-decimal-precision";
import mapboxgl, {
	CircleLayer,
	FillLayer,
	LineLayer,
	PointLike,
} from "mapbox-gl";
import { GeoJSONStoreFeatures, GeoJSONStoreGeometries } from "../store/store";
import { AdapterListener } from "./common/adapter-listener";

export class TerraDrawMapboxGLAdapter implements TerraDrawAdapter {
	constructor(config: { map: mapboxgl.Map; coordinatePrecision?: number }) {
		this._map = config.map;
		this._coordinatePrecision =
			typeof config.coordinatePrecision === "number"
				? config.coordinatePrecision
				: 9;

		this.project = (lng: number, lat: number) => {
			const { x, y } = this._map.project({ lng, lat });
			return { x, y };
		};

		this.unproject = (x: number, y: number) => {
			const { lng, lat } = this._map.unproject({ x, y } as PointLike);
			return { lng, lat };
		};

		this.setCursor = (style) => {
			this._map.getCanvas().style.cursor = style;
		};

		this.getMapContainer = () => {
			return this._map.getContainer();
		};

		this.setDoubleClickToZoom = (enabled: boolean) => {
			if (enabled) {
				this._map.doubleClickZoom.enable();
			} else {
				this._map.doubleClickZoom.disable();
			}
		};

		this._listeners = [
			new AdapterListener({
				name: "click",
				callback: (event) => {
					if (!this._currentModeCallbacks) return;

					this._currentModeCallbacks.onClick({
						lng: limitPrecision(event.lngLat.lng, this._coordinatePrecision),
						lat: limitPrecision(event.lngLat.lat, this._coordinatePrecision),
						containerX:
							event.originalEvent.clientX - this.getMapContainer().offsetLeft,
						containerY:
							event.originalEvent.clientY - this.getMapContainer().offsetTop,
						button: event.originalEvent.button === 0 ? "left" : "right",
						heldKeys: [...this._heldKeys],
					});
				},
				register: (callback) => {
					return [
						this._map.on("click", callback),
						this._map.on("contextmenu", callback),
					];
				},
				unregister: (listeners: any[]) => {
					listeners.forEach((listener) => {
						this._map.off("contextmenu", listener);
						this._map.off("click", listener);
					});
				},
			}),
			new AdapterListener({
				name: "mousemove",
				callback: (event) => {
					if (!this._currentModeCallbacks) return;

					this._currentModeCallbacks.onMouseMove({
						lng: limitPrecision(event.lngLat.lng, this._coordinatePrecision),
						lat: limitPrecision(event.lngLat.lat, this._coordinatePrecision),
						containerX:
							event.originalEvent.clientX - this.getMapContainer().offsetLeft,
						containerY:
							event.originalEvent.clientY - this.getMapContainer().offsetTop,
						button: event.originalEvent.button === 0 ? "left" : "right",
						heldKeys: [...this._heldKeys],
					});
				},
				register: (callback) => {
					return [this._map.on("mousemove", callback)];
				},
				unregister: (listeners: any[]) => {
					listeners.forEach((listener) => {
						this._map.off("mousemove", listener);
					});
				},
			}),
			new AdapterListener({
				name: "mousedown",
				callback: (event) => {
					this.dragState = "pre-dragging";
				},
				register: (callback) => {
					const container = this.getMapContainer();

					return [container.addEventListener("mousedown", callback)];
				},
				unregister: (listeners: any[]) => {
					const container = this.getMapContainer();

					listeners.forEach((listener) => {
						container.removeEventListener("mousedown", listener);
					});
				},
			}),
			new AdapterListener({
				name: "drag",
				callback: (event) => {
					if (!this._currentModeCallbacks) return;

					const container = this.getMapContainer();

					const { lng, lat } = this._map.unproject({
						x: event.clientX - container.offsetLeft,
						y: event.clientY - container.offsetTop,
					} as any);

					const drawEvent: TerraDrawMouseEvent = {
						lng: limitPrecision(lng, this._coordinatePrecision),
						lat: limitPrecision(lat, this._coordinatePrecision),
						containerX: event.clientX - container.offsetLeft,
						containerY: event.clientY - container.offsetTop,
						button: event.button === 0 ? "left" : "right",
						heldKeys: [...this._heldKeys],
					};

					if (this.dragState === "pre-dragging") {
						this.dragState = "dragging";

						this._currentModeCallbacks.onDragStart(drawEvent, (enabled) => {
							if (enabled) {
								this._map.dragPan.enable();
							} else {
								this._map.dragPan.disable();
							}
						});
					} else if (this.dragState === "dragging") {
						this._currentModeCallbacks.onDrag(drawEvent);
					}
				},
				register: (callback) => {
					const container = this.getMapContainer();
					return [container.addEventListener("mousemove", callback)];
				},
				unregister: (listeners: any[]) => {
					const container = this.getMapContainer();
					listeners.forEach((listener) => {
						container.addEventListener("mousemove", listener);
					});
				},
			}),
			new AdapterListener({
				name: "mouseup",
				callback: (event) => {
					if (!this._currentModeCallbacks) return;
					const container = this.getMapContainer();

					if (this.dragState === "dragging") {
						const point = {
							x: event.clientX - container.offsetLeft,
							y: event.clientY - container.offsetTop,
						} as mapboxgl.Point;

						const { lng, lat } = this._map.unproject(point);

						this._currentModeCallbacks.onDragEnd(
							{
								lng: limitPrecision(lng, this._coordinatePrecision),
								lat: limitPrecision(lat, this._coordinatePrecision),
								containerX: event.clientX - container.offsetLeft,
								containerY: event.clientY - container.offsetTop,
								button: event.button === 0 ? "left" : "right",
								heldKeys: [...this._heldKeys],
							},
							(enabled) => {
								if (enabled) {
									this._map.dragPan.enable();
								} else {
									this._map.dragPan.disable();
								}
							}
						);
					}

					this.dragState = "not-dragging";
				},
				register: (callback) => {
					const container = this.getMapContainer();

					return [container.addEventListener("mouseup", callback)];
				},
				unregister: (listeners: any[]) => {
					const container = this.getMapContainer();

					listeners.forEach((listener) => {
						container.addEventListener("mouseup", listener);
					});
				},
			}),
			new AdapterListener({
				name: "keyup",
				callback: (event) => {
					if (!this._currentModeCallbacks) return;

					// map has no keypress event, so we add one to the canvas itself
					event.preventDefault();

					this._heldKeys.delete(event.key);

					this._currentModeCallbacks.onKeyUp({
						key: event.key,
					});
				},
				register: (callback) => {
					const container = this.getMapContainer();

					return [container.addEventListener("keyup", callback)];
				},
				unregister: (listeners: any[]) => {
					const container = this.getMapContainer();

					listeners.forEach((listener) => {
						container.removeEventListener("keyup", listener);
					});
				},
			}),
			new AdapterListener({
				name: "keydown",
				callback: (event: KeyboardEvent) => {
					if (!this._currentModeCallbacks) return;

					event.preventDefault();

					this._heldKeys.add(event.key);

					this._currentModeCallbacks.onKeyDown({
						key: event.key,
					});
				},
				register: (callback) => {
					const container = this.getMapContainer();

					return [container.addEventListener("keydown", callback)];
				},
				unregister: (listeners: any[]) => {
					const container = this.getMapContainer();

					listeners.forEach((listener) => {
						container.removeEventListener("keydown", listener);
					});
				},
			}),
		];
	}

	private dragState: "not-dragging" | "pre-dragging" | "dragging" =
		"not-dragging";

	public setDoubleClickToZoom: TerraDrawModeRegisterConfig["setDoubleClickToZoom"];
	public unproject: TerraDrawModeRegisterConfig["unproject"];
	public project: TerraDrawModeRegisterConfig["project"];
	public setCursor: TerraDrawModeRegisterConfig["setCursor"];

	public getMapContainer: () => HTMLElement;

	private _listeners: AdapterListener[] = [];
	private _currentModeCallbacks: TerraDrawCallbacks | undefined;
	private _heldKeys: Set<string> = new Set();
	private _coordinatePrecision: number;
	private _map: mapboxgl.Map;
	private _rendered: Record<string, boolean> = {};

	private _addGeoJSONSource(id: string, features: Feature[]) {
		this._map.addSource(id, {
			type: "geojson",
			data: {
				type: "FeatureCollection",
				features: features,
			},
		});
	}

	private _addFillLayer(id: string, mode: string) {
		return this._map.addLayer({
			id,
			source: id,
			type: "fill",
			filter: [
				"all",
				["match", ["geometry-type"], "Polygon", true, false],
				["match", ["get", "mode"], mode, true, false],
			],
			paint: {
				"fill-color": ["get", "polygonFillColor"],
				"fill-opacity": ["get", "polygonFillOpacity"],
			},
		} as FillLayer);
	}

	private _addFillOutlineLayer(id: string, mode: string, beneath?: string) {
		const layer = this._map.addLayer({
			id: id + "outline",
			source: id,
			type: "line",
			filter: [
				"all",
				["match", ["geometry-type"], "Polygon", true, false],
				["match", ["get", "mode"], mode, true, false],
			],
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

	private _addLineLayer(id: string, mode: string, beneath?: string) {
		const layer = this._map.addLayer({
			id,
			source: id,
			type: "line",
			filter: [
				"all",
				["match", ["geometry-type"], "LineString", true, false],
				["match", ["get", "mode"], mode, true, false],
			],
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

	private _addPointLayer(id: string, mode: string, beneath?: string) {
		const layer = this._map.addLayer({
			id,
			source: id,
			type: "circle",
			filter: [
				"all",
				["match", ["geometry-type"], "Point", true, false],
				["match", ["get", "mode"], mode, true, false],
			],
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
		mode: string,
		featureType: "Point" | "LineString" | "Polygon",
		beneath?: string
	) {
		if (featureType === "Point") {
			this._addPointLayer(id, mode, beneath);
		}
		if (featureType === "LineString") {
			this._addLineLayer(id, mode, beneath);
		}
		if (featureType === "Polygon") {
			this._addFillLayer(id, mode);
			this._addFillOutlineLayer(id, mode, beneath);
		}
	}

	private _addGeoJSONLayer<T extends GeoJSONStoreGeometries>(
		mode: string,
		featureType: Feature<T>["geometry"]["type"],
		features: Feature<T>[]
	) {
		const id = `td-${mode}-${featureType.toLowerCase()}`;
		this._addGeoJSONSource(id, features);
		this._addLayer(id, mode, featureType);

		return id;
	}

	private _setGeoJSONLayerData<T extends GeoJSONStoreGeometries>(
		mode: string,
		featureType: Feature<T>["geometry"]["type"],
		features: Feature<T>[]
	) {
		const id = `td-${mode}-${featureType.toLowerCase()}`;
		(this._map.getSource(id) as any).setData({
			type: "FeatureCollection",
			features: features,
		});
		return id;
	}

	register(callbacks: TerraDrawCallbacks) {
		this._currentModeCallbacks = callbacks;

		this._listeners.forEach((listener) => {
			listener.register();
		});
	}

	unregister() {
		this._listeners.forEach((listener) => {
			listener.unregister();
		});
	}

	render(
		changes: TerraDrawChanges,
		styling: {
			[mode: string]: (
				feature: GeoJSONStoreFeatures
			) => TerraDrawAdapterStyling;
		}
	) {
		const features = [
			...changes.created,
			...changes.updated,
			...changes.unchanged,
		];

		const modeFeatures: {
			[key: string]: {
				points: GeoJSONStoreFeatures[];
				linestrings: GeoJSONStoreFeatures[];
				polygons: GeoJSONStoreFeatures[];
			};
		} = {};

		Object.keys(styling).forEach((mode) => {
			if (!modeFeatures[mode]) {
				modeFeatures[mode] = {
					points: [],
					linestrings: [],
					polygons: [],
				};
			}
		});

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
					modeFeatures[mode].points.push(feature);
				} else if (feature.geometry.type === "LineString") {
					properties.lineStringColor = styles.lineStringColor;
					properties.lineStringWidth = styles.lineStringWidth;
					modeFeatures[mode].linestrings.push(feature);
				} else if (feature.geometry.type === "Polygon") {
					properties.polygonFillColor = styles.polygonFillColor;
					properties.polygonFillOpacity = styles.polygonFillOpacity;
					properties.polygonOutlineColor = styles.polygonOutlineColor;
					properties.polygonOutlineWidth = styles.polygonOutlineWidth;
					modeFeatures[mode].polygons.push(feature);
				}
			});
		}

		Object.keys(styling).forEach((mode) => {
			if (!modeFeatures[mode]) {
				return;
			}

			const { points, linestrings, polygons } = modeFeatures[mode];

			if (!this._rendered[mode]) {
				this._addGeoJSONLayer<Point>(mode, "Point", points as Feature<Point>[]);
				this._addGeoJSONLayer<LineString>(
					mode,
					"LineString",
					linestrings as Feature<LineString>[]
				);
				this._addGeoJSONLayer<Polygon>(
					mode,
					"Polygon",
					polygons as Feature<Polygon>[]
				);
				this._rendered[mode] = true;
			} else {
				const pointId = this._setGeoJSONLayerData<Point>(
					mode,
					"Point",
					points as Feature<Point>[]
				);
				this._setGeoJSONLayerData<LineString>(
					mode,
					"LineString",
					linestrings as Feature<LineString>[]
				);
				this._setGeoJSONLayerData<Polygon>(
					mode,
					"Polygon",
					polygons as Feature<Polygon>[]
				);

				// TODO: This logic could be better - I think this will render the selection points above user
				// defined layers outside of TerraDraw which is perhaps unideal

				// Ensure selection/mid points are rendered on top
				this._map.moveLayer(pointId);
			}
		});

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
	}
}
