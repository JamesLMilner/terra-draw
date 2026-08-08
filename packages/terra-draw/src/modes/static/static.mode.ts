import { TerraDrawAdapterStyling } from "../../common";
import { getDefaultStyling } from "../../util/styling";
import { ModeTypes, TerraDrawBaseDrawMode } from "../base.mode";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type StaticModeStylingExt<T extends TerraDrawAdapterStyling> = {};
type StaticModeStyling = StaticModeStylingExt<TerraDrawAdapterStyling>;

export class TerraDrawStaticMode extends TerraDrawBaseDrawMode<StaticModeStyling> {
	type = ModeTypes.Static;
	mode = "static" as const;
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
