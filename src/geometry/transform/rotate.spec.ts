import { Feature, LineString, Polygon } from "geojson";
import { transformRotate } from "./rotate";

describe("rotate", () => {
  it("returns a polygon angle is set to 0", () => {
    const polygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
      properties: {},
    } as Feature<Polygon>;
    const result = transformRotate(polygon, 0);
    expect(result).toStrictEqual(polygon);
  });

  it("rotates a given Polygon correctly", () => {
    const polygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
      properties: {},
    } as Feature<Polygon>;
    const result = transformRotate(polygon, 180);
    expect(result).toStrictEqual({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0.5000428447779086, 1.4999999999999993],
            [0.49998572058268564, 0.4999999999999998],
            [-0.49995716174805693, 0.49999999999999917],
            [0.49998572058268564, 0.4999999999999998],
            [0.5000428447779086, 1.4999999999999993],
          ],
        ],
      },
      properties: {},
    });
  });

  it("rotates a given LineString correctly", () => {
    const linestring = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [0, 1],
          [1, 1],
          [0, 1],
        ],
      },
      properties: {},
    } as Feature<LineString>;
    const result = transformRotate(linestring, 180);
    expect(result).toStrictEqual({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [0.5000428447779086, 1.4999999999999993],
          [0.49998572058268564, 0.4999999999999998],
          [-0.49995716174805693, 0.49999999999999917],
          [0.49998572058268564, 0.4999999999999998],
        ],
      },
      properties: {},
    });
  });
});
