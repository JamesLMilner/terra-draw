import { TerraDrawAdapterStyling } from "../../common";
import { TerraDrawBaseDrawMode } from "../base.mode";
import { BehaviorConfig } from "../base.behavior";
import { getDefaultStyling } from "../../util/styling";

// eslint-disable-next-line @typescript-eslint/ban-types
type RenderModeStylingExt<T extends TerraDrawAdapterStyling> = {}
type RenderModeStyling = RenderModeStylingExt<TerraDrawAdapterStyling>

export class TerraDrawRenderMode extends TerraDrawBaseDrawMode<RenderModeStyling> {
    public mode = "render"; // This gets changed dynamically

    constructor(options: { styles: Partial<TerraDrawAdapterStyling> }) {
        super({ styles: options.styles });
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
    onKeyUp() { }
    onKeyDown() { }
    onClick() { }
    onDragStart() { }
    onDrag() { }
    onDragEnd() { }
    onMouseMove() { }
    styleFeature(): TerraDrawAdapterStyling {
        return {
            ...getDefaultStyling(),
            ...this.styles
        };
    }
}
