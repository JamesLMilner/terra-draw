import { GeoJSONStore } from "../store/store";
import { getMockModeConfig } from "../test/mock-config";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawPolygonMode } from "./polygon.mode";

describe("TerraDrawPolygonMode", () => {
  const defaultStyles = getDefaultStyling();

  describe("constructor", () => {
    it("constructs with no options", () => {
      const polygonMode = new TerraDrawPolygonMode();
      expect(polygonMode.mode).toBe("polygon");
      expect(polygonMode.styling).toStrictEqual(defaultStyles);
    });

    it("constructs with options", () => {
      const polygonMode = new TerraDrawPolygonMode({
        styling: { pointOutlineColor: "#ffffff" },
        allowSelfIntersections: true,
        pointerDistance: 40,
        keyEvents: {
          cancel: "Backspace",
        },
      });
      expect(polygonMode.styling).toStrictEqual({
        ...defaultStyles,
        pointOutlineColor: "#ffffff",
      });
    });
  });

  describe("lifecycle", () => {
    it("registers correctly", () => {
      const polygonMode = new TerraDrawPolygonMode();
      expect(polygonMode.state).toBe("unregistered");
      polygonMode.register(getMockModeConfig());
      expect(polygonMode.state).toBe("registered");
    });

    it("setting state directly throws error", () => {
      const polygonMode = new TerraDrawPolygonMode();

      expect(() => {
        polygonMode.state = "started";
      }).toThrowError();
    });

    it("stopping before not registering throws error", () => {
      const polygonMode = new TerraDrawPolygonMode();

      expect(() => {
        polygonMode.stop();
      }).toThrowError();
    });

    it("starting before not registering throws error", () => {
      const polygonMode = new TerraDrawPolygonMode();

      expect(() => {
        polygonMode.start();
      }).toThrowError();
    });

    it("starting before not registering throws error", () => {
      const polygonMode = new TerraDrawPolygonMode();

      expect(() => {
        polygonMode.start();
      }).toThrowError();
    });

    it("registering multiple times throws an error", () => {
      const polygonMode = new TerraDrawPolygonMode();

      expect(() => {
        polygonMode.register(getMockModeConfig());
        polygonMode.register(getMockModeConfig());
      }).toThrowError();
    });

    it("can start correctly", () => {
      const polygonMode = new TerraDrawPolygonMode();

      polygonMode.register(getMockModeConfig());
      polygonMode.start();

      expect(polygonMode.state).toBe("started");
    });

    it("can stop correctly", () => {
      const polygonMode = new TerraDrawPolygonMode();

      polygonMode.register(getMockModeConfig());
      polygonMode.start();
      polygonMode.stop();

      expect(polygonMode.state).toBe("stopped");
    });
  });

  describe("onMouseMove", () => {
    let polygonMode: TerraDrawPolygonMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;

    beforeEach(() => {
      store = new GeoJSONStore();
      polygonMode = new TerraDrawPolygonMode();
      const mockConfig = getMockModeConfig();

      store = mockConfig.store;
      onChange = mockConfig.onChange;

      polygonMode.register(mockConfig);
    });

    it("does nothing if no clicks have occurred ", () => {
      polygonMode.onMouseMove({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).not.toBeCalled();
    });

    it("updates the coordinate to the mouse position after first click", () => {
      polygonMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).toBeCalledTimes(2);

      const features = store.copyAll();
      expect(features.length).toBe(1);

      expect(features[0].geometry.coordinates).toStrictEqual([
        [
          [0, 0],
          [1, 1],
          [1, 1],
          [0, 0],
        ],
      ]);
    });

    it("updates the coordinate to the mouse position after second click", () => {
      polygonMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onClick({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 2,
        lat: 2,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).toBeCalledTimes(4);

      const features = store.copyAll();
      expect(features.length).toBe(1);

      expect(features[0].geometry.coordinates).toStrictEqual([
        [
          [0, 0],
          [1, 1],
          [2, 2],
          [0, 0],
        ],
      ]);
    });

    it("updates the coordinate to the mouse position after third click", () => {
      polygonMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onClick({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 2,
        lat: 2,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onClick({
        lng: 2,
        lat: 2,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 3,
        lat: 3,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).toBeCalledTimes(6);

      const features = store.copyAll();
      expect(features.length).toBe(1);

      expect(features[0].geometry.coordinates).toStrictEqual([
        [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
          [0, 0],
        ],
      ]);
    });
  });

  describe("onClick", () => {
    let polygonMode: TerraDrawPolygonMode;
    let store: GeoJSONStore;
    let project: jest.Mock;

    beforeEach(() => {
      polygonMode = new TerraDrawPolygonMode();

      const mockConfig = getMockModeConfig();

      store = mockConfig.store;
      project = mockConfig.project;

      polygonMode.register(mockConfig);
    });

    it("can create a polygon", () => {
      polygonMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onClick({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 2,
        lat: 2,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onClick({
        lng: 2,
        lat: 2,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 3,
        lat: 3,
        containerX: 0,
        containerY: 0,
      });

      project.mockReturnValueOnce({ x: 0, y: 0 });

      polygonMode.onClick({
        lng: 3,
        lat: 3,
        containerX: 0,
        containerY: 0,
      });

      project.mockReturnValueOnce({ x: 0, y: 0 });

      polygonMode.onClick({
        lng: 3,
        lat: 3,
        containerX: 0,
        containerY: 0,
      });

      let features = store.copyAll();
      expect(features.length).toBe(2);

      // Create a new polygon
      polygonMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      features = store.copyAll();
      expect(features.length).toBe(2);
    });

    it("can update polygon past 3 coordinates", () => {
      polygonMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onClick({
        lng: 1,
        lat: 1,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 2,
        lat: 2,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onClick({
        lng: 2,
        lat: 2,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 3,
        lat: 3,
        containerX: 0,
        containerY: 0,
      });

      project.mockReturnValueOnce({ x: 100, y: 100 });

      polygonMode.onClick({
        lng: 3,
        lat: 3,
        containerX: 0,
        containerY: 0,
      });

      polygonMode.onMouseMove({
        lng: 4,
        lat: 4,
        containerX: 0,
        containerY: 0,
      });

      project.mockReturnValueOnce({ x: 100, y: 100 });

      polygonMode.onClick({
        lng: 4,
        lat: 4,
        containerX: 0,
        containerY: 0,
      });

      let features = store.copyAll();
      expect(features.length).toBe(1);
      expect(features[0].geometry.coordinates).toStrictEqual([
        [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
          [4, 4],
          [4, 4],
          [0, 0],
        ],
      ]);

      project.mockReturnValueOnce({ x: 0, y: 0 });

      polygonMode.onClick({
        lng: 4,
        lat: 4,
        containerX: 0,
        containerY: 0,
      });

      features = store.copyAll();
      expect(features.length).toBe(1);
      expect(features[0].geometry.coordinates).toStrictEqual([
        [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
          [4, 4],

          [0, 0],
        ],
      ]);
    });

    it("does not create a polygon line if it has intersections and allowSelfIntersections is false", () => {
      polygonMode = new TerraDrawPolygonMode({ allowSelfIntersections: false });
      const mockConfig = getMockModeConfig();

      store = mockConfig.store;
      project = mockConfig.project;

      polygonMode.register(mockConfig);

      const coordOneEvent = {
        lng: 11.162109375,
        lat: 23.322080011,
        containerX: 0,
        containerY: 0,
      };
      polygonMode.onClick(coordOneEvent);

      const coordTwoEvent = {
        lng: -21.884765625,
        lat: -8.928487062,
        containerX: 0,
        containerY: 0,
      };
      polygonMode.onMouseMove(coordTwoEvent);
      polygonMode.onClick(coordTwoEvent);

      const coordThreeEvent = {
        lng: 26.894531249,
        lat: -20.468189222,
        containerX: 0,
        containerY: 0,
      };
      polygonMode.onMouseMove(coordThreeEvent);
      polygonMode.onClick(coordThreeEvent);

      // Overlapping point
      const coordFourEvent = {
        lng: -13.974609375,
        lat: 22.187404991,
        containerX: 0,
        containerY: 0,
      };
      project.mockReturnValueOnce({ x: 100, y: 100 });
      polygonMode.onMouseMove(coordFourEvent);
      polygonMode.onClick(coordFourEvent);

      let features = store.copyAll();
      expect(features.length).toBe(1);

      // Here we still have the coordinate but it's not committed
      // to the finished polygon
      expect(features[0].geometry.coordinates).toStrictEqual([
        [
          [11.162109375, 23.322080011],
          [-21.884765625, -8.928487062],
          [26.894531249, -20.468189222],
          [-13.974609375, 22.187404991],
          [11.162109375, 23.322080011],
        ],
      ]);

      const closingCoordEvent = {
        ...coordOneEvent,
      };
      polygonMode.onMouseMove(closingCoordEvent);
      project.mockReturnValueOnce({ x: 0, y: 0 });
      polygonMode.onClick(closingCoordEvent);

      features = store.copyAll();
      expect(features.length).toBe(1);
      expect(project).toBeCalledTimes(2);

      // The overlapping coordinate is not included
      expect(features[0].geometry.coordinates).toStrictEqual([
        [
          [11.162109375, 23.322080011],
          [-21.884765625, -8.928487062],
          [26.894531249, -20.468189222],
          [11.162109375, 23.322080011],
        ],
      ]);
    });
  });

  describe("onKeyPress", () => {
    let store: GeoJSONStore;
    let polygonMode: TerraDrawPolygonMode;

    beforeEach(() => {
      jest.resetAllMocks();

      polygonMode = new TerraDrawPolygonMode();

      const mockConfig = getMockModeConfig();

      store = mockConfig.store;

      polygonMode.register(mockConfig);
    });

    it("Escape - does nothing when no line is present", () => {
      polygonMode.onKeyPress({ key: "Escape" });
    });

    it("Escape - deletes the line when currently editing", () => {
      polygonMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      let features = store.copyAll();
      expect(features.length).toBe(1);

      polygonMode.onKeyPress({ key: "Escape" });

      features = store.copyAll();
      expect(features.length).toBe(0);
    });
  });

  describe("cleanUp", () => {
    let store: GeoJSONStore;
    let polygonMode: TerraDrawPolygonMode;
    let onChange: jest.Mock;
    let project: jest.Mock;

    beforeEach(() => {
      jest.resetAllMocks();
      polygonMode = new TerraDrawPolygonMode();

      const mockConfig = getMockModeConfig();
      store = mockConfig.store;
      onChange = mockConfig.onChange;
      project = mockConfig.project;

      polygonMode.register(mockConfig);
    });

    it("does not throw error if feature has not been created ", () => {
      expect(() => {
        polygonMode.cleanUp();
      }).not.toThrowError();
    });

    it("cleans up correctly if drawing has started", () => {
      polygonMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(store.copyAll().length).toBe(1);

      polygonMode.cleanUp();

      // Removes the LineString that was being created
      expect(store.copyAll().length).toBe(0);
    });
  });

  describe("onDrag", () => {
    it("does nothing", () => {
      const polygonMode = new TerraDrawPolygonMode();
      polygonMode.register(getMockModeConfig());

      expect(() => {
        polygonMode.onDrag();
      }).not.toThrowError();
    });
  });

  describe("onDragStart", () => {
    it("does nothing", () => {
      const polygonMode = new TerraDrawPolygonMode();
      polygonMode.register(getMockModeConfig());

      expect(() => {
        polygonMode.onDragStart();
      }).not.toThrowError();
    });
  });

  describe("onDragEnd", () => {
    it("does nothing", () => {
      const polygonMode = new TerraDrawPolygonMode();
      polygonMode.register(getMockModeConfig());

      expect(() => {
        polygonMode.onDragEnd();
      }).not.toThrowError();
    });
  });
});
