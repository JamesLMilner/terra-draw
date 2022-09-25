import { Position } from "geojson";
import {
  createStorePoint,
  createStorePolygon,
} from "../../../test/create-store-features";
import { mockBehaviorConfig } from "../../../test/mock-behavior-config";
import { mockDrawEvent } from "../../../test/mock-mouse-event";
import { BehaviorConfig } from "../../base.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { DragCoordinateBehavior } from "./drag-coordinate.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("DragCoordinateBehavior", () => {
  const createLineString = (
    config: BehaviorConfig,
    coordinates: Position[] = [
      [0, 0],
      [0, 1],
    ]
  ) => {
    const [createdId] = config.store.create([
      {
        geometry: {
          type: "LineString",
          coordinates,
        },
        properties: {
          selected: true,
        },
      },
    ]);

    return createdId;
  };

  describe("constructor", () => {
    it("constructs", () => {
      const config = mockBehaviorConfig("test");
      const selectionPointBehavior = new SelectionPointBehavior(config);
      new DragCoordinateBehavior(
        config,
        new PixelDistanceBehavior(config),
        selectionPointBehavior,
        new MidPointBehavior(config, selectionPointBehavior)
      );
    });
  });

  describe("api", () => {
    let config: BehaviorConfig;
    let dragCoordinateBehavior: DragCoordinateBehavior;

    beforeEach(() => {
      config = mockBehaviorConfig("test");
      const selectionPointBehavior = new SelectionPointBehavior(config);
      const pixelDistanceBehavior = new PixelDistanceBehavior(config);
      const midpointBehavior = new MidPointBehavior(
        config,
        selectionPointBehavior
      );

      dragCoordinateBehavior = new DragCoordinateBehavior(
        config,
        pixelDistanceBehavior,
        selectionPointBehavior,
        midpointBehavior
      );
    });

    describe("drag", () => {
      it("throws if geometry does not exist", () => {
        expect(() => {
          dragCoordinateBehavior.drag(mockDrawEvent(), "nonExistentId");
        }).toThrowError();
      });

      it("returns early if geometry is a point", () => {
        const id = createStorePoint(config);
        jest.spyOn(config.store, "updateGeometry");

        dragCoordinateBehavior.drag(mockDrawEvent(), id);

        expect(config.store.updateGeometry).toBeCalledTimes(0);
      });

      it("returns early if nothing within pointer distance", () => {
        const id = createStorePolygon(config);
        jest.spyOn(config.store, "updateGeometry");

        (config.project as jest.Mock)
          .mockReturnValueOnce({ x: 200, y: 200 })
          .mockReturnValueOnce({ x: 200, y: 300 })
          .mockReturnValueOnce({ x: 300, y: 300 })
          .mockReturnValueOnce({ x: 300, y: 200 })
          .mockReturnValueOnce({ x: 200, y: 200 });

        dragCoordinateBehavior.drag(mockDrawEvent(), id);

        expect(config.store.updateGeometry).toBeCalledTimes(0);
      });

      it("updates the Polygon coordinate if within pointer distance", () => {
        const id = createStorePolygon(config);
        jest.spyOn(config.store, "updateGeometry");

        (config.project as jest.Mock)
          .mockReturnValueOnce({ x: 0, y: 0 })
          .mockReturnValueOnce({ x: 0, y: 1 })
          .mockReturnValueOnce({ x: 1, y: 1 })
          .mockReturnValueOnce({ x: 1, y: 0 })
          .mockReturnValueOnce({ x: 0, y: 0 });

        dragCoordinateBehavior.drag(mockDrawEvent(), id);

        expect(config.store.updateGeometry).toBeCalledTimes(1);
      });

      it("updates the LineString coordinate if within pointer distance", () => {
        const id = createLineString(config);
        jest.spyOn(config.store, "updateGeometry");

        (config.project as jest.Mock)
          .mockReturnValueOnce({ x: 0, y: 0 })
          .mockReturnValueOnce({ x: 0, y: 1 });

        dragCoordinateBehavior.drag(mockDrawEvent(), id);

        expect(config.store.updateGeometry).toBeCalledTimes(1);
      });
    });
  });
});
