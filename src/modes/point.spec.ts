import { GeoJSONStore } from "../store/store";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawPointMode } from "./point.mode";

describe("TerraDrawPointMode", () => {
  const defaultStyles = getDefaultStyling();

  describe("constructor", () => {
    it("constructs with no options", () => {
      const pointMode = new TerraDrawPointMode();
      expect(pointMode.mode).toBe("point");
      expect(pointMode.styling).toStrictEqual(defaultStyles);
    });

    it("constructs with options", () => {
      const pointMode = new TerraDrawPointMode({
        styling: { pointOutlineColor: "#ffffff" },
      });
      expect(pointMode.styling).toStrictEqual({
        ...defaultStyles,
        pointOutlineColor: "#ffffff",
      });
    });
  });

  describe("register", () => {
    it("registers correctly", () => {
      const pointMode = new TerraDrawPointMode();

      expect(() => {
        pointMode.register({
          onChange: () => {},
          onSelect: (selectedId: string) => {},
          onDeselect: () => {},
          store: new GeoJSONStore(),
          project: (lng: number, lat: number) => {
            return { x: 0, y: 0 };
          },
        });
      }).not.toThrow();
    });
  });

  describe("onClick", () => {
    it("throws an error if not registered", () => {
      const pointMode = new TerraDrawPointMode();
      const mockMouseEvent = {
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      };
      expect(() => {
        pointMode.onClick(mockMouseEvent);
      }).toThrowError();
    });

    it("creates a point if registered", () => {
      const pointMode = new TerraDrawPointMode();

      const mockOnChange = jest.fn();

      pointMode.register({
        store: new GeoJSONStore(),
        onChange: mockOnChange,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        project: (lng: number, lat: number) => {
          return { x: 0, y: 0 };
        },
      });

      pointMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(mockOnChange).toBeCalledTimes(1);
      expect(mockOnChange).toBeCalledWith(expect.any(String), "create");
    });
  });

  describe("onKeyPress", () => {
    it("does nothing", () => {
      const pointMode = new TerraDrawPointMode();

      expect(() => {
        pointMode.onKeyPress();
      }).not.toThrowError();
    });
  });

  describe("onMouseMove", () => {
    it("does nothing", () => {
      const pointMode = new TerraDrawPointMode();

      expect(() => {
        pointMode.onMouseMove();
      }).not.toThrowError();
    });
  });

  describe("cleanUp", () => {
    it("does nothing", () => {
      const pointMode = new TerraDrawPointMode();

      expect(() => {
        pointMode.cleanUp();
      }).not.toThrowError();
    });
  });
});
