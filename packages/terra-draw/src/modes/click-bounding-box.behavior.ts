import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { TerraDrawMouseEvent } from "../common";
import { createBBoxFromPoint } from "../geometry/shape/create-bbox";

export class ClickBoundingBoxBehavior extends TerraDrawModeBehavior {
	constructor(config: BehaviorConfig) {
		super(config);
	}

	public create(event: TerraDrawMouseEvent) {
		const { containerX: x, containerY: y } = event;
		return createBBoxFromPoint({
			unproject: this.unproject,
			point: { x, y },
			pointerDistance: this.pointerDistance,
		});
	}
}
