import { Position } from "geojson";
import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
} from "../../common";
import { haversineDistanceKilometers } from "../../geometry/measure/haversine-distance";
import { circle } from "../../geometry/shape/create-circle";
import { FeatureId, GeoJSONStoreFeatures } from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { isValidNonIntersectingPolygonFeature } from "../../geometry/boolean/is-valid-polygon-feature";

type TerraDrawCircleModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

type CirclePolygonStyling = {
	fillColor: HexColorStyling;
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	fillOpacity: NumericStyling;
};

interface Cursors {
	start?: Cursor;
}

interface TerraDrawCircleModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	keyEvents?: TerraDrawCircleModeKeyEvents | null;
	cursors?: Cursors;
}

export class TerraDrawCircleMode extends TerraDrawBaseDrawMode<CirclePolygonStyling> {
	mode = "circle";
	private center: Position | undefined;
	private clickCount = 0;
	private currentCircleId: FeatureId | undefined;
	private keyEvents: TerraDrawCircleModeKeyEvents;
	private cursors: Required<Cursors>;

	constructor(options?: TerraDrawCircleModeOptions<CirclePolygonStyling>) {
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

	private close() {
		if (this.currentCircleId === undefined) {
			return;
		}

		const finishedId = this.currentCircleId;

		this.center = undefined;
		this.currentCircleId = undefined;
		this.clickCount = 0;
		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		// Ensure that any listerers are triggered with the main created geometry
		this.onFinish(finishedId);
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
			const startingCircle = circle({
				center: this.center,
				radiusKilometers: 0.00001,
				coordinatePrecision: this.coordinatePrecision,
			});

			const [createdId] = this.store.create([
				{
					geometry: startingCircle.geometry,
					properties: {
						mode: this.mode,
					},
				},
			]);
			this.currentCircleId = createdId;
			this.clickCount++;
			this.setDrawing();
		} else {
			if (
				this.clickCount === 1 &&
				this.center &&
				this.currentCircleId !== undefined
			) {
				this.createCircle(event);
			}

			// Finish drawing
			this.close();
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.createCircle(event);
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
			if (this.currentCircleId !== undefined) {
				this.store.delete([this.currentCircleId]);
			}
		} catch (error) {}
		this.center = undefined;
		this.currentCircleId = undefined;
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

	private createCircle(event: TerraDrawMouseEvent) {
		if (this.clickCount === 1 && this.center && this.currentCircleId) {
			const distanceKm = haversineDistanceKilometers(this.center, [
				event.lng,
				event.lat,
			]);

			const updatedCircle = circle({
				center: this.center,
				radiusKilometers: distanceKm,
				coordinatePrecision: this.coordinatePrecision,
			});

			this.store.updateGeometry([
				{ id: this.currentCircleId, geometry: updatedCircle.geometry },
			]);
		}
	}
}
