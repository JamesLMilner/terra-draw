import {
	TerraDrawBaseAdapter,
	BaseAdapterConfig,
} from "./adapters/common/base.adapter";
import { HexColorStyling, NumericStyling } from "./common";
import { BaseModeOptions, TerraDrawBaseDrawMode } from "./modes/base.mode";

// This object allows 3rd party developers to
// extend these abstract classes and create there
// own modes and adapters
export {
	TerraDrawBaseDrawMode,
	TerraDrawBaseAdapter,
	BaseAdapterConfig,
	NumericStyling,
	HexColorStyling,
	BaseModeOptions,
};
