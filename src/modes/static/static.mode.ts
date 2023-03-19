import { TerraDrawAdapterStyling } from "../../common";
import { getDefaultStyling } from "../../util/styling";
import { TerraDrawBaseDrawMode } from "../base.mode";

// eslint-disable-next-line @typescript-eslint/ban-types
type StaticModeStylingExt<T extends TerraDrawAdapterStyling> = {};
type StaticModeStyling = StaticModeStylingExt<TerraDrawAdapterStyling>;

export class TerraDrawStaticMode extends TerraDrawBaseDrawMode<StaticModeStyling> {
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
	styleFeature() {
		return { ...getDefaultStyling() };
	}
}
