/**
 * @module terra-draw-google-maps-adapter
 */
import {
	TerraDrawChanges,
	SetCursor,
	TerraDrawStylingFunction,
	TerraDrawExtend,
	GeoJSONStoreFeatures,
} from "terra-draw";

import { GeoJsonObject } from "geojson";
import { JSONObject } from "terra-draw/src/store/store";

export class TerraDrawGoogleMapsAdapter extends TerraDrawExtend.TerraDrawBaseAdapter {
	constructor(
		config: {
			lib: typeof google.maps;
			map: google.maps.Map;
		} & TerraDrawExtend.BaseAdapterConfig,
	) {
		super(config);
		this._lib = config.lib;
		this._map = config.map;

		this._coordinatePrecision =
			typeof config.coordinatePrecision === "number"
				? config.coordinatePrecision
				: 9;
	}

	private _cursor: string | undefined;
	private _cursorStyleSheet: HTMLStyleElement | undefined;
	private _lib: typeof google.maps;
	private _map: google.maps.Map;
	private _overlay: google.maps.OverlayView | undefined;
	private _clickEventListener: google.maps.MapsEventListener | undefined;
	private _mouseMoveEventListener: google.maps.MapsEventListener | undefined;
	private _readyCalled = false;

	private get _hasRenderedFeatures(): boolean {
		return Boolean(this.renderedFeatureIds?.size > 0);
	}

	/**
	 * Generates an SVG path string for a circle with the given center coordinates and radius.
	 * Based off this StackOverflow answer: https://stackoverflow.com/a/27905268/1363484
	 * @param cx The x-coordinate of the circle's center.
	 * @param cy The y-coordinate of the circle's center.
	 * @param r The radius of the circle.
	 * @returns The SVG path string representing the circle.
	 */
	private circlePath(cx: number, cy: number, r: number) {
		const d = r * 2;
		return `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,0 ${d},0 a ${r},${r} 0 1,0 -${d},0`;
	}

	public register(callbacks: TerraDrawExtend.TerraDrawCallbacks) {
		super.register(callbacks);

		// The overlay is responsible for allow us to
		// get the projection, which in turn allows us to
		// go through lng/lat to pixel space and vice versa
		this._overlay = new this._lib.OverlayView();
		this._overlay.draw = function () {
			// No-op
		};

		// Unfortunately it is only ready after the onAdd
		// method is called, which is why we need to use the 'ready'
		// listener with the Google Maps adapter
		this._overlay.onAdd = () => {
			if (this._currentModeCallbacks?.onReady && !this._readyCalled) {
				this._currentModeCallbacks.onReady();
				this._readyCalled = true;
			}
		};
		this._overlay.setMap(this._map);

		// Required to avoid runtime error in Google Maps API
		this._overlay.onRemove = () => {
			// No-op
		};

		// Clicking on data geometries triggers
		// swallows the map onclick event,
		// so we need to forward it to the click callback handler
		this._clickEventListener = this._map.data.addListener(
			"click",
			(
				event: google.maps.MapMouseEvent & {
					domEvent: MouseEvent;
				},
			) => {
				const clickListener = this._listeners.find(
					({ name }) => name === "click",
				);
				if (clickListener) {
					clickListener.callback(event);
				}
			},
		);

		this._mouseMoveEventListener = this._map.data.addListener(
			"mousemove",
			(
				event: google.maps.MapMouseEvent & {
					domEvent: MouseEvent;
				},
			) => {
				const mouseMoveListener = this._listeners.find(
					({ name }) => name === "mousemove",
				);
				if (mouseMoveListener) {
					mouseMoveListener.callback(event);
				}
			},
		);
	}

	private styling: TerraDrawStylingFunction | undefined;

