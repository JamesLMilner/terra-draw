import {
	TerraDrawCallbacks,
	TerraDrawAdapter,
	TerraDrawModeRegisterConfig,
	TerraDrawAdapterStyling,
	TerraDrawChanges,
} from "../common";
import { Map } from "maplibre-gl";
import { GeoJSONStoreFeatures } from "../store/store";
import { TerraDrawMapboxGLAdapter } from "./mapbox-gl.adapter";
import { AdapterListener } from "./common/adapter-listener";

export class TerraDrawMapLibreGLAdapter implements TerraDrawAdapter {
	private mapboxglAdapter: TerraDrawMapboxGLAdapter;

	constructor(config: { map: Map; coordinatePrecision?: number }) {
		// At the moment the APIs of MapboxGL and MapLibre are so compatible that
		// there is not need to bother completely reimplementing the internals of the adapter.
		// This may change over time and gives us a shell to allow for rewriting the internals
		// of the adapter should the MapboxGL and MapbLibre APIs diverge in the instances where
		// we rely on them.
		this.mapboxglAdapter = new TerraDrawMapboxGLAdapter(
			config as {
				map: any; //
				coordinatePrecision: number;
			}
		);
		this.unproject = this.mapboxglAdapter.unproject;
		this.project = this.mapboxglAdapter.project;
		this.setCursor = this.mapboxglAdapter.setCursor;
		this.getMapContainer = this.mapboxglAdapter.getMapContainer;
		this.setDoubleClickToZoom = this.mapboxglAdapter.setDoubleClickToZoom;
	}

	setDoubleClickToZoom: TerraDrawModeRegisterConfig["setDoubleClickToZoom"];
	unproject: TerraDrawModeRegisterConfig["unproject"];
	project: TerraDrawModeRegisterConfig["project"];
	setCursor: TerraDrawModeRegisterConfig["setCursor"];
	getMapContainer: () => HTMLElement;

	register(callbacks: TerraDrawCallbacks) {
		this.mapboxglAdapter.register(callbacks);
	}

	unregister() {
		this.mapboxglAdapter.unregister();
	}

	render(
		changes: TerraDrawChanges,
		styling: {
			[mode: string]: (
				feature: GeoJSONStoreFeatures
			) => TerraDrawAdapterStyling;
		}
	) {
		this.mapboxglAdapter.render(changes, styling);
	}
}
