import { TerraDrawAdapterStyling, TerraDrawMode } from "../common";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawBaseDrawMode } from "./base.mode";

export class TerraDrawStaticMode extends TerraDrawBaseDrawMode {
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
}
