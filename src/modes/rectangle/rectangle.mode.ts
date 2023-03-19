import { Position } from "geojson";
import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColor,
} from "../../common";
import { GeoJSONStoreFeatures } from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import { TerraDrawBaseDrawMode } from "../base.mode";

type TerraDrawRectangleModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

type FreehandPolygonStyling = {
	fillColor: HexColor;
	outlineColor: HexColor;
	outlineWidth: number;
	fillOpacity: number;
};

export class TerraDrawRectangleMode extends TerraDrawBaseDrawMode<FreehandPolygonStyling> {
	mode = "rectangle";
	private center: Position | undefined;
	private clickCount = 0;
	private currentRectangleId: string | undefined;
	private keyEvents: TerraDrawRectangleModeKeyEvents;

	constructor(options?: {
		styles?: Partial<FreehandPolygonStyling>;
		keyEvents?: TerraDrawRectangleModeKeyEvents | null;
	}) {
		super(options);
		// We want to have some defaults, but also allow key bindings
		// to be explicitly turned off
		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else {
			const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };
			this.keyEvents =
				options && options.keyEvents
					? { ...defaultKeyEvents, ...options.keyEvents }
					: defaultKeyEvents;
		}
	}

	private close() {
		this.center = undefined;
		this.currentRectangleId = undefined;
		this.clickCount = 0;
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setCursor("crosshair");
	}

	/** @internal */
	stop() {
		this.setStopped();
		this.setCursor("unset");
		this.cleanUp();
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		if (this.clickCount === 0) {
			this.center = [event.lng, event.lat];
			const [createdId] = this.store.create([
				{
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[event.lng, event.lat],
								[event.lng, event.lat],
								[event.lng, event.lat],
								[event.lng, event.lat],
							],
						],
					},
					properties: {
						mode: this.mode,
					},
				},
			]);
			this.currentRectangleId = createdId;
			this.clickCount++;
		} else {
			// Finish drawing
			this.close();
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		if (this.clickCount === 1 && this.center && this.currentRectangleId) {
			const geometry = this.store.getGeometryCopy(this.currentRectangleId);

			const firstCoord = (geometry.coordinates as Position[][])[0][0];

			this.store.updateGeometry([
				{
					id: this.currentRectangleId,
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								firstCoord,
								[event.lng, firstCoord[1]],
								[event.lng, event.lat],
								[firstCoord[0], event.lat],
								firstCoord,
							],
						],
					},
				},
			]);
		}
	}

	/** @internal */
	onKeyDown() {}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		} else if (event.key === this.keyEvents.finish) {
			this.close();
		}
	}

	/** @internal */
	onDragStart() {}

	/** @internal */
	onDrag() {}

	/** @internal */
	onDragEnd() {}

	/** @internal */
	cleanUp() {
		try {
			if (this.currentRectangleId) {
				this.store.delete([this.currentRectangleId]);
			}
		} catch (error) {}
		this.center = undefined;
		this.currentRectangleId = undefined;
		this.clickCount = 0;
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.type === "Feature" &&
			feature.geometry.type === "Polygon" &&
			feature.properties.mode === this.mode
		) {
			if (this.styles.fillColor) {
				styles.polygonFillColor = this.styles.fillColor;
			}
			if (this.styles.outlineColor) {
				styles.polygonOutlineColor = this.styles.outlineColor;
			}
			if (this.styles.outlineWidth) {
				styles.polygonOutlineWidth = this.styles.outlineWidth;
			}
			if (this.styles.fillOpacity) {
				styles.polygonFillOpacity = this.styles.fillOpacity;
			}

			return styles;
		}

		return styles;
	}
}
