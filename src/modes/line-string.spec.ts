import { GeoJSONStore } from "../store/store";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawLineStringMode } from "./line-string.mode";

describe("TerraDrawLineStringMode", () => {
  const defaultStyles = getDefaultStyling();

  describe("constructor", () => {
    it("constructs with no options", () => {
      const lineStringMode = new TerraDrawLineStringMode();
      expect(lineStringMode.mode).toBe("linestring");
      expect(lineStringMode.styling).toStrictEqual(defaultStyles);
    });

    it("constructs with options", () => {
      const lineStringMode = new TerraDrawLineStringMode({
        styling: { lineStringColor: "#ffffff" },
      });
      expect(lineStringMode.styling).toStrictEqual({
        ...defaultStyles,
        lineStringColor: "#ffffff",
      });
    });
  });

  describe("register", () => {
    it("registers correctly", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      expect(() => {
        lineStringMode.register({
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

  describe("onMouseMove", () => {
    it("does nothing if no clicks have occurred ", () => {
      const lineStringMode = new TerraDrawLineStringMode();
      const onChange = jest.fn();
      lineStringMode.register({
        onChange,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store: new GeoJSONStore(),
        project: (lng: number, lat: number) => {
          return { x: 0, y: 0 };
        },
      });

      lineStringMode.onMouseMove({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).not.toBeCalled();
    });

    it("updates the coordinate to the mouse position if a coordinate has been created", () => {
      const lineStringMode = new TerraDrawLineStringMode();
      const store = new GeoJSONStore();
      const onChange = jest.fn();
      lineStringMode.register({
        onChange,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store,
        project: (lng: number, lat: number) => {
          return { x: 0, y: 0 };
        },
      });

      lineStringMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      lineStringMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).toBeCalledTimes(2);

      const features = store.copyAll();
      expect(features.length).toBe(1);

      expect(features[0].geometry.coordinates).toStrictEqual([
        [0, 0],
        [1, 1],
      ]);
    });
  });

  describe("onClick", () => {
    let store: GeoJSONStore;
    let lineStringMode: TerraDrawLineStringMode;
    let onChange: jest.Mock;
    let project: jest.Mock;

    beforeEach(() => {
      jest.resetAllMocks();

      store = new GeoJSONStore();
      lineStringMode = new TerraDrawLineStringMode();
      onChange = jest.fn();
      project = jest.fn();

      lineStringMode.register({
        onChange: onChange as any,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store,
        project,
      });
    });

    it("creates two identical coordinates on click", () => {
      lineStringMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).toBeCalledTimes(1);

      const features = store.copyAll();
      expect(features.length).toBe(1);

      expect(features[0].geometry.coordinates).toStrictEqual([
        [0, 0],
        [0, 0],
      ]);
    });

    it("creates two additional identical coordinates on second click", () => {
      lineStringMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      lineStringMode.onClick({
        lng: 1,
        lat: 1,
        containerX: 1,
        containerY: 1,
      });

      expect(onChange).toBeCalledTimes(2);

      const features = store.copyAll();
      expect(features.length).toBe(1);

      expect(features[0].geometry.coordinates).toStrictEqual([
        [0, 0],
        [1, 1],
        [1, 1],
      ]);
    });

    it("finishes the line on the the third click", () => {
      project.mockReturnValueOnce({ x: 50, y: 50 });
      project.mockReturnValueOnce({ x: 100, y: 100 });

      lineStringMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      lineStringMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 50,
        containerY: 50,
      });

      lineStringMode.onClick({
        lng: 1,
        lat: 1,
        containerX: 50,
        containerY: 50,
      });

      let features = store.copyAll();
      expect(features.length).toBe(1);

      expect(features[0].geometry.coordinates).toStrictEqual([
        [0, 0],
        [1, 1],
        [1, 1],
      ]);

      lineStringMode.onMouseMove({
        lng: 2,
        lat: 2,
        containerX: 100,
        containerY: 100,
      });

      lineStringMode.onClick({
        lng: 2,
        lat: 2,
        containerX: 100,
        containerY: 100,
      });

      lineStringMode.onClick({
        lng: 2,
        lat: 2,
        containerX: 100,
        containerY: 100,
      });

      expect(onChange).toBeCalledTimes(6);

      features = store.copyAll();
      expect(features.length).toBe(1);

      expect(features[0].geometry.coordinates).toStrictEqual([
        [0, 0],
        [1, 1],
        [2, 2],
      ]);
    });

    it("handles self intersection", () => {
      store = new GeoJSONStore();
      lineStringMode = new TerraDrawLineStringMode({
        allowSelfIntersections: false,
      });
      onChange = jest.fn();
      project = jest.fn();

      lineStringMode.register({
        onChange: onChange as any,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store,
        project,
      });

      // We don't want there to be a closing click, so we
      // make the distances between points huge (much large than 40 pixels)
      project.mockImplementation((lng, lat) => ({
        x: lng * 1000,
        y: lat * 1000,
      }));

      lineStringMode.onClick({
        lng: 6.50390625,
        lat: 32.99023555965106,
        containerX: 6.50390625,
        containerY: 32.99023555965106,
      });

      lineStringMode.onMouseMove({
        lng: -9.931640625,
        lat: 5.090944175033399,
        containerX: -9.931640625,
        containerY: 5.090944175033399,
      });

      lineStringMode.onClick({
        lng: -9.931640625,
        lat: 5.090944175033399,
        containerX: -9.931640625,
        containerY: 5.090944175033399,
      });

      lineStringMode.onMouseMove({
        lng: 19.86328125,
        lat: 2.0210651187669897,
        containerX: 19.86328125,
        containerY: 2.0210651187669897,
      });

      lineStringMode.onClick({
        lng: 19.86328125,
        lat: 2.0210651187669897,
        containerX: 19.86328125,
        containerY: 2.0210651187669897,
      });

      // This point is causing self intersection
      lineStringMode.onMouseMove({
        lng: -8.173828125,
        lat: 24.367113562651262,
        containerX: -8.173828125,
        containerY: 24.367113562651262,
      });

      expect(onChange).toBeCalledTimes(6);

      lineStringMode.onClick({
        lng: -8.173828125,
        lat: 24.367113562651262,
        containerX: -8.173828125,
        containerY: 24.367113562651262,
      });

      // Update geometry is NOT called because
      // there is a self intersection
      expect(onChange).toBeCalledTimes(6);
    });
  });

  describe("onKeyPress", () => {
    let store: GeoJSONStore;
    let lineStringMode: TerraDrawLineStringMode;
    let onChange: jest.Mock;
    let project: jest.Mock;

    beforeEach(() => {
      jest.resetAllMocks();

      store = new GeoJSONStore();
      lineStringMode = new TerraDrawLineStringMode();
      onChange = jest.fn();
      project = jest.fn();

      lineStringMode.register({
        onChange: onChange as any,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store,
        project,
      });
    });

    it("Escape - does nothing when no line is present", () => {
      lineStringMode.onKeyPress({ key: "Escape" });
    });

    it("Escape - deletes the line when currently editing", () => {
      lineStringMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      let features = store.copyAll();
      expect(features.length).toBe(1);

      lineStringMode.onKeyPress({ key: "Escape" });

      features = store.copyAll();
      expect(features.length).toBe(0);
    });
  });

  describe("cleanUp", () => {
    it("does not throw error if feature has not been created ", () => {
      const store = new GeoJSONStore();
      const lineStringMode = new TerraDrawLineStringMode();
      const onChange = jest.fn();
      const project = jest.fn();

      lineStringMode.register({
        onChange: onChange as any,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store,
        project,
      });

      expect(() => {
        lineStringMode.cleanUp();
      }).not.toThrowError();
    });

    it("cleans up correctly if drawing has started", () => {
      const store = new GeoJSONStore();
      const lineStringMode = new TerraDrawLineStringMode();
      const onChange = jest.fn();
      const project = jest.fn();

      lineStringMode.register({
        onChange: onChange as any,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store,
        project,
      });

      lineStringMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(store.copyAll().length).toBe(1);

      lineStringMode.cleanUp();

      // Removes the LineString that was being created
      expect(store.copyAll().length).toBe(0);
    });
  });
});
