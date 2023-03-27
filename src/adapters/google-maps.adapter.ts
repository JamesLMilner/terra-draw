import {
	TerraDrawAdapterStyling,
	TerraDrawChanges,
	SetCursor,
} from "../common";
import { GeoJsonObject } from "geojson";

import { GeoJSONStoreFeatures } from "../store/store";
import { TerraDrawAdapterBase } from "./common/base-adapter";

export class TerraDrawGoogleMapsAdapter extends TerraDrawAdapterBase {
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

		this.overlay = new this._lib.OverlayView();
		this.overlay.draw = function () {};
		this.overlay.setMap(this._map);
	}

	private _cursor: string | undefined;
	private _cursorStyleSheet: HTMLStyleElement | undefined;
	private _lib: typeof google.maps;
	private _map: google.maps.Map;
	private _layers = false;
	private overlay: google.maps.OverlayView;

	// https://stackoverflow.com/a/27905268/1363484
	private circlePath(cx: number, cy: number, r: number) {
		return (
			"M " +
			cx +
			" " +
			cy +
			" m -" +
			r +
			", 0 a " +
			r +
			"," +
			r +
			" 0 1,0 " +
			r * 2 +
			",0 a " +
			r +
			"," +
			r +
			" 0 1,0 -" +
			r * 2 +
			",0"
		);
	}

	getLngLatFromPointerEvent(event: PointerEvent) {
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

		const latLng = this.overlay
			.getProjection()
			.fromContainerPixelToLatLng(screenCoord);

		if (latLng && latLngBounds.contains(latLng)) {
			return { lng: latLng.lng(), lat: latLng.lat() };
		} else {
			return null;
		}
	}

	getMapContainer() {
		return this._map.getDiv();
	}

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

	setDoubleClickToZoom(enabled: boolean) {
		if (enabled) {
			this._map.setOptions({ disableDoubleClickZoom: false });
		} else {
			this._map.setOptions({ disableDoubleClickZoom: true });
		}
	}

	setDraggability(enabled: boolean) {
		this._map.setOptions({ draggable: enabled });
	}

	render(
		changes: TerraDrawChanges,
		styling: {
			[mode: string]: (
				feature: GeoJSONStoreFeatures
			) => TerraDrawAdapterStyling;
		}
	) {
		if (this._layers) {
			changes.deletedIds.forEach((deletedId) => {
				const featureToDelete = this._map.data.getFeatureById(deletedId);
				featureToDelete && this._map.data.remove(featureToDelete);
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
					const clickListener = this.listeners.find(
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
					const mouseMoveListener = this.listeners.find(
						({ name }) => name === "mousemove"
					);
					if (mouseMoveListener) {
						mouseMoveListener.callback(event);
					}
				}
			);
		}

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
}
