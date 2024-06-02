import { Position } from "geojson";
import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
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
import { ValidateNonIntersectingPolygonFeature } from "../../validations/polygon.validation";
import { Polygon } from "geojson";

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
	startingRadiusKilometers?: number;
}

export class TerraDrawCircleMode extends TerraDrawBaseDrawMode<CirclePolygonStyling> {
	mode = "circle";
	private center: Position | undefined;
	private clickCount = 0;
	private currentCircleId: FeatureId | undefined;
	private keyEvents: TerraDrawCircleModeKeyEvents;
	private cursors: Required<Cursors>;
	private startingRadiusKilometers = 0.00001;

	/**
	 * Create a new circle mode instance
	 * @param options - Options to customize the behavior of the circle mode
	 * @param options.keyEvents - Key events to cancel or finish the mode
	 * @param options.cursors - Cursors to use for the mode
	 * @param options.styles - Custom styling for the circle
	 * @param options.pointerDistance - Distance in pixels to consider a pointer close to a vertex
	 */
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

		this.startingRadiusKilometers =
			options?.startingRadiusKilometers ?? 0.00001;
		this.validate = options?.validation;
	}

	private close() {
		if (this.currentCircleId === undefined) {
			return;
		}

		const finishedId = this.currentCircleId;

		if (this.validate && finishedId) {
			const currentGeometry = this.store.getGeometryCopy<Polygon>(finishedId);

			const valid = this.validate(
				{
					type: "Feature",
					id: finishedId,
					geometry: currentGeometry,
					properties: {},
				},
				{
					project: this.project,
					unproject: this.unproject,
					coordinatePrecision: this.coordinatePrecision,
					updateType: UpdateTypes.Finish,
				},
			);

			if (!valid) {
				return;
			}
		}

		this.center = undefined;
		this.currentCircleId = undefined;
		this.clickCount = 0;
		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		// Ensure that any listerers are triggered with the main created geometry
		this.onFinish(finishedId, { mode: this.mode, action: "draw" });
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
				radiusKilometers: this.startingRadiusKilometers,
				coordinatePrecision: this.coordinatePrecision,
			});

			const [createdId] = this.store.create([
				{
					geometry: startingCircle.geometry,
					properties: {
						mode: this.mode,
						radiusKilometers: this.startingRadiusKilometers,
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
				this.updateCircle(event);
			}

			// Finish drawing
			this.close();
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.updateCircle(event);
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
				ValidateNonIntersectingPolygonFeature(feature, this.coordinatePrecision)
			);
		} else {
			return false;
		}
	}

	private updateCircle(event: TerraDrawMouseEvent) {
		if (this.clickCount === 1 && this.center && this.currentCircleId) {
			const newRadius = haversineDistanceKilometers(this.center, [
				event.lng,
				event.lat,
			]);

			const updatedCircle = circle({
				center: this.center,
				radiusKilometers: newRadius,
				coordinatePrecision: this.coordinatePrecision,
			});

			if (this.validate) {
				const valid = this.validate(
					{
						type: "Feature",
						id: this.currentCircleId,
						geometry: updatedCircle.geometry,
						properties: {
							radiusKilometers: newRadius,
						},
					},
					{
						project: this.project,
						unproject: this.unproject,
						coordinatePrecision: this.coordinatePrecision,
						updateType: UpdateTypes.Provisional,
					},
				);

				if (!valid) {
					return;
				}
			}

			this.store.updateGeometry([
				{ id: this.currentCircleId, geometry: updatedCircle.geometry },
			]);
			this.store.updateProperty([
				{
					id: this.currentCircleId,
					property: "radiusKilometers",
					value: newRadius,
				},
			]);
		}
	}
}
