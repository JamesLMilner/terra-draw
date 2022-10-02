import { TerraDrawAdapterStyling } from "../../common";
import { TerraDrawBaseDrawMode } from "../base.mode";
import { BehaviorConfig } from "../base.behavior";

export class TerraDrawRenderMode extends TerraDrawBaseDrawMode {
    public mode = "render"; // This gets changed dynamically

    constructor(options: { styling: Partial<TerraDrawAdapterStyling> }) {
        super({ styling: options.styling });
    }

    // TODO: this is probably abusing
    // registerBehaviors but it works quite well conceptually
    registerBehaviors(behaviorConfig: BehaviorConfig) {
    // We can set the mode name dynamically
        this.mode = behaviorConfig.mode;
    }

    start() {
        this.setStarted();
    }
    stop() {
        this.setStopped();
    }
    onKeyUp() {}
    onKeyDown() {}
    onClick() {}
    onDragStart() {}
    onDrag() {}
    onDragEnd() {}
    onMouseMove() {}
}
