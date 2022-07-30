import { getDefaultStyling } from "../util/styling";
import { TerraDrawStaticMode } from "./static.mode";

describe("TerraDrawStaticMode", () => {
  describe("constructor", () => {
    it("constructs", () => {
      const staticMode = new TerraDrawStaticMode();
      expect(staticMode.mode).toBe("static");
      expect(staticMode.styling).toStrictEqual(getDefaultStyling());
    });
  });

  describe("register", () => {
    it("does nothing", () => {
      const staticMode = new TerraDrawStaticMode();

      expect(() => {
        staticMode.register();
      }).not.toThrowError();
    });
  });

  describe("onClick", () => {
    it("does nothing", () => {
      const staticMode = new TerraDrawStaticMode();

      expect(() => {
        staticMode.onClick();
      }).not.toThrowError();
    });
  });

  describe("onKeyPress", () => {
    it("does nothing", () => {
      const staticMode = new TerraDrawStaticMode();

      expect(() => {
        staticMode.onKeyPress();
      }).not.toThrowError();
    });
  });

  describe("onMouseMove", () => {
    it("does nothing", () => {
      const staticMode = new TerraDrawStaticMode();

      expect(() => {
        staticMode.onMouseMove();
      }).not.toThrowError();
    });
  });

  describe("cleanUp", () => {
    it("does nothing", () => {
      const staticMode = new TerraDrawStaticMode();

      expect(() => {
        staticMode.cleanUp();
      }).not.toThrowError();
    });
  });

  describe("onDrag", () => {
    it("does nothing", () => {
      const staticMode = new TerraDrawStaticMode();

      expect(() => {
        staticMode.onDrag();
      }).not.toThrowError();
    });
  });

  describe("onDragStart", () => {
    it("does nothing", () => {
      const staticMode = new TerraDrawStaticMode();

      expect(() => {
        staticMode.onDragStart();
      }).not.toThrowError();
    });
  });

  describe("onDragEnd", () => {
    it("does nothing", () => {
      const staticMode = new TerraDrawStaticMode();

      expect(() => {
        staticMode.onDragEnd();
      }).not.toThrowError();
    });
  });
});
