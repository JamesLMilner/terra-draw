import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";
import { TerraDrawMouseEvent } from "../../common";

import { Position } from "geojson";
import { pixelDistance } from "../../geometry/measure/pixel-distance";

export class PixelDistanceBehavior extends TerraDrawModeBehavior {
  constructor(config: BehaviorConfig) {
    super(config);
  }
  public measure(event: TerraDrawMouseEvent, coord: Position) {
    const { x, y } = this.project(coord[0], coord[1]);

    const distance = pixelDistance(
      { x, y },
      { x: event.containerX, y: event.containerY }
    );

    return distance;
  }
}
