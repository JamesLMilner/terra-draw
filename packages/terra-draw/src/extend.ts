import { TerraDrawBaseAdapter, BaseAdapterConfig } from "./common/base.adapter";
import {
	Cursor,
	HexColorStyling,
	NumericStyling,
	SELECT_PROPERTIES,
	TerraDrawCallbacks,
} from "./common";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
	TerraDrawBaseSelectMode,
} from "./modes/base.mode";
import { FeatureId, GeoJSONStore } from "./store/store";
import { getDefaultStyling } from "./util/styling";

// This object allows 3rd party developers to
// extend these abstract classes and create there
// own modes and adapters
export {
	GeoJSONStore,
	TerraDrawBaseDrawMode,
	TerraDrawBaseSelectMode,
	TerraDrawBaseAdapter,
	getDefaultStyling,
	SELECT_PROPERTIES,

	// Types
	FeatureId,
	Cursor,
	BaseModeOptions,
	CustomStyling,
	NumericStyling,
	HexColorStyling,
	TerraDrawCallbacks,
	BaseAdapterConfig,
};
