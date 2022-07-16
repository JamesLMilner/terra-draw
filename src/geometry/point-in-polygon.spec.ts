import { pointInPolygon } from "./point-in-polygon";

describe("Geometry", () => {
  describe("pointInPolygon", () => {
    const polygon = [
      [
        [0, 0],
        [0, 100],
        [100, 100],
        [100, 0],
        [0, 0],
      ],
    ] as [number, number][][];

    it("point is not in polygon", () => {
      const pointOut = [140, 150] as [number, number];
      expect(pointInPolygon(pointOut, polygon)).toBe(false);
    });

    it("point is in polygon", () => {
      const pointIn = [50, 50] as [number, number];
      expect(pointInPolygon(pointIn, polygon)).toBe(true);
    });
  });
});
