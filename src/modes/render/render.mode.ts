import {
	HexColorStyling,
	NumericStyling,
	TerraDrawAdapterStyling,
} from "../../common";
import { ModeTypes, TerraDrawBaseDrawMode } from "../base.mode";
import { BehaviorConfig } from "../base.behavior";
import { getDefaultStyling } from "../../util/styling";
import { GeoJSONStoreFeatures } from "../../terra-draw";
import { isValidPoint } from "../../geometry/boolean/is-valid-point";
import { isValidPolygonFeature } from "../../geometry/boolean/is-valid-polygon-feature";
import { isValidLineStringFeature } from "../../geometry/boolean/is-valid-linestring-feature";

type RenderModeStyling = {
	pointColor: HexColorStyling;
	pointWidth: NumericStyling;
	pointOutlineColor: HexColorStyling;
	pointOutlineWidth: NumericStyling;
	polygonFillColor: HexColorStyling;
	polygonFillOpacity: NumericStyling;
	polygonOutlineColor: HexColorStyling;
	polygonOutlineWidth: NumericStyling;
	lineStringWidth: NumericStyling;
	lineStringColor: HexColorStyling;
	zIndex: NumericStyling;
};

export class TerraDrawRenderMode extends TerraDrawBaseDrawMode<RenderModeStyling> {
	public type = ModeTypes.Render; // The type of the mode
	public mode = "render"; // This gets changed dynamically

	constructor(options: { styles: Partial<RenderModeStyling> }) {
		super({ styles: options.styles });
	}

	/** @internal */
	registerBehaviors(behaviorConfig: BehaviorConfig) {
		// TODO: this is probably abusing
		// registerBehaviors but it works quite well conceptually

		// We can set the mode name dynamically
		this.mode = behaviorConfig.mode;
	}

	/** @internal */
	start() {
		this.setStarted();
	}

	/** @internal */
	stop() {
		this.setStopped();
	}

	/** @internal */
	onKeyUp() {}

	/** @internal */
	onKeyDown() {}

	/** @internal */
	onClick() {}

	/** @internal */
	onDragStart() {}

	/** @internal */
	onDrag() {}

	/** @internal */
	onDragEnd() {}

	/** @internal */
	onMouseMove() {}

	/** @internal */
	cleanUp() {}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const defaultStyles = getDefaultStyling();

		return {
			pointColor: this.getHexColorStylingValue(
				this.styles.pointColor,
				defaultStyles.pointColor,
				feature
			),
			pointWidth: this.getNumericStylingValue(
				this.styles.pointWidth,
				defaultStyles.pointWidth,
				feature
			),
			pointOutlineColor: this.getHexColorStylingValue(
				this.styles.pointOutlineColor,
				defaultStyles.pointOutlineColor,
				feature
			),
			pointOutlineWidth: this.getNumericStylingValue(
				this.styles.pointOutlineWidth,
				defaultStyles.pointOutlineWidth,
				feature
			),
			polygonFillColor: this.getHexColorStylingValue(
				this.styles.polygonFillColor,
				defaultStyles.polygonFillColor,
				feature
			),
			polygonFillOpacity: this.getNumericStylingValue(
				this.styles.polygonFillOpacity,
				defaultStyles.polygonFillOpacity,
				feature
			),
			polygonOutlineColor: this.getHexColorStylingValue(
				this.styles.polygonOutlineColor,
				defaultStyles.polygonOutlineColor,
				feature
			),
			polygonOutlineWidth: this.getNumericStylingValue(
				this.styles.polygonOutlineWidth,
				defaultStyles.polygonOutlineWidth,
				feature
			),
			lineStringWidth: this.getNumericStylingValue(
				this.styles.lineStringWidth,
				defaultStyles.lineStringWidth,
				feature
			),
			lineStringColor: this.getHexColorStylingValue(
				this.styles.lineStringColor,
				defaultStyles.lineStringColor,
				feature
			),
			zIndex: this.getNumericStylingValue(
				this.styles.zIndex,
				defaultStyles.zIndex,
				feature
			),
		};
	}

	validateFeature(feature: unknown): feature is GeoJSONStoreFeatures {
		return (
			super.validateFeature(feature) &&
			(isValidPoint(feature, this.coordinatePrecision) ||
				isValidPolygonFeature(feature, this.coordinatePrecision) ||
				isValidLineStringFeature(feature, this.coordinatePrecision))
		);
	}
}
