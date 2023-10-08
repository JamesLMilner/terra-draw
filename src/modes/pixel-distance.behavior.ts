import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { TerraDrawMouseEvent } from "../common";

import { Position } from "geojson";
import { pixelDistance } from "../geometry/measure/pixel-distance";

export class PixelDistanceBehavior extends TerraDrawModeBehavior {
	constructor(config: BehaviorConfig) {
		super(config);
	}
	public measure(clickEvent: TerraDrawMouseEvent, secondCoordinate: Position) {
		const { x, y } = this.project(secondCoordinate[0], secondCoordinate[1]);

		const distance = pixelDistance(
			{ x, y },
			{ x: clickEvent.containerX, y: clickEvent.containerY },
		);

		return distance;
	}
}
