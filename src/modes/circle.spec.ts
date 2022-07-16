import { GeoJSONStore } from "../store/store";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawCircleMode } from "./circle.mode";

describe("TerraDrawCircleMode", () => {
  const defaultStyles = getDefaultStyling();

  describe("constructor", () => {
    it("constructs with no options", () => {
      const circleMode = new TerraDrawCircleMode();
      expect(circleMode.mode).toBe("circle");
      expect(circleMode.styling).toStrictEqual(defaultStyles);
    });

    it("constructs with options", () => {
      const circleMode = new TerraDrawCircleMode({
        styling: { polygonOutlineColor: "#ffffff" },
      });
      expect(circleMode.styling).toStrictEqual({
        ...defaultStyles,
        polygonOutlineColor: "#ffffff",
      });
    });
  });

  describe("register", () => {
    it("registers correctly", () => {
      const circleMode = new TerraDrawCircleMode();

      circleMode.register({
        onChange: () => {},
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store: new GeoJSONStore(),
        project: (lng: number, lat: number) => {
          return { x: 0, y: 0 };
        },
      });
    });
  });

  describe("onClick", () => {
    let circleMode: TerraDrawCircleMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;

    beforeEach(() => {
      circleMode = new TerraDrawCircleMode();
      store = new GeoJSONStore();
      onChange = jest.fn();
    });

    it("throws an error if not registered", () => {
      expect(() => {
        circleMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });
      }).toThrowError();
    });

    describe("registered", () => {
      beforeEach(() => {
        circleMode.register({
          store,
          onChange,
          onSelect: (selectedId: string) => {},
          onDeselect: () => {},
          project: (lng: number, lat: number) => {
            return { x: 0, y: 0 };
          },
        });
      });
      it("adds a circle to store if registered", () => {
        circleMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onChange).toBeCalledTimes(1);
        expect(onChange).toBeCalledWith(expect.any(String), "create");
      });

      it("finishes drawing circle on second click", () => {
        circleMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        let features = store.copyAll();
        expect(features.length).toBe(1);

        circleMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        features = store.copyAll();
        expect(features.length).toBe(1);

        expect(onChange).toBeCalledTimes(1);
        expect(onChange).toBeCalledWith(expect.any(String), "create");
      });
    });
  });

  describe("onKeyPress", () => {
    it("does nothing", () => {});
  });

  describe("onMouseMove", () => {
    let circleMode: TerraDrawCircleMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;

    beforeEach(() => {
      circleMode = new TerraDrawCircleMode();
      store = new GeoJSONStore();
      onChange = jest.fn();

      circleMode.register({
        store,
        onChange,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        project: (lng: number, lat: number) => {
          return { x: 0, y: 0 };
        },
      });
    });

    it("updates the circle size", () => {
      circleMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toHaveBeenNthCalledWith(1, expect.any(String), "create");

      const feature = store.copyAll()[0];

      circleMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 1,
        containerY: 1,
      });
      expect(onChange).toBeCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(2, expect.any(String), "update");

      const updatedFeature = store.copyAll()[0];

      expect(feature.id).toBe(updatedFeature.id);
      expect(feature.geometry.coordinates).not.toStrictEqual(
        updatedFeature.geometry.coordinates
      );
    });
  });

  describe("cleanUp", () => {
    let circleMode: TerraDrawCircleMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;

    beforeEach(() => {
      circleMode = new TerraDrawCircleMode();
      store = new GeoJSONStore();
      onChange = jest.fn();

      circleMode.register({
        store,
        onChange,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        project: (lng: number, lat: number) => {
          return { x: 0, y: 0 };
        },
      });
    });

    it("does not delete if no circle has been created", () => {
      circleMode.cleanUp();
      expect(onChange).toBeCalledTimes(0);
    });

    it("does delete if a circle has been created", () => {
      circleMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      circleMode.cleanUp();

      expect(onChange).toBeCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(2, expect.any(String), "delete");
    });
  });

  describe("onKeyPress", () => {
    let store: GeoJSONStore;
    let circleMode: TerraDrawCircleMode;
    let onChange: jest.Mock;
    let project: jest.Mock;

    beforeEach(() => {
      jest.resetAllMocks();

      store = new GeoJSONStore();
      circleMode = new TerraDrawCircleMode();
      onChange = jest.fn();
      project = jest.fn();

      circleMode.register({
        onChange: onChange as any,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store,
        project,
      });
    });

    it("Escape - does nothing when no circle is present", () => {
      circleMode.onKeyPress({ key: "Escape" });
    });

    it("Escape - deletes the circle when currently editing", () => {
      circleMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      let features = store.copyAll();
      expect(features.length).toBe(1);

      circleMode.onKeyPress({ key: "Escape" });

      features = store.copyAll();
      expect(features.length).toBe(0);
    });
  });
});
