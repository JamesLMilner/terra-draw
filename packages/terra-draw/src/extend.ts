import { TerraDrawBaseAdapter, BaseAdapterConfig } from "./common/base.adapter";
import {
	HexColorStyling,
	NumericStyling,
	SELECT_PROPERTIES,
	TerraDrawCallbacks,
} from "./common";
import { BaseModeOptions, TerraDrawBaseDrawMode } from "./modes/base.mode";
import { FeatureId, GeoJSONStore } from "./store/store";

// This object allows 3rd party developers to
// extend these abstract classes and create there
// own modes and adapters
export {
	GeoJSONStore,
	TerraDrawBaseDrawMode,
	TerraDrawBaseAdapter,
	BaseAdapterConfig,
	NumericStyling,
	HexColorStyling,
	BaseModeOptions,
	TerraDrawCallbacks,
	FeatureId,
	SELECT_PROPERTIES,
};
