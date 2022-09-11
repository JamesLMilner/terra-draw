import { TerraDrawAdapterStyling } from "../common";
import { TerraDrawBaseDrawMode } from "./base.mode";
import { BehaviorConfig } from "./common/base.behavior";

export class TerraDrawRenderMode extends TerraDrawBaseDrawMode {
  public mode: string | undefined;

  constructor(options: { styling: Partial<TerraDrawAdapterStyling> }) {
    super({ styling: options.styling });
  }

  // TODO: this is probably abusing
  // registerBehaviors but it works quite well conceptually
  registerBehaviors(behaviorConfig: BehaviorConfig) {
    // We can set the mode name dynamically
    this.mode = behaviorConfig.mode;
  }

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
