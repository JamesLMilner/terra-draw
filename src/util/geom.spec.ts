import { createLineString, createPolygon } from "./geoms";

describe("Geom", () => {
  describe("createPolygon", () => {
    it("generates creates a polygon", () => {
      const polygon = createPolygon([
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
        ],
      ]);
      expect(polygon).toStrictEqual({
        geometry: {
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
            ],
          ],
          type: "Polygon",
        },
        properties: {},
        type: "Feature",
      });
    });
  });

  describe("createLineString", () => {
    it("generates creates a linestring", () => {
      const linestring = createLineString([
        [0, 0],
        [0, 1],
      ]);
      expect(linestring).toStrictEqual({
        geometry: {
          coordinates: [
            [0, 0],
            [0, 1],
          ],

          type: "LineString",
        },
        properties: {},
        type: "Feature",
      });
    });
  });
});
