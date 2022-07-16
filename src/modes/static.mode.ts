import { TerraDrawAdapterStyling, TerraDrawMode } from "../common";
import { getDefaultStyling } from "../util/styling";

export class TerraDrawStaticMode implements TerraDrawMode {
  mode = "static";
  styling: TerraDrawAdapterStyling = getDefaultStyling();
  register() {}
  onKeyPress() {}
  onClick() {}
  onMouseMove() {}
  cleanUp() {}
}
