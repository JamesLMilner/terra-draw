import { limitPrecision } from "./limit-decimal-precision";

describe("limitPrecision", () => {
  it("returns decimal at a given precision", () => {
    const result = limitPrecision(0.11111111111111);
    expect(result).toBe(0.111111111);
  });

  it("can pass a numeric decimal precision limiter", () => {
    const result = limitPrecision(0.11111111111111, 3);
    expect(result).toBe(0.111);
  });
});
