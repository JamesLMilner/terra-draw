import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	NumericStyling,
	HexColorStyling,
} from "../../common";
import { GeoJSONStoreFeatures } from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import { TerraDrawBaseDrawMode } from "../base.mode";
import { isValidPoint } from "../../geometry/boolean/is-valid-point";

type PointModeStyling = {
	pointWidth: NumericStyling;
	pointColor: HexColorStyling;
	pointOutlineColor: HexColorStyling;
	pointOutlineWidth: NumericStyling;
};
export class TerraDrawPointMode extends TerraDrawBaseDrawMode<PointModeStyling> {
	mode = "point";

	constructor(options?: { styles?: Partial<PointModeStyling> }) {
		super(options);
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setCursor("crosshair");
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

		const [pointId] = this.store.create([
			{
				geometry: {
					type: "Point",
					coordinates: [event.lng, event.lat],
				},
				properties: { mode: this.mode },
			},
		]);

		// Ensure that any listerers are triggered with the main created geometry
		this.onFinish(pointId);
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
				feature
			);

			styles.pointColor = this.getHexColorStylingValue(
				this.styles.pointColor,
				styles.pointColor,
				feature
			);

			styles.pointOutlineColor = this.getHexColorStylingValue(
				this.styles.pointOutlineColor,
				styles.pointOutlineColor,
				feature
			);

			styles.pointOutlineWidth = this.getNumericStylingValue(
				this.styles.pointOutlineWidth,
				2,
				feature
			);
		}

		return styles;
	}

	validateFeature(feature: unknown): feature is GeoJSONStoreFeatures {
		if (super.validateFeature(feature)) {
			return (
				feature.properties.mode === this.mode &&
				isValidPoint(feature, this.coordinatePrecision)
			);
		} else {
			return false;
		}
	}
}
