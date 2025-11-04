import {
	HexColorStyling,
	NumericStyling,
	TerraDrawAdapterStyling,
} from "../../common";
import {
	BaseModeOptions,
	CustomStyling,
	ModeTypes,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { BehaviorConfig } from "../base.behavior";
import { getDefaultStyling } from "../../util/styling";
import { GeoJSONStoreFeatures } from "../../terra-draw";
import { ValidatePointFeature } from "../../validations/point.validation";
import { ValidatePolygonFeature } from "../../validations/polygon.validation";
import { ValidateLineStringFeature } from "../../validations/linestring.validation";
import { StoreValidation } from "../../store/store";

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

interface TerraDrawRenderModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	// styles need to be there else we could fall back to BaseModeOptions
	styles: Partial<T>;
}

export class TerraDrawRenderMode extends TerraDrawBaseDrawMode<RenderModeStyling> {
	public type = ModeTypes.Render; // The type of the mode
	public mode = "render"; // This gets changed dynamically

	constructor(options: TerraDrawRenderModeOptions<RenderModeStyling>) {
		if (!options.modeName) {
			throw new Error("Mode name is required for TerraDrawRenderMode");
		}

		super(options, true);
		this.updateOptions(options);
	}

	updateOptions(
		options?: Omit<TerraDrawRenderModeOptions<RenderModeStyling>, "modeName">,
	): void {
		super.updateOptions(options);
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
				feature,
			),
			pointWidth: this.getNumericStylingValue(
				this.styles.pointWidth,
				defaultStyles.pointWidth,
				feature,
			),
			pointOutlineColor: this.getHexColorStylingValue(
				this.styles.pointOutlineColor,
				defaultStyles.pointOutlineColor,
				feature,
			),
			pointOutlineWidth: this.getNumericStylingValue(
				this.styles.pointOutlineWidth,
				defaultStyles.pointOutlineWidth,
				feature,
			),
			polygonFillColor: this.getHexColorStylingValue(
				this.styles.polygonFillColor,
				defaultStyles.polygonFillColor,
				feature,
			),
			polygonFillOpacity: this.getNumericStylingValue(
				this.styles.polygonFillOpacity,
				defaultStyles.polygonFillOpacity,
				feature,
			),
			polygonOutlineColor: this.getHexColorStylingValue(
				this.styles.polygonOutlineColor,
				defaultStyles.polygonOutlineColor,
				feature,
			),
			polygonOutlineWidth: this.getNumericStylingValue(
				this.styles.polygonOutlineWidth,
				defaultStyles.polygonOutlineWidth,
				feature,
			),
			lineStringWidth: this.getNumericStylingValue(
				this.styles.lineStringWidth,
				defaultStyles.lineStringWidth,
				feature,
			),
			lineStringColor: this.getHexColorStylingValue(
				this.styles.lineStringColor,
				defaultStyles.lineStringColor,
				feature,
			),
			zIndex: this.getNumericStylingValue(
				this.styles.zIndex,
				defaultStyles.zIndex,
				feature,
			),
		};
	}

	validateFeature(feature: unknown): StoreValidation {
		const validationResult = super.validateFeature(feature);
		if (validationResult.valid) {
			const validatedFeature = feature as GeoJSONStoreFeatures;

			const featureIsValid =
				ValidatePointFeature(validatedFeature, this.coordinatePrecision)
					.valid ||
				ValidatePolygonFeature(validatedFeature, this.coordinatePrecision)
					.valid ||
				ValidateLineStringFeature(validatedFeature, this.coordinatePrecision)
					.valid;

			if (featureIsValid) {
				return { valid: true };
			}

			return {
				valid: featureIsValid,
				reason: "Feature is not a valid Point, Polygon or LineString feature",
			};
		}

		return validationResult;
	}
}
