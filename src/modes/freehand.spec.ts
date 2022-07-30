import { GeoJSONStore } from "../store/store";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawFreehandMode } from "./freehand.mode";

describe("TerraDrawFreehandMode", () => {
  const defaultStyles = getDefaultStyling();

  describe("constructor", () => {
    it("constructs with no options", () => {
      const freehandMode = new TerraDrawFreehandMode();
      expect(freehandMode.mode).toBe("freehand");
      expect(freehandMode.styling).toStrictEqual(defaultStyles);
    });

    it("constructs with options", () => {
      const freehandMode = new TerraDrawFreehandMode({
        styling: { polygonOutlineColor: "#ffffff" },
        everyNthMouseEvent: 5,
        keyEvents: {
          cancel: "Backspace",
        },
      });
      expect(freehandMode.styling).toStrictEqual({
        ...defaultStyles,
        polygonOutlineColor: "#ffffff",
      });
    });
  });

  describe("register", () => {
    it("registers correctly", () => {
      const freehandMode = new TerraDrawFreehandMode();

      freehandMode.register({
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
    let freehandMode: TerraDrawFreehandMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;

    beforeEach(() => {
      freehandMode = new TerraDrawFreehandMode();
      store = new GeoJSONStore();
      onChange = jest.fn();
    });

    it("throws an error if not registered", () => {
      expect(() => {
        freehandMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });
      }).toThrowError();
    });

    describe("registered", () => {
      beforeEach(() => {
        freehandMode.register({
          store,
          onChange,
          onSelect: (selectedId: string) => {},
          onDeselect: () => {},
          project: (lng: number, lat: number) => {
            return { x: 0, y: 0 };
          },
        });
      });
      it("adds a polygon to store if registered", () => {
        freehandMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onChange).toBeCalledTimes(1);
        expect(onChange).toBeCalledWith([expect.any(String)], "create");
      });

      it("finishes drawing polygon on second click", () => {
        freehandMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        let features = store.copyAll();
        expect(features.length).toBe(1);

        freehandMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        features = store.copyAll();
        expect(features.length).toBe(1);

        expect(onChange).toBeCalledTimes(1);
        expect(onChange).toBeCalledWith([expect.any(String)], "create");
      });
    });
  });

  describe("onMouseMove", () => {
    let freehandMode: TerraDrawFreehandMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;

    beforeEach(() => {
      freehandMode = new TerraDrawFreehandMode();
      store = new GeoJSONStore();
      onChange = jest.fn();

      freehandMode.register({
        store,
        onChange,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        project: (lng: number, lat: number) => {
          return { x: 0, y: 0 };
        },
      });
    });

    it("updates the freehand polygon on 10th mouse event", () => {
      freehandMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toHaveBeenNthCalledWith(
        1,
        [expect.any(String)],
        "create"
      );

      const feature = store.copyAll()[0];

      for (let i = 0; i < 12; i++) {
        freehandMode.onMouseMove({
          lng: i,
          lat: i,
          containerX: i,
          containerY: i,
        });
      }

      expect(onChange).toBeCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(
        2,
        [expect.any(String)],
        "update"
      );

      const updatedFeature = store.copyAll()[0];

      expect(feature.id).toBe(updatedFeature.id);
      expect(feature.geometry.coordinates).not.toStrictEqual(
        updatedFeature.geometry.coordinates
      );
    });

    it("does nothing if no first click", () => {
      freehandMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 1,
        containerY: 1,
      });

      expect(onChange).toBeCalledTimes(0);
    });
  });

  describe("cleanUp", () => {
    let freehandMode: TerraDrawFreehandMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;

    beforeEach(() => {
      freehandMode = new TerraDrawFreehandMode();
      store = new GeoJSONStore();
      onChange = jest.fn();

      freehandMode.register({
        store,
        onChange,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        project: (lng: number, lat: number) => {
          return { x: 0, y: 0 };
        },
      });
    });

    it("does not delete if no freehand has been created", () => {
      freehandMode.cleanUp();
      expect(onChange).toBeCalledTimes(0);
    });

    it("does delete if a freehand has been created", () => {
      freehandMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      freehandMode.cleanUp();

      expect(onChange).toBeCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(
        2,
        [expect.any(String)],
        "delete"
      );
    });
  });

  describe("onKeyPress", () => {
    let store: GeoJSONStore;
    let freehandMode: TerraDrawFreehandMode;
    let onChange: jest.Mock;
    let project: jest.Mock;

    beforeEach(() => {
      jest.resetAllMocks();

      store = new GeoJSONStore();
      freehandMode = new TerraDrawFreehandMode();
      onChange = jest.fn();
      project = jest.fn();

      freehandMode.register({
        onChange: onChange as any,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store,
        project,
      });
    });

    it("Escape - does nothing when no freehand is present", () => {
      freehandMode.onKeyPress({ key: "Escape" });
    });

    it("Escape - deletes the freehand when currently editing", () => {
      freehandMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      let features = store.copyAll();
      expect(features.length).toBe(1);

      freehandMode.onKeyPress({ key: "Escape" });

      features = store.copyAll();
      expect(features.length).toBe(0);
    });
  });

  describe("onDrag", () => {
    it("does nothing", () => {
      const freehandMode = new TerraDrawFreehandMode();

      expect(() => {
        freehandMode.onDrag();
      }).not.toThrowError();
    });
  });

  describe("onDragStart", () => {
    it("does nothing", () => {
      const freehandMode = new TerraDrawFreehandMode();

      expect(() => {
        freehandMode.onDragStart();
      }).not.toThrowError();
    });
  });

  describe("onDragEnd", () => {
    it("does nothing", () => {
      const freehandMode = new TerraDrawFreehandMode();

      expect(() => {
        freehandMode.onDragEnd();
      }).not.toThrowError();
    });
  });
});
