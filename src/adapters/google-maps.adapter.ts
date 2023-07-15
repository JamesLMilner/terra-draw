import {
	TerraDrawAdapterStyling,
	TerraDrawChanges,
	SetCursor,
	TerraDrawStylingFunction,
} from "../common";
import { GeoJsonObject } from "geojson";

import { GeoJSONStoreFeatures } from "../store/store";
import { TerraDrawBaseAdapter } from "./common/base.adapter";

export class TerraDrawGoogleMapsAdapter extends TerraDrawBaseAdapter {
	constructor(config: {
		lib: typeof google.maps;
		map: google.maps.Map;
		coordinatePrecision?: number;
	}) {
		super(config);
		this._lib = config.lib;
		this._map = config.map;
		this._coordinatePrecision =
			typeof config.coordinatePrecision === "number"
				? config.coordinatePrecision
				: 9;

		this._overlay = new this._lib.OverlayView();
		this._overlay.draw = function () {};
		this._overlay.setMap(this._map);
	}

	private _cursor: string | undefined;
	private _cursorStyleSheet: HTMLStyleElement | undefined;
	private _lib: typeof google.maps;
	private _map: google.maps.Map;
	private _layers = false;
	private _overlay: google.maps.OverlayView;

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

	/**
	 * Returns the longitude and latitude coordinates from a given PointerEvent on the map.
	 * @param event The PointerEvent or MouseEvent containing the screen coordinates of the pointer.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude, or null if the conversion is not possible.
	 */
	getLngLatFromEvent(event: PointerEvent | MouseEvent) {
		const bounds = this._map.getBounds();

		if (!bounds) {
			return null;
		}

		const ne = bounds.getNorthEast();
		const sw = bounds.getSouthWest();
		const latLngBounds = new google.maps.LatLngBounds(sw, ne);

		const mapCanvas = this._map.getDiv();
		const offsetX = event.clientX - mapCanvas.getBoundingClientRect().left;
		const offsetY = event.clientY - mapCanvas.getBoundingClientRect().top;
		const screenCoord = new google.maps.Point(offsetX, offsetY);

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
	 * Retrieves the HTML container element of the Leaflet map.
	 * @returns The HTMLElement representing the map container.
	 */
	getMapContainer() {
		return this._map.getDiv();
	}

	/**
	 * Converts longitude and latitude coordinates to pixel coordinates in the map container.
	 * @param lng The longitude coordinate to project.
	 * @param lat The latitude coordinate to project.
	 * @returns An object with 'x' and 'y' properties representing the pixel coordinates within the map container.
	 */
	project(lng: number, lat: number) {
		const bounds = this._map.getBounds();

		if (bounds === undefined) {
			throw new Error("cannot get bounds");
		}

		const northWest = new this._lib.LatLng(
			bounds.getNorthEast().lat(),
			bounds.getSouthWest().lng()
		);

		const projection = this._map.getProjection();
		if (projection === undefined) {
			throw new Error("cannot get projection");
		}

		const projectedNorthWest = projection.fromLatLngToPoint(northWest);
		if (projectedNorthWest === null) {
			throw new Error("cannot get projectedNorthWest");
		}

		const projected = projection.fromLatLngToPoint({ lng, lat });
		if (projected === null) {
			throw new Error("cannot get projected lng lat");
		}

		const zoom = this._map.getZoom();
		if (zoom === undefined) {
			throw new Error("cannot get zoom");
		}

		const scale = Math.pow(2, zoom);
		return {
			x: Math.floor((projected.x - projectedNorthWest.x) * scale),
			y: Math.floor((projected.y - projectedNorthWest.y) * scale),
		};
	}

	/**
	 * Converts pixel coordinates in the map container to longitude and latitude coordinates.
	 * @param x The x-coordinate in the map container to unproject.
	 * @param y The y-coordinate in the map container to unproject.
	 * @returns An object with 'lng' and 'lat' properties representing the longitude and latitude coordinates.
	 */
	unproject(x: number, y: number) {
		const projection = this._map.getProjection();
		if (projection === undefined) {
			throw new Error("cannot get projection");
		}

		const bounds = this._map.getBounds();
		if (bounds === undefined) {
			throw new Error("cannot get bounds");
		}

		const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
		if (topRight === null) {
			throw new Error("cannot get topRight");
		}

		const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
		if (bottomLeft === null) {
			throw new Error("cannot get bottomLeft");
		}

		const zoom = this._map.getZoom();
		if (zoom === undefined) {
			throw new Error("zoom get bounds");
		}

		const scale = Math.pow(2, zoom);

		const worldPoint = new google.maps.Point(
			x / scale + bottomLeft.x,
			y / scale + topRight.y
		);
		const lngLat = projection.fromPointToLatLng(worldPoint);

		if (lngLat === null) {
			throw new Error("zoom get bounds");
		}

		return { lng: lngLat.lng(), lat: lngLat.lat() };
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

			const div = this.getMapContainer();
			const style = document.createElement("style");
			style.type = "text/css";
			const selector = `#${div.id} [aria-label="Map"]`;
			style.innerHTML = `${selector} { cursor: ${cursor} !important; }`;
			document.getElementsByTagName("head")[0].appendChild(style);
			this._cursorStyleSheet = style;
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

	private renderedFeatures: Set<string> = new Set();

	/**
	 * Renders GeoJSON features on the map using the provided styling configuration.
	 * @param changes An object containing arrays of created, updated, and unchanged features to render.
	 * @param styling An object mapping draw modes to feature styling functions
	 */
	render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction) {
		if (this._layers) {
			changes.deletedIds.forEach((deletedId) => {
				const featureToDelete = this._map.data.getFeatureById(deletedId);
				if (featureToDelete) {
					this._map.data.remove(featureToDelete);
					this.renderedFeatures.delete(deletedId);
				}
			});

			changes.updated.forEach((updatedFeature) => {
				if (!updatedFeature || !updatedFeature.id) {
					throw new Error("Feature is not valid");
				}

				const featureToUpdate = this._map.data.getFeatureById(
					updatedFeature.id
				);

				if (!featureToUpdate) {
					throw new Error("Feature could not be found by Google Maps API");
				}

				// Remove all keys
				featureToUpdate.forEachProperty((property, name) => {
					featureToUpdate.setProperty(name, undefined);
				});

				// Update all keys
				Object.keys(updatedFeature.properties).forEach((property) => {
					featureToUpdate.setProperty(
						property,
						updatedFeature.properties[property]
					);
				});

				switch (updatedFeature.geometry.type) {
					case "Point":
						{
							const coordinates = updatedFeature.geometry.coordinates;

							featureToUpdate.setGeometry(
								new google.maps.Data.Point(
									new google.maps.LatLng(coordinates[1], coordinates[0])
								)
							);
						}
						break;
					case "LineString":
						{
							const coordinates = updatedFeature.geometry.coordinates;

							const path = [];
							for (let i = 0; i < coordinates.length; i++) {
								const coordinate = coordinates[i];
								const latLng = new google.maps.LatLng(
									coordinate[1],
									coordinate[0]
								);
								path.push(latLng);
							}

							featureToUpdate.setGeometry(
								new google.maps.Data.LineString(path)
							);
						}
						break;
					case "Polygon":
						{
							const coordinates = updatedFeature.geometry.coordinates;

							const paths = [];
							for (let i = 0; i < coordinates.length; i++) {
								const path = [];
								for (let j = 0; j < coordinates[i].length; j++) {
									const latLng = new google.maps.LatLng(
										coordinates[i][j][1],
										coordinates[i][j][0]
									);
									path.push(latLng);
								}
								paths.push(path);
							}

							featureToUpdate.setGeometry(new google.maps.Data.Polygon(paths));
						}

						break;
				}
			});

			// Create new features
			changes.created.forEach((createdFeature) => {
				this.renderedFeatures.add(createdFeature.id as string);
				this._map.data.addGeoJson(createdFeature);
			});
		} else {
			// Clicking on data geometries triggers
			// swallows the map onclick event,
			// so we need to forward it to the click callback handler
			this._map.data.addListener(
				"click",
				(
					event: google.maps.MapMouseEvent & {
						domEvent: MouseEvent;
					}
				) => {
					const clickListener = this._listeners.find(
						({ name }) => name === "click"
					);
					if (clickListener) {
						clickListener.callback(event);
					}
				}
			);

			this._map.data.addListener(
				"mousemove",
				(
					event: google.maps.MapMouseEvent & {
						domEvent: MouseEvent;
					}
				) => {
					const mouseMoveListener = this._listeners.find(
						({ name }) => name === "mousemove"
					);
					if (mouseMoveListener) {
						mouseMoveListener.callback(event);
					}
				}
			);
		}

		changes.created.forEach((feature) => {
			this.renderedFeatures.add(feature.id as string);
		});

		const featureCollection = {
			type: "FeatureCollection",
			features: [...changes.created],
		} as GeoJsonObject;

		this._map.data.addGeoJson(featureCollection);

		this._map.data.setStyle((feature) => {
			const mode = feature.getProperty("mode");
			const gmGeometry = feature.getGeometry();
			if (!gmGeometry) {
				throw new Error("Google Maps geometry not found");
			}
			const type = gmGeometry.getType();
			const properties: Record<string, any> = {};

			feature.forEachProperty((value, property) => {
				properties[property] = value;
			});

			const calculatedStyles = styling[mode]({
				type: "Feature",
				geometry: {
					type: type as "Point" | "LineString" | "Polygon",
					coordinates: [],
				},
				properties,
			});

			switch (type) {
				case "Point":
					const path = this.circlePath(0, 0, calculatedStyles.pointWidth);

					return {
						clickable: false,
						icon: {
							path,
							fillColor: calculatedStyles.pointColor,
							fillOpacity: 1,
							strokeColor: calculatedStyles.pointOutlineColor,
							strokeWeight: calculatedStyles.pointOutlineWidth,
							rotation: 0,
							scale: 1,
						},
					};

				case "LineString":
					return {
						strokeColor: calculatedStyles.lineStringColor,
						strokeWeight: calculatedStyles.lineStringWidth,
					};
				case "Polygon":
					return {
						strokeColor: calculatedStyles.polygonOutlineColor,
						strokeWeight: calculatedStyles.polygonOutlineWidth,
						fillOpacity: calculatedStyles.polygonFillOpacity,
						fillColor: calculatedStyles.polygonFillColor,
					};
			}

			throw Error("Unknown feature type");
		});

		this._layers = true;
	}

	private clearLayers() {
		if (this._layers) {
			this._map.data.forEach((feature) => {
				const id = feature.getId() as string;
				const hasFeature = this.renderedFeatures.has(id);
				if (hasFeature) {
					this._map.data.remove(feature);
				}
			});
			this.renderedFeatures = new Set();
			this._layers = false;
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
	}
}
