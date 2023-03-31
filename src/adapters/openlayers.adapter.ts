import {
	TerraDrawAdapterStyling,
	TerraDrawChanges,
	SetCursor,
} from "../common";
import { GeoJSONStoreFeatures } from "../store/store";
import CircleGeom from "ol/geom/Circle";
import Feature, { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
import Geometry from "ol/geom/Geometry";
import { TerraDrawAdapterBase } from "./common/base-adapter";

type InjectableOL = {
	Circle: typeof CircleGeom;
	Feature: typeof Feature;
	GeoJSON: typeof GeoJSON;
	Style: typeof Style;
	CircleStyle: typeof Circle;
	VectorLayer: typeof VectorLayer;
	VectorSource: typeof VectorSource;
	Stroke: typeof Stroke;
	toLonLat: typeof toLonLat;
};

export class TerraDrawOpenLayersAdapter extends TerraDrawAdapterBase {
	constructor(config: {
		map: Map;
		lib: InjectableOL;
		coordinatePrecision?: number;
	}) {
		super(config);

		this._map = config.map;
		this._lib = config.lib;

		this._coordinatePrecision =
			typeof config.coordinatePrecision === "number"
				? config.coordinatePrecision
				: 9;

		// TODO: Is this the best way to recieve keyboard events
		this.getMapContainer().setAttribute("tabindex", "0");
	}

	private _lib: InjectableOL;
	private _map: Map;
	private _projection = "EPSG:3857";
	private _vectorSource: undefined | VectorSource<Geometry>;
	private _geoJSONReader: undefined | GeoJSON;

	private HexToRGB(hex: string): { r: number; g: number; b: number } {
		return {
			r: parseInt(hex.slice(1, 3), 16),
			g: parseInt(hex.slice(3, 5), 16),
			b: parseInt(hex.slice(5, 7), 16),
		};
	}

	private getStyles(feature: FeatureLike, styling: any) {
		const geometry = feature.getGeometry();
		if (!geometry) {
			return;
		}
		const key = geometry.getType() as "Point" | "LineString" | "Polygon";

		return {
			Point: (feature: FeatureLike) => {
				const properties = feature.getProperties();
				const style = styling[properties.mode]({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties,
				});
				return new this._lib.Style({
					image: new Circle({
						radius: style.pointWidth,
						fill: new Fill({
							color: style.pointColor,
						}),
						stroke: new Stroke({
							color: style.pointOutlineColor,
							width: style.pointOutlineWidth,
						}),
					}),
				});
			},
			LineString: (feature: FeatureLike) => {
				const properties = feature.getProperties();
				const style = styling[properties.mode]({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties,
				});
				return new this._lib.Style({
					stroke: new this._lib.Stroke({
						color: style.lineStringColor,
						width: style.lineStringWidth,
					}),
				});
			},
			Polygon: (feature: FeatureLike) => {
				const properties = feature.getProperties();
				const style = styling[properties.mode]({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties,
				});
				const { r, g, b } = this.HexToRGB(style.polygonFillColor);

				return new Style({
					stroke: new Stroke({
						color: style.polygonOutlineColor,
						width: style.polygonOutlineWidth,
					}),
					fill: new Fill({
						color: `rgba(${r},${g},${b},${style.polygonFillOpacity})`,
					}),
				});
			},
		}[key](feature);
	}

	private addFeature(feature: GeoJSONStoreFeatures) {
		if (this._vectorSource && this._geoJSONReader) {
			const olFeature = this._geoJSONReader.readFeature(feature, {
				featureProjection: this._projection,
			});
			this._vectorSource.addFeature(olFeature);
		} else {
			throw new Error("Vector Source not initalised");
		}
	}

	private removeFeature(id: string) {
		if (this._vectorSource) {
			const deleted = this._vectorSource.getFeatureById(id);
			if (!deleted) {
				return;
			}
			this._vectorSource.removeFeature(deleted);
		} else {
			throw new Error("Vector Source not initalised");
		}
	}

	public getLngLatFromEvent(event: PointerEvent | MouseEvent) {
		const container = this.getMapContainer();
		const x = event.clientX - container.offsetLeft;
		const y = event.clientY - container.offsetTop;

		return this.unproject(x, y);
	}

	public setDraggability(enabled: boolean) {
		this._map.getInteractions().forEach((interaction) => {
			if (interaction.constructor.name === "DragPan") {
				interaction.setActive(enabled);
			}
		});
	}

	public getMapContainer() {
		return this._map.getViewport();
	}

	public project(lng: number, lat: number) {
		const [x, y] = this._map.getPixelFromCoordinate(fromLonLat([lng, lat]));
		return { x, y };
	}

	public unproject(x: number, y: number) {
		const [lng, lat] = toLonLat(this._map.getCoordinateFromPixel([x, y]));
		return { lng, lat };
	}

	public setCursor(cursor: Parameters<SetCursor>[0]) {
		if (cursor === "unset") {
			this.getMapContainer().style.removeProperty("cursor");
		} else {
			this.getMapContainer().style.cursor = cursor;
		}
	}

	public setDoubleClickToZoom(enabled: boolean) {
		this._map.getInteractions().forEach(function (interaction) {
			if (interaction.constructor.name === "DoubleClickZoom") {
				interaction.setActive(enabled);
			}
		});
	}

	public render(
		changes: TerraDrawChanges,
		styling: {
			[mode: string]: (
				feature: GeoJSONStoreFeatures
			) => TerraDrawAdapterStyling;
		}
	) {
		if (!this._vectorSource) {
			this._geoJSONReader = new this._lib.GeoJSON();

			const vectorSourceFeatures = this._geoJSONReader.readFeatures(
				{
					type: "FeatureCollection",
					features: [
						...changes.created,
						...changes.updated,
						...changes.unchanged,
					],
				},
				{ featureProjection: this._projection }
			);
			const vectorSource = new this._lib.VectorSource({
				features: vectorSourceFeatures,
			});

			this._vectorSource = vectorSource;

			const vectorLayer = new this._lib.VectorLayer({
				source: vectorSource,
				style: (feature) => this.getStyles(feature, styling),
			});

			this._map.addLayer(vectorLayer);
		} else {
			const source = this._vectorSource;

			if (!source) {
				throw new Error("Vector Layer source has disappeared");
			}

			changes.deletedIds.forEach((id) => {
				this.removeFeature(id);
			});

			changes.updated.forEach((feature) => {
				this.removeFeature(feature.id as string);
				this.addFeature(feature);
			});

			changes.created.forEach((feature) => {
				this.addFeature(feature);
			});
		}
	}
}
