import { GeoJSONStore } from "../store/store";
import { getDefaultStyling } from "../util/styling";
import { TerraDrawSelectMode } from "./select.mode";

describe("TerraDrawSelectMode", () => {
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

  describe("register", () => {
    let selectMode: TerraDrawSelectMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;
    let project: jest.Mock;

    beforeEach(() => {
      store = new GeoJSONStore();
      selectMode = new TerraDrawSelectMode();
      onChange = jest.fn();
      project = jest.fn();
    });

    it("registers correctly", () => {
      selectMode.register({
        onChange: onChange as any,
        onSelect: (selectedId: string) => {},
        onDeselect: () => {},
        store,
        project,
      });
    });
  });

  describe("onClick", () => {
    let selectMode: TerraDrawSelectMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;
    let project: jest.Mock;
    let onSelect: jest.Mock;
    let onDeselect: jest.Mock;

    beforeEach(() => {
      store = new GeoJSONStore();
      selectMode = new TerraDrawSelectMode();
      onChange = jest.fn();
      project = jest.fn();
      onSelect = jest.fn();
      onDeselect = jest.fn();

      selectMode.register({
        store,
        onChange,
        project,
        onSelect,
        onDeselect,
      });
    });

    it("does not select if no features", () => {
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

      selectMode.onClick({
        lng: 0.5,
        lat: 0.5,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);

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

      selectMode.onClick({
        lng: 0.5,
        lat: 0.5,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(1);

      // first polygon selected set to true
      expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update");

      // create selection points
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

      selectMode.onClick({
        lng: 2.5,
        lat: 2.5,
        containerX: 0,
        containerY: 0,
      });

      expect(onSelect).toBeCalledTimes(2);

      // deselect first polygon selected set to false
      expect(onChange).toHaveBeenNthCalledWith(5, idOne, "update");

      // delete first polygon seelection points
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

      // second polygon selected set to true
      expect(onChange).toHaveBeenNthCalledWith(7, idTwo, "update");
    });

    it("deselects if a feature already selected but click is not on a new feature", () => {
      store.create([{ geometry: { type: "Point", coordinates: [0, 0] } }]);

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
    let selectMode: TerraDrawSelectMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;
    let project: jest.Mock;
    let onSelect: jest.Mock;
    let onDeselect: jest.Mock;

    beforeEach(() => {
      store = new GeoJSONStore();
      selectMode = new TerraDrawSelectMode();
      onChange = jest.fn();
      project = jest.fn();
      onSelect = jest.fn();
      onDeselect = jest.fn();

      selectMode.register({
        store,
        onChange,
        project,
        onSelect,
        onDeselect,
      });
    });

    describe("Delete", () => {
      it("does nothing with no features selected", () => {
        selectMode.onKeyPress({ key: "Delete" });

        expect(onChange).not.toBeCalled();
        expect(onDeselect).not.toBeCalled();
      });

      it("deletes when feature is selected", () => {
        store.create([{ geometry: { type: "Point", coordinates: [0, 0] } }]);

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

  describe("onMouseMove", () => {
    let selectMode: TerraDrawSelectMode;
    let store: GeoJSONStore;
    let onChange: jest.Mock;
    let project: jest.Mock;
    let onSelect: jest.Mock;
    let onDeselect: jest.Mock;

    beforeEach(() => {
      store = new GeoJSONStore();
      selectMode = new TerraDrawSelectMode();
      onChange = jest.fn();
      project = jest.fn();
      onSelect = jest.fn();
      onDeselect = jest.fn();

      selectMode.register({
        store,
        onChange,
        project,
        onSelect,
        onDeselect,
      });
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
