import { pixelDistance } from "./pixel-distance";

const checkApprox = (num1: number, num2: number, epsilon = 0.00001) => {
  // Calculating the absolute difference
  // and compare with epsilon
  return Math.abs(num1 - num2) < epsilon;
};

describe("Geometry", () => {
  describe("getPixelDistance", () => {
    it("vertical distance", () => {
      const result = pixelDistance({ x: 0, y: 0 }, { x: 0, y: 1 });
      expect(result).toBe(1);
    });
    it("horizontal distance", () => {
      const result = pixelDistance({ x: 0, y: 0 }, { x: 1, y: 0 });
      expect(result).toBe(1);
    });
    it("diagonal distance", () => {
      const result = pixelDistance({ x: 0, y: 0 }, { x: 1, y: 1 });
      expect(checkApprox(result, 1.4142135623730951)).toBe(true);
    });
  });
});
