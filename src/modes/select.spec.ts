import { GeoJSONStore } from "../store/store";
import { getMockModeConfig } from "../test/mock-config";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawSelectMode } from "./select.mode";

describe("TerraDrawSelectMode", () => {
  let selectMode: TerraDrawSelectMode;
  let store: GeoJSONStore;
  let onChange: jest.Mock;
  let setCursor: jest.Mock;
  let project: jest.Mock;
  let unproject: jest.Mock;
  let onSelect: jest.Mock;
  let onDeselect: jest.Mock;

  beforeEach(() => {
    selectMode = new TerraDrawSelectMode();

    const mockConfig = getMockModeConfig();
    store = mockConfig.store;
    onChange = mockConfig.onChange;
    project = mockConfig.project;
    unproject = mockConfig.unproject;
    onSelect = mockConfig.onSelect;
    onDeselect = mockConfig.onDeselect;
    setCursor = mockConfig.setCursor;

    selectMode.register(mockConfig);
  });

  const mockClickBoundingBox = (
    bbox: [
      [number, number],
      [number, number],
      [number, number],
      [number, number]
    ] = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]
  ) => {
    unproject
      .mockReturnValueOnce({ lng: bbox[0][0], lat: bbox[0][1] })
      .mockReturnValueOnce({ lng: bbox[1][0], lat: bbox[1][1] })
      .mockReturnValueOnce({ lng: bbox[2][0], lat: bbox[2][1] })
      .mockReturnValueOnce({ lng: bbox[3][0], lat: bbox[3][1] })
      .mockReturnValueOnce({ lng: bbox[0][0], lat: bbox[0][1] });
  };

  describe("constructor", () => {
    it("constructs", () => {
      const selectMode = new TerraDrawSelectMode();
      expect(selectMode.mode).toBe("select");
      expect(selectMode.styling).toStrictEqual(getDefaultStyling());
    });

    it("constructs with options", () => {
      const selectMode = new TerraDrawSelectMode({
        pointerDistance: 40,
        styling: { ...getDefaultStyling(), selectedColor: "#ffffff" },
        keyEvents: {
          deselect: "Backspace",
          delete: "d",
        },
      });

      expect(selectMode.styling).toStrictEqual({
        ...getDefaultStyling(),
        selectedColor: "#ffffff",
      });
    });
  });

  describe("lifecycle", () => {
    it("registers correctly", () => {
      const selectMode = new TerraDrawSelectMode();
      expect(selectMode.state).toBe("unregistered");
      selectMode.register(getMockModeConfig());
      expect(selectMode.state).toBe("registered");
    });

    it("setting state directly throws error", () => {
      const selectMode = new TerraDrawSelectMode();

      expect(() => {
        selectMode.state = "started";
      }).toThrowError();
    });

    it("stopping before not registering throws error", () => {
      const selectMode = new TerraDrawSelectMode();

      expect(() => {
        selectMode.stop();
      }).toThrowError();
    });

    it("starting before not registering throws error", () => {
      const selectMode = new TerraDrawSelectMode();

      expect(() => {
        selectMode.start();
      }).toThrowError();
    });

    it("starting before not registering throws error", () => {
      const selectMode = new TerraDrawSelectMode();

      expect(() => {
        selectMode.start();
      }).toThrowError();
    });

    it("registering multiple times throws an error", () => {
      const selectMode = new TerraDrawSelectMode();

      expect(() => {
        selectMode.register(getMockModeConfig());
        selectMode.register(getMockModeConfig());
      }).toThrowError();
    });

    it("can start correctly", () => {
      const selectMode = new TerraDrawSelectMode();

      selectMode.register(getMockModeConfig());
      selectMode.start();

      expect(selectMode.state).toBe("started");
    });

    it("can stop correctly", () => {
      const selectMode = new TerraDrawSelectMode();

      selectMode.register(getMockModeConfig());
      selectMode.start();
      selectMode.stop();

      expect(selectMode.state).toBe("stopped");
    });
  });

  describe("onClick", () => {
    it("does not select if no features", () => {
      mockClickBoundingBox();

      selectMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).not.toBeCalled();
      expect(onDeselect).not.toBeCalled();
      expect(onSelect).not.toBeCalled();
    });

    it("Point - does select if feature is clicked", () => {
      store.create([{ geometry: { type: "Point", coordinates: [0, 0] } }]);

      mockClickBoundingBox([
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 1],
      ]);

      project.mockReturnValueOnce({
        x: 0,
        y: 0,
      });

      selectMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);
    });

    it("Point - does not select if feature is not clicked", () => {
      store.create([{ geometry: { type: "Point", coordinates: [0, 0] } }]);

      mockClickBoundingBox([
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 1],
      ]);

      project.mockReturnValueOnce({
        x: 0,
        y: 0,
      });

      selectMode.onClick({
        lng: 50,
        lat: 100,
        containerX: 100,
        containerY: 100,
      });

      expect(onSelect).toBeCalledTimes(0);
    });

    it("LineString - does select if feature is clicked", () => {
      store.create([
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
      ]);

      mockClickBoundingBox([
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 1],
      ]);

      project
        .mockReturnValueOnce({
          x: 0,
          y: 0,
        })
        .mockReturnValueOnce({
          x: 0,
          y: 0,
        });

      selectMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);
    });

    it("LineString - does not select if feature is not clicked", () => {
      store.create([
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
      ]);

      mockClickBoundingBox([
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 1],
      ]);

      project
        .mockReturnValueOnce({
          x: 0,
          y: 0,
        })
        .mockReturnValueOnce({
          x: 0,
          y: 0,
        });

      selectMode.onClick({
        lng: 50,
        lat: 100,
        containerX: 100,
        containerY: 100,
      });

      expect(onSelect).toBeCalledTimes(0);
    });

    it("Polygon - does select if feature is clicked", () => {
      // Square Polygon
      store.create([
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
        },
      ]);

      mockClickBoundingBox([
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 1],
      ]);

      selectMode.onClick({
        lng: 0.5,
        lat: 0.5,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);
    });

    it("Polygon - does not select if feature is not clicked", () => {
      // Square Polygon
      store.create([
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
        },
      ]);

      mockClickBoundingBox([
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 1],
      ]);

      selectMode.onClick({
        lng: 2,
        lat: 2,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(0);
    });

    it("ignores selection points when selecting", () => {
      // Square Polygon
      store.create([
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
        },
      ]);

      mockClickBoundingBox([
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 1],
      ]);

      selectMode.onClick({
        lng: 0.5,
        lat: 0.5,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);

      mockClickBoundingBox([
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 1],
      ]);

      selectMode.onClick({
        lng: 0.0,
        lat: 0.0,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);
    });

    it("ignores selection points when selecting", () => {
      // Square Polygon
      store.create([
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
        },
      ]);

      store.create([
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [2, 2],
                [2, 3],
                [3, 3],
                [3, 2],
                [2, 2],
              ],
            ],
          },
        },
      ]);

      expect(onChange).toHaveBeenNthCalledWith(
        1,
        [expect.any(String)],
        "create"
      );
      expect(onChange).toHaveBeenNthCalledWith(
        2,
        [expect.any(String)],
        "create"
      );

      // Store the ids of the created features
      const idOne = onChange.mock.calls[0][0];
      const idTwo = onChange.mock.calls[1][0];

      mockClickBoundingBox([
        [0, 0],
        [0, 5],
        [5, 5],
        [0, 5],
      ]);

      // Select polygon
      selectMode.onClick({
        lng: 0.5,
        lat: 0.5,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);

      // First polygon selected set to true
      expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update");

      // Create selection points
      expect(onChange).toHaveBeenNthCalledWith(
        4,
        [
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
        ],
        "create"
      );

      mockClickBoundingBox([
        [0, 0],
        [0, 5],
        [5, 5],
        [0, 5],
      ]);

      // Deselect first polygon, select second
      selectMode.onClick({
        lng: 2.5,
        lat: 2.5,
        containerX: 0,
        containerY: 0,
      });

      // Second polygon selected
      expect(onSelect).toBeCalledTimes(2);

      // Deselect first polygon selected set to false
      expect(onDeselect).toBeCalledTimes(1);
      expect(onChange).toHaveBeenNthCalledWith(5, idOne, "update");

      // Delete first polygon seelection points
      expect(onChange).toHaveBeenNthCalledWith(
        6,
        [
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
        ],
        "delete"
      );

      // Second polygon selected set to true
      expect(onChange).toHaveBeenNthCalledWith(7, idTwo, "update");
    });

    it("deselects if a feature already selected but click is not on a new feature", () => {
      store.create([{ geometry: { type: "Point", coordinates: [0, 0] } }]);

      mockClickBoundingBox();

      project
        .mockReturnValueOnce({
          x: 0,
          y: 0,
        })
        .mockReturnValueOnce({
          x: 0,
          y: 0,
        });

      selectMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);

      mockClickBoundingBox();

      selectMode.onClick({
        lng: 50,
        lat: 50,
        containerX: 50,
        containerY: 50,
      });

      expect(onSelect).toBeCalledTimes(1);
      expect(onDeselect).toBeCalledTimes(1);
    });
  });

  describe("onKeyPress", () => {
    describe("Delete", () => {
      it("does nothing with no features selected", () => {
        selectMode.onKeyPress({ key: "Delete" });

        expect(onChange).not.toBeCalled();
        expect(onDeselect).not.toBeCalled();
      });

      it("deletes when feature is selected", () => {
        store.create([{ geometry: { type: "Point", coordinates: [0, 0] } }]);

        mockClickBoundingBox();

        project.mockReturnValueOnce({
          x: 0,
          y: 0,
        });

        // Select created feature
        selectMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onChange).toBeCalledTimes(2);
        expect(onChange).toHaveBeenNthCalledWith(
          2,
          [expect.any(String)],
          "update"
        );

        expect(onSelect).toBeCalledTimes(1);

        selectMode.onKeyPress({ key: "Delete" });

        expect(onDeselect).toBeCalledTimes(1);

        expect(onChange).toBeCalledTimes(3);
        expect(onChange).toHaveBeenNthCalledWith(
          3,
          [expect.any(String)],
          "delete"
        );
      });
    });

    describe("Escape", () => {
      it("does nothing with no features selected", () => {
        selectMode.onKeyPress({ key: "Escape" });

        expect(onChange).not.toBeCalled();
        expect(onDeselect).not.toBeCalled();
      });

      it("does nothing with no features selected", () => {
        store.create([{ geometry: { type: "Point", coordinates: [0, 0] } }]);

        mockClickBoundingBox();

        project.mockReturnValueOnce({
          x: 0,
          y: 0,
        });

        selectMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onSelect).toBeCalledTimes(1);

        selectMode.onKeyPress({ key: "Escape" });

        expect(onChange).toBeCalledTimes(3);
        expect(onDeselect).toBeCalledTimes(1);
      });
    });
  });

  describe("onDragStart", () => {
    it("nothing selected, nothing changes", () => {
      selectMode.onDragStart(
        {
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        },
        jest.fn()
      );

      expect(onChange).toBeCalledTimes(0);
      expect(onDeselect).toBeCalledTimes(0);
      expect(onSelect).toBeCalledTimes(0);
      expect(project).toBeCalledTimes(0);
    });

    it("does not trigger starting of drag events if mode not draggable", () => {
      store.create([{ geometry: { type: "Point", coordinates: [0, 0] } }]);

      mockClickBoundingBox();

      project.mockReturnValueOnce({
        x: 0,
        y: 0,
      });

      selectMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);

      const setMapDraggability = jest.fn();
      selectMode.onDragStart(
        {
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        },
        setMapDraggability
      );
      expect(setCursor).not.toBeCalled();
      expect(setMapDraggability).not.toBeCalled();
    });

    it("does trigger onDragStart events if mode is draggable", () => {
      selectMode = new TerraDrawSelectMode({
        draggable: [{ mode: "point", coordinate: false, feature: true }],
      });

      const mockConfig = getMockModeConfig();
      onChange = mockConfig.onChange;
      project = mockConfig.project;
      unproject = mockConfig.unproject;
      onSelect = mockConfig.onSelect;
      onDeselect = mockConfig.onDeselect;
      setCursor = mockConfig.setCursor;
      store = mockConfig.store;
      selectMode.register(mockConfig);

      store.create([
        {
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { mode: "point" },
        },
      ]);

      mockClickBoundingBox();

      project.mockReturnValueOnce({
        x: 0,
        y: 0,
      });

      selectMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);

      const setMapDraggability = jest.fn();
      selectMode.onDragStart(
        {
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        },
        setMapDraggability
      );
      expect(setCursor).toBeCalled();
      expect(setMapDraggability).toBeCalled();
    });
  });

  describe("onDrag", () => {
    it("nothing selected, nothing changes", () => {
      selectMode.onDrag({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).toBeCalledTimes(0);
      expect(onDeselect).toBeCalledTimes(0);
      expect(onSelect).toBeCalledTimes(0);
      expect(project).toBeCalledTimes(0);
    });

    it("does not trigger drag events if mode not draggable", () => {
      store.create([{ geometry: { type: "Point", coordinates: [0, 0] } }]);

      project.mockReturnValueOnce({
        x: 0,
        y: 0,
      });

      mockClickBoundingBox();

      selectMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);
      expect(onChange).toBeCalledTimes(2);

      selectMode.onDrag({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onChange).toBeCalledTimes(2);
    });

    describe("drag feature", () => {
      it("does not trigger coordinate dragging for points", () => {
        selectMode = new TerraDrawSelectMode({
          draggable: [{ mode: "point", coordinate: true, feature: true }],
        });

        const mockConfig = getMockModeConfig();
        onChange = mockConfig.onChange;
        project = mockConfig.project;
        unproject = mockConfig.unproject;
        onSelect = mockConfig.onSelect;
        onDeselect = mockConfig.onDeselect;
        setCursor = mockConfig.setCursor;
        store = mockConfig.store;
        selectMode.register(mockConfig);

        store.create([
          {
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: { mode: "point" },
          },
        ]);

        mockClickBoundingBox();

        project.mockReturnValueOnce({
          x: 0,
          y: 0,
        });

        selectMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onSelect).toBeCalledTimes(1);
        expect(onChange).toBeCalledTimes(2);

        selectMode.onDrag({
          lng: 1,
          lat: 1,
          containerX: 1,
          containerY: 1,
        });

        expect(onChange).toBeCalledTimes(3);
      });

      it("does trigger drag events if mode is draggable for point", () => {
        selectMode = new TerraDrawSelectMode({
          draggable: [{ mode: "point", coordinate: false, feature: true }],
        });

        const mockConfig = getMockModeConfig();
        onChange = mockConfig.onChange;
        project = mockConfig.project;
        unproject = mockConfig.unproject;
        onSelect = mockConfig.onSelect;
        onDeselect = mockConfig.onDeselect;
        setCursor = mockConfig.setCursor;
        store = mockConfig.store;
        selectMode.register(mockConfig);

        store.create([
          {
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: { mode: "point" },
          },
        ]);

        project.mockReturnValueOnce({
          x: 0,
          y: 0,
        });

        mockClickBoundingBox();

        selectMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onSelect).toBeCalledTimes(1);
        expect(onChange).toBeCalledTimes(2);

        selectMode.onDrag({
          lng: 1,
          lat: 1,
          containerX: 1,
          containerY: 1,
        });

        expect(onChange).toBeCalledTimes(3);
      });

      it("does trigger drag events if mode is draggable for linestring", () => {
        selectMode = new TerraDrawSelectMode({
          draggable: [{ mode: "linestring", coordinate: false, feature: true }],
        });

        const mockConfig = getMockModeConfig();
        onChange = mockConfig.onChange;
        project = mockConfig.project;
        unproject = mockConfig.unproject;
        onSelect = mockConfig.onSelect;
        onDeselect = mockConfig.onDeselect;
        setCursor = mockConfig.setCursor;
        store = mockConfig.store;
        selectMode.register(mockConfig);

        store.create([
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0],
                [1, 1],
              ],
            },
            properties: { mode: "linestring" },
          },
        ]);

        project
          .mockReturnValueOnce({
            x: 0,
            y: 0,
          })
          .mockReturnValueOnce({
            x: 1,
            y: 1,
          });

        mockClickBoundingBox();

        selectMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onSelect).toBeCalledTimes(1);
        expect(onChange).toBeCalledTimes(3);

        selectMode.onDragStart(
          {
            lng: 1,
            lat: 1,
            containerX: 1,
            containerY: 1,
          },
          jest.fn()
        );

        selectMode.onDrag({
          lng: 1,
          lat: 1,
          containerX: 1,
          containerY: 1,
        });

        expect(onChange).toBeCalledTimes(5);
      });

      it("does trigger drag events if mode is draggable for polygon", () => {
        selectMode = new TerraDrawSelectMode({
          draggable: [{ mode: "polygon", coordinate: false, feature: true }],
        });

        const mockConfig = getMockModeConfig();

        onChange = mockConfig.onChange;
        unproject = mockConfig.unproject;
        project = mockConfig.project;
        onSelect = mockConfig.onSelect;
        onDeselect = mockConfig.onDeselect;
        setCursor = mockConfig.setCursor;
        store = mockConfig.store;
        selectMode.register(mockConfig);

        store.create([
          {
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ],
              ],
            },
            properties: { mode: "polygon" },
          },
        ]);

        mockClickBoundingBox();

        project
          .mockReturnValueOnce({
            x: 0,
            y: 0,
          })
          .mockReturnValueOnce({
            x: 1,
            y: 1,
          });

        selectMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onSelect).toBeCalledTimes(1);
        expect(onChange).toBeCalledTimes(3);

        selectMode.onDragStart(
          {
            lng: 1,
            lat: 1,
            containerX: 1,
            containerY: 1,
          },
          jest.fn()
        );

        selectMode.onDrag({
          lng: 1,
          lat: 1,
          containerX: 1,
          containerY: 1,
        });

        expect(onChange).toBeCalledTimes(5);
      });
    });

    describe("drag coordinate", () => {
      it("does trigger drag events if mode is draggable for linestring", () => {
        selectMode = new TerraDrawSelectMode({
          draggable: [{ mode: "linestring", coordinate: true, feature: false }],
        });

        const mockConfig = getMockModeConfig();
        onChange = mockConfig.onChange;
        project = mockConfig.project;
        unproject = mockConfig.unproject;
        onSelect = mockConfig.onSelect;
        onDeselect = mockConfig.onDeselect;
        setCursor = mockConfig.setCursor;
        store = mockConfig.store;
        selectMode.register(mockConfig);

        // We want to account for ignoring points branch
        store.create([
          {
            geometry: {
              type: "Point",
              coordinates: [100, 89],
            },
            properties: { mode: "point" },
          },
        ]);

        expect(onChange).toBeCalledTimes(1);

        store.create([
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0],
                [1, 1],
              ],
            },
            properties: { mode: "linestring" },
          },
        ]);

        expect(onChange).toBeCalledTimes(2);

        mockClickBoundingBox();

        project
          .mockReturnValueOnce({
            x: 100,
            y: 100,
          })
          .mockReturnValue({
            x: 0,
            y: 0,
          });

        selectMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onSelect).toBeCalledTimes(1);
        expect(onChange).toBeCalledTimes(4);

        selectMode.onDragStart(
          {
            lng: 1,
            lat: 1,
            containerX: 1,
            containerY: 1,
          },
          jest.fn()
        );

        selectMode.onDrag({
          lng: 1,
          lat: 1,
          containerX: 1,
          containerY: 1,
        });

        expect(onChange).toBeCalledTimes(5);
      });

      it("does trigger drag events if mode is draggable for polygon", () => {
        selectMode = new TerraDrawSelectMode({
          draggable: [{ mode: "polygon", coordinate: true, feature: false }],
        });

        const mockConfig = getMockModeConfig();
        onChange = mockConfig.onChange;
        project = mockConfig.project;
        unproject = mockConfig.unproject;
        onSelect = mockConfig.onSelect;
        onDeselect = mockConfig.onDeselect;
        setCursor = mockConfig.setCursor;
        store = mockConfig.store;
        selectMode.register(mockConfig);

        // We want to account for ignoring points branch
        store.create([
          {
            geometry: {
              type: "Point",
              coordinates: [100, 89],
            },
            properties: { mode: "point" },
          },
        ]);

        expect(onChange).toBeCalledTimes(1);

        store.create([
          {
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ],
              ],
            },
            properties: { mode: "polygon" },
          },
        ]);

        expect(onChange).toBeCalledTimes(2);

        mockClickBoundingBox();

        project
          .mockReturnValueOnce({
            x: 100,
            y: 100,
          })
          .mockReturnValue({
            x: 0,
            y: 0,
          });

        selectMode.onClick({
          lng: 0,
          lat: 0,
          containerX: 0,
          containerY: 0,
        });

        expect(onSelect).toBeCalledTimes(1);
        expect(onChange).toBeCalledTimes(4);

        selectMode.onDragStart(
          {
            lng: 1,
            lat: 1,
            containerX: 1,
            containerY: 1,
          },
          jest.fn()
        );

        selectMode.onDrag({
          lng: 1,
          lat: 1,
          containerX: 1,
          containerY: 1,
        });

        expect(onChange).toBeCalledTimes(5);
      });
    });

    it("does trigger drag events if mode is draggable for polygon", () => {
      selectMode = new TerraDrawSelectMode({
        draggable: [{ mode: "polygon", coordinate: true, feature: false }],
      });

      const mockConfig = getMockModeConfig();
      onChange = mockConfig.onChange;
      project = mockConfig.project;
      unproject = mockConfig.unproject;
      onSelect = mockConfig.onSelect;
      onDeselect = mockConfig.onDeselect;
      setCursor = mockConfig.setCursor;
      store = mockConfig.store;
      selectMode.register(mockConfig);

      store.create([
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
          properties: { mode: "polygon" },
        },
      ]);

      mockClickBoundingBox();

      project.mockReturnValue({
        x: 0,
        y: 0,
      });

      selectMode.onClick({
        lng: 0,
        lat: 0,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);
      expect(onChange).toBeCalledTimes(3);

      selectMode.onDragStart(
        {
          lng: 1,
          lat: 1,
          containerX: 1,
          containerY: 1,
        },
        jest.fn()
      );

      selectMode.onDrag({
        lng: 1,
        lat: 1,
        containerX: 1,
        containerY: 1,
      });

      expect(onChange).toBeCalledTimes(4);
    });
  });

  describe("onDragEnd", () => {
    let selectMode: TerraDrawSelectMode;
    let setCursor: jest.Mock;

    beforeEach(() => {
      selectMode = new TerraDrawSelectMode();

      const mockConfig = getMockModeConfig();
      setCursor = mockConfig.setCursor;

      selectMode.register(mockConfig);
    });

    it("sets map draggability back to false, sets cursor to default", () => {
      const setMapDraggability = jest.fn();
      selectMode.onDragEnd(
        { lng: 1, lat: 1, containerX: 1, containerY: 1 },
        setMapDraggability
      );

      expect(setMapDraggability).toBeCalledTimes(1);
      expect(setMapDraggability).toBeCalledWith(true);
      expect(setCursor).toBeCalledTimes(1);
      expect(setCursor).toBeCalledWith("grab");
    });
  });

  describe("onMouseMove", () => {
    let selectMode: TerraDrawSelectMode;
    let onChange: jest.Mock;
    let project: jest.Mock;
    let onSelect: jest.Mock;
    let onDeselect: jest.Mock;

    beforeEach(() => {
      selectMode = new TerraDrawSelectMode();

      const mockConfig = getMockModeConfig();
      onChange = mockConfig.onChange;
      project = mockConfig.project;
      onSelect = mockConfig.onSelect;
      onDeselect = mockConfig.onDeselect;

      selectMode.register(mockConfig);
    });

    it("does nothing", () => {
      selectMode.onMouseMove();

      expect(onChange).toBeCalledTimes(0);
      expect(onDeselect).toBeCalledTimes(0);
      expect(onSelect).toBeCalledTimes(0);
      expect(project).toBeCalledTimes(0);
    });
  });

  describe("onSelect", () => {
    let selectMode: TerraDrawSelectMode;
    let store: GeoJSONStore;

    beforeEach(() => {
      store = new GeoJSONStore();
      selectMode = new TerraDrawSelectMode();
    });
    it("no op for unregistered onSelect function", () => {
      selectMode.onSelect("test-id");
    });
  });

  describe("onDeselect", () => {
    let selectMode: TerraDrawSelectMode;
    let store: GeoJSONStore;

    beforeEach(() => {
      store = new GeoJSONStore();
      selectMode = new TerraDrawSelectMode();
    });
    it("no op for unregistered onSelect function", () => {
      selectMode.onDeselect("id");
    });
  });
});
