import { getDefaultStyling } from "../util/styling";
import { TerraDrawStaticMode } from "./static.mode";

describe("TerraDrawStaticMode", () => {
  describe("constructor", () => {
    it("constructs", () => {
      const pointMode = new TerraDrawStaticMode();
      expect(pointMode.mode).toBe("static");
      expect(pointMode.styling).toStrictEqual(getDefaultStyling());
    });
  });

  describe("register", () => {
    it("does nothing", () => {
      const pointMode = new TerraDrawStaticMode();

      expect(() => {
        pointMode.register();
      }).not.toThrowError();
    });
  });

  describe("onClick", () => {
    it("does nothing", () => {
      const pointMode = new TerraDrawStaticMode();

      expect(() => {
        pointMode.onClick();
      }).not.toThrowError();
    });
  });

  describe("onKeyPress", () => {
    it("does nothing", () => {
      const pointMode = new TerraDrawStaticMode();

      expect(() => {
        pointMode.onKeyPress();
      }).not.toThrowError();
    });
  });

  describe("onMouseMove", () => {
    it("does nothing", () => {
      const pointMode = new TerraDrawStaticMode();

      expect(() => {
        pointMode.onMouseMove();
      }).not.toThrowError();
    });
  });

  describe("cleanUp", () => {
    it("does nothing", () => {
      const pointMode = new TerraDrawStaticMode();

      expect(() => {
        pointMode.cleanUp();
      }).not.toThrowError();
    });
  });
});