	private style(feature: google.maps.Data.Feature) {
		if (!this.styling) {
			throw new Error("Styling function not defined");
		}

		const id = String(feature.getId());

		// Style callback has been called for a feature that is not rendered
		if (!this.renderedFeatureIds.has(id as string)) {
			return {};
		}

		const mode = feature.getProperty("mode") as string;
		const gmGeometry = feature.getGeometry();
		if (!gmGeometry) {
			throw new Error("Google Maps geometry not found");
		}
		const type = gmGeometry.getType();
		const properties: Record<string, any> = {};

		feature.forEachProperty((value, property) => {
			properties[property] = value;
		});

		const calculatedStyles = this.styling[mode]({
			type: "Feature",
			id,
			geometry: {
				type: type as "Point" | "LineString" | "Polygon",
				coordinates: [],
			},
			properties,
		});

		switch (type) {
			case "Point":
				if (calculatedStyles.markerUrl) {
					return {
						clickable: false,
						icon: {
							url: calculatedStyles.markerUrl as string,
							scaledSize:
								calculatedStyles.markerWidth && calculatedStyles.markerHeight
									? new this._lib.Size(
											calculatedStyles.markerWidth,
											calculatedStyles.markerHeight,
										)
									: undefined,
						},
						zIndex: calculatedStyles.zIndex,
					};
				}

				const path = this.circlePath(0, 0, calculatedStyles.pointWidth);

				// Backwards compatible read: pre Terra Draw v1.24.0 will not have this field in the interface
				const strokeOpacity = (
					calculatedStyles as { pointOutlineOpacity?: number }
				).pointOutlineOpacity;
				const fillOpacity = (calculatedStyles as { pointOpacity?: number })
					.pointOpacity;

				return {
					clickable: false,
					icon: {
						path,
						fillColor: calculatedStyles.pointColor,
						fillOpacity: fillOpacity === undefined ? 1 : fillOpacity,
						strokeColor: calculatedStyles.pointOutlineColor,
						strokeWeight: calculatedStyles.pointOutlineWidth,
						strokeOpacity: strokeOpacity === undefined ? 1 : strokeOpacity,
						rotation: 0,
						scale: 1,
					},
					zIndex: calculatedStyles.zIndex,
				};

			case "LineString":
				// Backwards compatible read: pre Terra Draw v1.24.0 will not have this field in the interface
				const lineStringOpacity = (
					calculatedStyles as { lineStringOpacity?: number }
				).lineStringOpacity;

				return {
					strokeColor: calculatedStyles.lineStringColor,
					strokeWeight: calculatedStyles.lineStringWidth,
					strokeOpacity:
						lineStringOpacity === undefined ? 1 : lineStringOpacity,
					zIndex: calculatedStyles.zIndex,
				};
			case "Polygon":
				const polygonOutlineOpacity = (
					calculatedStyles as { polygonOutlineOpacity?: number }
				).polygonOutlineOpacity;

				return {
					strokeColor: calculatedStyles.polygonOutlineColor,
					strokeWeight: calculatedStyles.polygonOutlineWidth,
					strokeOpacity:
						polygonOutlineOpacity === undefined ? 1 : polygonOutlineOpacity,
					fillOpacity: calculatedStyles.polygonFillOpacity,
					fillColor: calculatedStyles.polygonFillColor,
					zIndex: calculatedStyles.zIndex,
				};
		}

		throw Error("Unknown feature type");
	}

	public unregister(): void {
		super.unregister();
		this._clickEventListener?.remove();
		this._mouseMoveEventListener?.remove();

		if (this._overlay && this._overlay.getMap()) {
			this._overlay.setMap(null);
		}
		this._overlay = undefined;
		this._readyCalled = false;
	}

	/**
	 * Returns the longitude and latitude coordinates from a given PointerEvent on the map.
	 * @param event The PointerEvent or MouseEvent containing the screen coordinates of the pointer.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude, or null if the conversion is not possible.
	 */
	getLngLatFromEvent(event: PointerEvent | MouseEvent) {
		if (!this._overlay) {
			throw new Error("cannot get overlay");
		}

		const bounds = this._map.getBounds();

		if (!bounds) {
			return null;
		}

		const ne = bounds.getNorthEast();
		const sw = bounds.getSouthWest();
		const latLngBounds = new this._lib.LatLngBounds(sw, ne);

		const mapCanvasRect = this.getBoundingMapElement(
			this._map,
		).getBoundingClientRect();
		const offsetX = event.clientX - mapCanvasRect.left;
		const offsetY = event.clientY - mapCanvasRect.top;
		const screenCoord = new this._lib.Point(offsetX, offsetY);

		const projection = this._overlay.getProjection();
		if (!projection) {
			return null;
		}

		const latLng = projection.fromContainerPixelToLatLng(screenCoord);

		if (latLng && latLngBounds.contains(latLng)) {
			return { lng: latLng.lng(), lat: latLng.lat() };
		} else {
			return null;
		}
	}

