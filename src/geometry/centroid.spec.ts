import { Feature, LineString, Polygon } from "geojson";
import { centroid } from "./centroid";

describe("centroid", () => {
  it("returns centroid for a given Polygon", () => {
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
    const result = centroid(polygon);
    expect(result).toStrictEqual([0.25, 0.75]);
  });

  it("returns centroid for a given LineString", () => {
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
    const result = centroid(linestring);
    expect(result).toStrictEqual([0.25, 0.75]);
  });
});
