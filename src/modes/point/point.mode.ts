import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	HexColor,
	SELECT_PROPERTIES,
} from "../../common";
import { GeoJSONStoreFeatures } from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import { TerraDrawBaseDrawMode } from "../base.mode";
import { isValidPoint } from "../../geometry/boolean/is-valid-point";

type PointModeStyling = {
	pointWidth: number;
	pointColor: HexColor;
	pointOutlineColor: HexColor;
	pointOutlineWidth: number;
	selectedPointWidth: number;
	selectedPointColor: HexColor;
	selectedPointOutlineColor: HexColor;
	selectedPointOutlineWidth: number;
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
			if (feature.properties[SELECT_PROPERTIES.SELECTED]) {
				styles.pointColor = this.styles.selectedPointColor
					? this.styles.selectedPointColor
					: styles.pointColor;

				styles.pointOutlineColor = this.styles.selectedPointOutlineColor
					? this.styles.selectedPointOutlineColor
					: styles.pointOutlineColor;

				styles.pointOutlineWidth = this.styles.selectedPointOutlineWidth
					? this.styles.selectedPointOutlineWidth
					: 2;

				styles.pointWidth = this.styles.selectedPointWidth
					? this.styles.selectedPointWidth
					: styles.pointWidth;
			} else {
				styles.pointColor = this.styles.pointColor
					? this.styles.pointColor
					: styles.pointColor;

				styles.pointOutlineColor = this.styles.pointOutlineColor
					? this.styles.pointOutlineColor
					: styles.pointOutlineColor;

				styles.pointOutlineWidth = this.styles.pointOutlineWidth
					? this.styles.pointOutlineWidth
					: styles.pointOutlineWidth;

				styles.pointWidth = this.styles.pointWidth
					? this.styles.pointWidth
					: styles.pointWidth;
			}

			return styles;
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
