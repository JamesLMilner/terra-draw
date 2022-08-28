import { GeoJSONStore } from "../store/store";
import { getMockModeConfig } from "../test/mock-config";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawLineStringMode } from "./linestring.mode";

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
        keyEvents: { cancel: "Backspace" },
      });
      expect(lineStringMode.styling).toStrictEqual({
        ...defaultStyles,
        lineStringColor: "#ffffff",
      });
    });
  });

  describe("lifecycle", () => {
    it("registers correctly", () => {
      const lineStringMode = new TerraDrawLineStringMode();
      expect(lineStringMode.state).toBe("unregistered");
      lineStringMode.register(getMockModeConfig());
      expect(lineStringMode.state).toBe("registered");
    });

    it("setting state directly throws error", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      expect(() => {
        lineStringMode.state = "started";
      }).toThrowError();
    });

    it("stopping before not registering throws error", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      expect(() => {
        lineStringMode.stop();
      }).toThrowError();
    });

    it("starting before not registering throws error", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      expect(() => {
        lineStringMode.start();
      }).toThrowError();
    });

    it("starting before not registering throws error", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      expect(() => {
        lineStringMode.start();
      }).toThrowError();
    });

    it("registering multiple times throws an error", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      expect(() => {
        lineStringMode.register(getMockModeConfig());
        lineStringMode.register(getMockModeConfig());
      }).toThrowError();
    });

    it("can start correctly", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      lineStringMode.register(getMockModeConfig());
      lineStringMode.start();

      expect(lineStringMode.state).toBe("started");
    });

    it("can stop correctly", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      lineStringMode.register(getMockModeConfig());
      lineStringMode.start();
      lineStringMode.stop();

      expect(lineStringMode.state).toBe("stopped");
    });
  });

  describe("onMouseMove", () => {
    let lineStringMode: TerraDrawLineStringMode;
    let onChange: jest.Mock;
    let store: GeoJSONStore;

    beforeEach(() => {
      lineStringMode = new TerraDrawLineStringMode();
      const mockConfig = getMockModeConfig();
      onChange = mockConfig.onChange;
      store = mockConfig.store;

      lineStringMode.register(mockConfig);
    });

    it("does nothing if no clicks have occurred ", () => {
      lineStringMode.onMouseMove({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
        button: "left",
      });

      expect(onChange).not.toBeCalled();
    });

    it("updates the coordinate to the mouse position if a coordinate has been created", () => {
      lineStringMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
        button: "left",
      });

      lineStringMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
        button: "left",
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
    let lineStringMode: TerraDrawLineStringMode;
    let onChange: jest.Mock;
    let store: GeoJSONStore;
    let project: jest.Mock;

    beforeEach(() => {
      lineStringMode = new TerraDrawLineStringMode();
      const mockConfig = getMockModeConfig();
      onChange = mockConfig.onChange;
      store = mockConfig.store;
      project = mockConfig.project;
      lineStringMode.register(mockConfig);
    });

    it("creates two identical coordinates on click", () => {
      lineStringMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
        button: "left",
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
        button: "left",
      });

      lineStringMode.onClick({
        lng: 1,
        lat: 1,
        containerX: 1,
        containerY: 1,
        button: "left",
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
        button: "left",
      });

      lineStringMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 50,
        containerY: 50,
        button: "left",
      });

      lineStringMode.onClick({
        lng: 1,
        lat: 1,
        containerX: 50,
        containerY: 50,
        button: "left",
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
        button: "left",
      });

      lineStringMode.onClick({
        lng: 2,
        lat: 2,
        containerX: 100,
        containerY: 100,
        button: "left",
      });

      lineStringMode.onClick({
        lng: 2,
        lat: 2,
        containerX: 100,
        containerY: 100,
        button: "left",
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
      // TODO: Limit precision to 9 decimals

      lineStringMode = new TerraDrawLineStringMode({
        allowSelfIntersections: false,
      });

      const mockConfig = getMockModeConfig();
      onChange = mockConfig.onChange;
      store = mockConfig.store;
      project = mockConfig.project;
      lineStringMode.register(mockConfig);

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
        button: "left",
      });

      lineStringMode.onMouseMove({
        lng: -9.931640625,
        lat: 5.090944175033399,
        containerX: -9.931640625,
        containerY: 5.090944175033399,
        button: "left",
      });

      lineStringMode.onClick({
        lng: -9.931640625,
        lat: 5.090944175033399,
        containerX: -9.931640625,
        containerY: 5.090944175033399,
        button: "left",
      });

      lineStringMode.onMouseMove({
        lng: 19.86328125,
        lat: 2.0210651187669897,
        containerX: 19.86328125,
        containerY: 2.0210651187669897,
        button: "left",
      });

      lineStringMode.onClick({
        lng: 19.86328125,
        lat: 2.0210651187669897,
        containerX: 19.86328125,
        containerY: 2.0210651187669897,
        button: "left",
      });

      // This point is causing self intersection
      lineStringMode.onMouseMove({
        lng: -8.173828125,
        lat: 24.367113562651262,
        containerX: -8.173828125,
        containerY: 24.367113562651262,
        button: "left",
      });

      expect(onChange).toBeCalledTimes(6);

      lineStringMode.onClick({
        lng: -8.173828125,
        lat: 24.367113562651262,
        containerX: -8.173828125,
        containerY: 24.367113562651262,
        button: "left",
      });

      // Update geometry is NOT called because
      // there is a self intersection
      expect(onChange).toBeCalledTimes(6);
    });
  });

  describe("onKeyPress", () => {
    let lineStringMode: TerraDrawLineStringMode;
    let store: GeoJSONStore;

    beforeEach(() => {
      lineStringMode = new TerraDrawLineStringMode();
      const mockConfig = getMockModeConfig();
      store = mockConfig.store;
      lineStringMode.register(mockConfig);
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
        button: "left",
      });

      let features = store.copyAll();
      expect(features.length).toBe(1);

      lineStringMode.onKeyPress({ key: "Escape" });

      features = store.copyAll();
      expect(features.length).toBe(0);
    });
  });

  describe("cleanUp", () => {
    let lineStringMode: TerraDrawLineStringMode;
    let store: GeoJSONStore;

    beforeEach(() => {
      lineStringMode = new TerraDrawLineStringMode();
      const mockConfig = getMockModeConfig();
      store = mockConfig.store;
      lineStringMode.register(mockConfig);
    });

    it("does not throw error if feature has not been created ", () => {
      expect(() => {
        lineStringMode.cleanUp();
      }).not.toThrowError();
    });

    it("cleans up correctly if drawing has started", () => {
      lineStringMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
        button: "left",
      });

      expect(store.copyAll().length).toBe(1);

      lineStringMode.cleanUp();

      // Removes the LineString that was being created
      expect(store.copyAll().length).toBe(0);
    });
  });

  describe("onDrag", () => {
    it("does nothing", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      expect(() => {
        lineStringMode.onDrag();
      }).not.toThrowError();
    });
  });

  describe("onDragStart", () => {
    it("does nothing", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      expect(() => {
        lineStringMode.onDragStart();
      }).not.toThrowError();
    });
  });

  describe("onDragEnd", () => {
    it("does nothing", () => {
      const lineStringMode = new TerraDrawLineStringMode();

      expect(() => {
        lineStringMode.onDragEnd();
      }).not.toThrowError();
    });
  });
});
