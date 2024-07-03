import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	NumericStyling,
	HexColorStyling,
	Cursor,
	UpdateTypes,
} from "../../common";
import { GeoJSONStoreFeatures } from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { ValidatePointFeature } from "../../validations/point.validation";
import { Point } from "geojson";

type PointModeStyling = {
	pointWidth: NumericStyling;
	pointColor: HexColorStyling;
	pointOutlineColor: HexColorStyling;
	pointOutlineWidth: NumericStyling;
};

interface Cursors {
	create?: Cursor;
}

interface TerraDrawPointModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	cursors?: Cursors;
}

export class TerraDrawPointMode extends TerraDrawBaseDrawMode<PointModeStyling> {
	mode = "point";

	private cursors: Required<Cursors>;

	constructor(options?: TerraDrawPointModeOptions<PointModeStyling>) {
		super(options);
		const defaultCursors = {
			create: "crosshair",
		} as Required<Cursors>;

		if (options && options.cursors) {
			this.cursors = { ...defaultCursors, ...options.cursors };
		} else {
			this.cursors = defaultCursors;
		}
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setCursor(this.cursors.create);
	}

	/** @internal */
	stop() {
		this.cleanUp();
		this.setStopped();
		this.setCursor("unset");
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		if (!this.store) {
			throw new Error("Mode must be registered first");
		}

		const geometry = {
			type: "Point",
			coordinates: [event.lng, event.lat],
		} as Point;

		const properties = { mode: this.mode };

		if (this.validate) {
			const valid = this.validate(
				{
					type: "Feature",
					geometry,
					properties,
				} as GeoJSONStoreFeatures,
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

		const [pointId] = this.store.create([{ geometry, properties }]);

		// Ensure that any listerers are triggered with the main created geometry
		this.onFinish(pointId, { mode: this.mode, action: "draw" });
	}

	/** @internal */
	onMouseMove() {}

	/** @internal */
	onKeyDown() {}

	/** @internal */
	onKeyUp() {}

	/** @internal */
	cleanUp() {}

	/** @internal */
	onDragStart() {}

	/** @internal */
	onDrag() {}

	/** @internal */
	onDragEnd() {}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.type === "Feature" &&
			feature.geometry.type === "Point" &&
			feature.properties.mode === this.mode
		) {
			styles.pointWidth = this.getNumericStylingValue(
				this.styles.pointWidth,
				styles.pointWidth,
				feature,
			);

			styles.pointColor = this.getHexColorStylingValue(
				this.styles.pointColor,
				styles.pointColor,
				feature,
			);

			styles.pointOutlineColor = this.getHexColorStylingValue(
				this.styles.pointOutlineColor,
				styles.pointOutlineColor,
				feature,
			);

			styles.pointOutlineWidth = this.getNumericStylingValue(
				this.styles.pointOutlineWidth,
				2,
				feature,
			);

			styles.zIndex = 30;
		}

		return styles;
	}

	validateFeature(feature: unknown): feature is GeoJSONStoreFeatures {
		if (super.validateFeature(feature)) {
			return (
				feature.properties.mode === this.mode &&
				ValidatePointFeature(feature, this.coordinatePrecision)
			);
		} else {
			return false;
		}
	}
}