	/**
	 * Returns the containing parent element to do lng/lat calculations from
	 *
	 * Defaults here should work well for most use-cases, but in the case of a map loaded by
	 * a fullscreen parent element (think custom button bar above a full-screen map),
	 * overrides by a custom adapter become possible
	 *
	 * @param map
	 * @returns
	 */
	getBoundingMapElement(map: google.maps.Map) {
		// In fullscreen mode, use coordinates relative to the fullscreen element
		return document.fullscreenElement ?? map.getDiv();
	}

	/**
	 * Retrieves the HTML element of the Google Map element that handles interaction events
	 * @returns The HTMLElement representing the map container.
	 */
	public getMapEventElement(
		eventType?: // TODO: Import TerraDrawHandledEvents - however is a breaking change currently
		| "pointerdown"
			| "pointerup"
			| "pointermove"
			| "contextmenu"
			| "keyup"
			| "keydown",
	): HTMLElement {
		if (eventType && (eventType === "keyup" || eventType === "keydown")) {
			return this._map.getDiv();
		}

		// TODO: This is a bit hacky, maybe there is a better solution here
		const selector = 'div[style*="z-index: 3;"]';
		return this._map.getDiv().querySelector(selector) as HTMLDivElement;
	}

	/**
	 * Converts longitude and latitude coordinates to pixel coordinates in the map container.
	 * @param lng The longitude coordinate to project.
	 * @param lat The latitude coordinate to project.
	 * @returns An object with 'x' and 'y' properties representing the pixel coordinates within the map container.
	 */
	project(lng: number, lat: number) {
		if (!this._overlay) {
			throw new Error("cannot get overlay");
		}

		const bounds = this._map.getBounds();

		if (bounds === undefined) {
			throw new Error("cannot get bounds");
		}

		const projection = this._overlay.getProjection();
		if (projection === undefined) {
			throw new Error("cannot get projection");
		}

		const point = projection.fromLatLngToContainerPixel(
			new this._lib.LatLng(lat, lng),
		);

		if (point === null) {
			throw new Error("cannot project coordinates");
		}

		return { x: point.x, y: point.y };
	}

	/**
	 * Converts pixel coordinates in the map container to longitude and latitude coordinates.
	 * @param x The x-coordinate in the map container to unproject.
	 * @param y The y-coordinate in the map container to unproject.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude coordinates.
	 */
	unproject(x: number, y: number) {
		if (!this._overlay) {
			throw new Error("cannot get overlay");
		}

		const projection = this._overlay.getProjection();
		if (projection === undefined) {
			throw new Error("cannot get projection");
		}

		const latLng = projection.fromContainerPixelToLatLng(
			new this._lib.Point(x, y),
		);

		if (latLng === null) {
			throw new Error("cannot unproject coordinates");
		}

		return { lng: latLng.lng(), lat: latLng.lat() };
	}

	/**
	 * Sets the cursor style for the map container.
	 * @param cursor The CSS cursor style to apply, or 'unset' to remove any previously applied cursor style.
	 */
	setCursor(cursor: Parameters<SetCursor>[0]) {
		if (cursor === this._cursor) {
			return;
		}

		if (this._cursorStyleSheet) {
			this._cursorStyleSheet.remove();
			this._cursorStyleSheet = undefined;
		}

		if (cursor !== "unset") {
			// TODO: We could cache these individually per cursor

			const div = this._map.getDiv();
			const styleDiv = div.querySelector(".gm-style > div");

			if (styleDiv) {
				styleDiv.classList.add("terra-draw-google-maps");

				const style = document.createElement("style");
				style.innerHTML = `.terra-draw-google-maps { cursor: ${cursor} !important; }`;
				document.getElementsByTagName("head")[0].appendChild(style);
				this._cursorStyleSheet = style;
			}
		}

		this._cursor = cursor;
	}

