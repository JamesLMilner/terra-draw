import { Feature, Polygon } from "geojson";
import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";

import { TerraDrawMouseEvent, Unproject } from "../../common";

export class ClickBoundingBoxBehavior extends TerraDrawModeBehavior {
  constructor(config: BehaviorConfig) {
    super(config);
  }

  public create(event: TerraDrawMouseEvent) {
    const { containerX: x, containerY: y } = event;
    const halfDist = this.pointerDistance / 2;

    const bbox = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            this.unproject(x - halfDist, y - halfDist), // TopLeft
            this.unproject(x + halfDist, y - halfDist), // TopRight
            this.unproject(x + halfDist, y + halfDist), // BottomRight
            this.unproject(x - halfDist, y + halfDist), // BottomLeft
            this.unproject(x - halfDist, y - halfDist), // TopLeft
          ].map((c) => [c.lng, c.lat]),
        ],
      },
    } as Feature<Polygon>;

    return bbox;
  }
}
