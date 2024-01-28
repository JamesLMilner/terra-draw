import { Position } from "geojson";
import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
} from "../../common";
import { FeatureId, GeoJSONStoreFeatures } from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { isValidNonIntersectingPolygonFeature } from "../../geometry/boolean/is-valid-polygon-feature";

type TerraDrawRectangleModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

type RectanglePolygonStyling = {
	fillColor: HexColorStyling;
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	fillOpacity: NumericStyling;
};

interface Cursors {
	start?: Cursor;
}

interface TerraDrawRectangleModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	keyEvents?: TerraDrawRectangleModeKeyEvents | null;
	cursors?: Cursors;
}

export class TerraDrawRectangleMode extends TerraDrawBaseDrawMode<RectanglePolygonStyling> {
	mode = "rectangle";
	private center: Position | undefined;
	private clickCount = 0;
	private currentRectangleId: FeatureId | undefined;
	private keyEvents: TerraDrawRectangleModeKeyEvents;
	private cursors: Required<Cursors>;

	constructor(
		options?: TerraDrawRectangleModeOptions<RectanglePolygonStyling>,
	) {
		super(options);

		const defaultCursors = {
			start: "crosshair",
		} as Required<Cursors>;

		if (options && options.cursors) {
			this.cursors = { ...defaultCursors, ...options.cursors };
		} else {
			this.cursors = defaultCursors;
		}

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

	private updateRectangle(event: TerraDrawMouseEvent) {
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

	private close() {
		const finishedId = this.currentRectangleId;
		this.center = undefined;
		this.currentRectangleId = undefined;
		this.clickCount = 0;
		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		finishedId && this.onFinish(finishedId);
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setCursor(this.cursors.start);
	}

	/** @internal */
	stop() {
		this.cleanUp();
		this.setStopped();
		this.setCursor("unset");
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
			this.setDrawing();
		} else {
			this.updateRectangle(event);
			// Finish drawing
			this.close();
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.updateRectangle(event);
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
		if (this.currentRectangleId) {
			this.store.delete([this.currentRectangleId]);
		}

		this.center = undefined;
		this.currentRectangleId = undefined;
		this.clickCount = 0;
		if (this.state === "drawing") {
			this.setStarted();
		}
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.type === "Feature" &&
			feature.geometry.type === "Polygon" &&
			feature.properties.mode === this.mode
		) {
			styles.polygonFillColor = this.getHexColorStylingValue(
				this.styles.fillColor,
				styles.polygonFillColor,
				feature,
			);

			styles.polygonOutlineColor = this.getHexColorStylingValue(
				this.styles.outlineColor,
				styles.polygonOutlineColor,
				feature,
			);

			styles.polygonOutlineWidth = this.getNumericStylingValue(
				this.styles.outlineWidth,
				styles.polygonOutlineWidth,
				feature,
			);

			styles.polygonFillOpacity = this.getNumericStylingValue(
				this.styles.fillOpacity,
				styles.polygonFillOpacity,
				feature,
			);

			return styles;
		}

		return styles;
	}

	validateFeature(feature: unknown): feature is GeoJSONStoreFeatures {
		if (super.validateFeature(feature)) {
			return (
				feature.properties.mode === this.mode &&
				isValidNonIntersectingPolygonFeature(feature, this.coordinatePrecision)
			);
		} else {
			return false;
		}
	}
}