	/**
	 * Enables or disables the double-click to zoom functionality on the map.
	 * @param enabled Set to true to enable double-click to zoom, or false to disable it.
	 */
	setDoubleClickToZoom(enabled: boolean) {
		if (enabled) {
			this._map.setOptions({ disableDoubleClickZoom: false });
		} else {
			this._map.setOptions({ disableDoubleClickZoom: true });
		}
	}

	/**
	 * Enables or disables the draggable functionality of the map.
	 * @param enabled Set to true to enable map dragging, or false to disable it.
	 */
	setDraggability(enabled: boolean) {
		this._map.setOptions({ draggable: enabled });
	}

	private renderedFeatureIds: Set<TerraDrawExtend.FeatureId> = new Set();

	/**
	 * Renders GeoJSON features on the map using the provided styling configuration.
	 * Schedules actual mutations into requestAnimationFrame, applying:
	 * deletes -> updates -> creates
	 */
	render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction) {
		this.styling = styling;

		if (!this._map.data.getStyle()) {
			this._map.data.setStyle((feature) => this.style(feature));
		}

		// Ensure scheduler state exists
		if (!this._rafState) {
			this._rafState = {
				rafId: null as number | null,
				pending: {
					deletedIds: [] as string[],
					updated: [] as GeoJSONStoreFeatures[],
					created: [] as GeoJSONStoreFeatures[],
				},
				// Used to coalesce changes within a frame
				deletedSet: new Set<string>(),
				updatedById: new Map<string, GeoJSONStoreFeatures>(),
				createdById: new Map<string, GeoJSONStoreFeatures>(),
			};
		}

		// ---- Queue up changes for the next animation frame ----
		// Deleted
		for (const id of changes.deletedIds) {
			// If something is deleted, it shouldn't also be created/updated in same frame.
			this._rafState.deletedSet.add(id as string);
			this._rafState.updatedById.delete(id as string);
			this._rafState.createdById.delete(id as string);
		}

		// Updated
		for (const feature of changes.updated) {
			if (!feature?.id) throw new Error("Feature is not valid");

			const id = String(feature.id);
			if (this._rafState.deletedSet.has(id)) continue; // delete wins

			// If it was created this frame, treat as "create with latest data"
			if (this._rafState.createdById.has(id)) {
				this._rafState.createdById.set(id, feature);
			} else {
				this._rafState.updatedById.set(id, feature); // latest update wins
			}
		}

		// Created
		for (const feature of changes.created) {
			if (!feature?.id) throw new Error("Feature is not valid");

			const id = String(feature.id);
			if (this._rafState.deletedSet.has(id)) continue; // delete wins

			this._rafState.createdById.set(id, feature); // latest create wins
			this._rafState.updatedById.delete(id); // creation supersedes update in same frame
		}

		// Schedule a flush if not already scheduled
		if (this._rafState.rafId == null) {
			this._rafState.rafId = requestAnimationFrame(() => {
				if (!this._rafState) return;

				this._rafState.rafId = null;

				// Snapshot + clear (so new renders can queue while we flush)
				const deletedIds = Array.from(this._rafState.deletedSet);
				const updated = Array.from(this._rafState.updatedById.values());
				const created = Array.from(this._rafState.createdById.values());

				this._rafState!.deletedSet.clear();
				this._rafState!.updatedById.clear();
				this._rafState!.createdById.clear();

				// ---- Apply chronologically: deletes -> updates -> creates ----
				if (this._hasRenderedFeatures) {
					// Deletes
					for (const deletedId of deletedIds) {
						const featureToDelete = this._map.data.getFeatureById(deletedId);
						if (featureToDelete) {
							this._map.data.remove(featureToDelete);
							this.renderedFeatureIds.delete(deletedId);
						}
					}

					// Updates
					for (const updatedFeature of updated) {
						if (!updatedFeature?.id) throw new Error("Feature is not valid");

						const featureToUpdate = this._map.data.getFeatureById(
							String(updatedFeature.id),
						);

						if (!featureToUpdate) {
							throw new Error("Feature could not be found by Google Maps API");
						}

						// Remove all keys
						featureToUpdate.forEachProperty((_property, name) => {
							featureToUpdate.setProperty(name, undefined);
						});

						// Update all keys
						Object.keys(updatedFeature.properties).forEach((property) => {
							featureToUpdate.setProperty(
								property,
								(updatedFeature.properties as JSONObject)[property],
							);
						});

						switch (updatedFeature.geometry.type) {
							case "Point": {
								const coordinates = updatedFeature.geometry.coordinates;
								featureToUpdate.setGeometry(
									new this._lib.Data.Point(
										new this._lib.LatLng(coordinates[1], coordinates[0]),
									),
								);
								break;
							}
							case "LineString": {
								const coordinates = updatedFeature.geometry.coordinates;
								const path: google.maps.LatLng[] = [];
								for (let i = 0; i < coordinates.length; i++) {
									const [lng, lat] = coordinates[i];
									path.push(new this._lib.LatLng(lat, lng));
								}
								featureToUpdate.setGeometry(
									new this._lib.Data.LineString(path),
								);
								break;
							}
							case "Polygon": {
								const coordinates = updatedFeature.geometry.coordinates;
								const paths: google.maps.LatLng[][] = [];
								for (let i = 0; i < coordinates.length; i++) {
									const ring: google.maps.LatLng[] = [];
									for (let j = 0; j < coordinates[i].length; j++) {
										const [lng, lat] = coordinates[i][j];
										ring.push(new this._lib.LatLng(lat, lng));
									}
									paths.push(ring);
								}
								featureToUpdate.setGeometry(new this._lib.Data.Polygon(paths));
								break;
							}
						}
					}

					// Creates
					for (const createdFeature of created) {
						this.renderedFeatureIds.add(String(createdFeature.id));
						this._map.data.addGeoJson(createdFeature);
					}
				} else {
					// First render: treat everything as a feature collection create
					const features: GeoJSONStoreFeatures[] = [];

					// (If you want deletes/updates to matter before first render, you can filter here,
					// but usually first render is only creates.)
					for (const feature of created) {
						this.renderedFeatureIds.add(String(feature.id));
						features.push(feature);
					}

					if (features.length) {
						this._map.data.addGeoJson({
							type: "FeatureCollection",
							features,
						} as GeoJsonObject);
					}
				}
			});
		}
	}

	// Put this on the class:
	private _rafState?: {
		rafId: number | null;
		pending: {
			deletedIds: string[];
			updated: GeoJSONStoreFeatures[];
			created: GeoJSONStoreFeatures[];
		};
		deletedSet: Set<string>;
		updatedById: Map<string, GeoJSONStoreFeatures>;
		createdById: Map<string, GeoJSONStoreFeatures>;
	};

	private clearLayers() {
		if (this._hasRenderedFeatures) {
			this._map.data.forEach((feature) => {
				const id = feature.getId() as string;
				const hasFeature = this.renderedFeatureIds.has(id);
				if (hasFeature) {
					this._map.data.remove(feature);
				}
			});
			this.renderedFeatureIds = new Set();
		}
	}

	/**
	 * Clears the map and store of all rendered data layers
	 * @returns void
	 * */
	public clear() {
		if (this._currentModeCallbacks) {
			// Clean up state first
			this._currentModeCallbacks.onClear();

			// Then clean up rendering
			this.clearLayers();
		}

		// clean up any styles set on the default data layer
		if (this._map.data) {
			this._map.data.setStyle(null);
		}
	}

	public getCoordinatePrecision(): number {
		// TODO: It seems this shouldn't be necessary as extends BaseAdapter which as this method
		return super.getCoordinatePrecision();
	}
}
