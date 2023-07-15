import { TerraDrawAdapterStyling } from "../../common";
import { getDefaultStyling } from "../../util/styling";
import { ModeTypes, TerraDrawBaseDrawMode } from "../base.mode";

// eslint-disable-next-line @typescript-eslint/ban-types
type StaticModeStylingExt<T extends TerraDrawAdapterStyling> = {};
type StaticModeStyling = StaticModeStylingExt<TerraDrawAdapterStyling>;

export class TerraDrawStaticMode extends TerraDrawBaseDrawMode<StaticModeStyling> {
	type = ModeTypes.Static;
	mode = "static";
	start() {}
	stop() {}
	onKeyUp() {}
	onKeyDown() {}
	onClick() {}
	onDragStart() {}
	onDrag() {}
	onDragEnd() {}
	onMouseMove() {}
	cleanUp() {}
	styleFeature() {
		return { ...getDefaultStyling() };
	}
}
