import { TerraDrawAdapterStyling, TerraDrawMode } from "../common";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawBaseDrawMode } from "./base.mode";

export class TerraDrawStaticMode extends TerraDrawBaseDrawMode {
  mode = "static";
  start() {}
  stop() {}
  onKeyPress() {}
  onClick() {}
  onDragStart() {}
  onDrag() {}
  onDragEnd() {}
  onMouseMove() {}
}
