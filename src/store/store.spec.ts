import { GeoJSONStore } from "./store";

describe("GeoJSONStore", () => {
  describe("creates", () => {
    it("Point", () => {
      const store = new GeoJSONStore();

      const id = store.create({ type: "Point", coordinates: [0, 0] });

      expect(typeof id).toBe("string");
      expect(id.length).toBe(36);
    });

    it("LineString", () => {
      const store = new GeoJSONStore();

      const id = store.create({
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      });

      expect(typeof id).toBe("string");
      expect(id.length).toBe(36);
    });

    it("Polygon", () => {
      const store = new GeoJSONStore();

      const id = store.create({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 1],
            [2, 2],
            [0, 0],
          ],
        ],
      });

      expect(typeof id).toBe("string");
      expect(id.length).toBe(36);
    });
  });

  describe("delete", () => {
    it("removes geometry from the store", () => {
      const store = new GeoJSONStore();

      const id = store.create({ type: "Point", coordinates: [0, 0] });

      store.delete(id);

      expect(() => {
        store.getGeometryCopy(id);
      }).toThrowError();
    });

    it("throws error if feature does not exist", () => {
      const store = new GeoJSONStore();

      expect(() => {
        store.delete("non-existant-id");
      }).toThrowError();
    });
  });

  describe("getGeometryCopy", () => {
    it("copy existing geometry", () => {
      const store = new GeoJSONStore();

      const id = store.create({ type: "Point", coordinates: [0, 0] });

      expect(store.getGeometryCopy(id)).toStrictEqual({
        type: "Point",
        coordinates: [0, 0],
      });
    });

    it("throws error on missing feature", () => {
      const store = new GeoJSONStore();

      expect(() => {
        store.getGeometryCopy("non-existant-id");
      }).toThrowError();
    });
  });

  describe("updateGeometry", () => {
    it("updates geometry", () => {
      const store = new GeoJSONStore();

      const id = store.create({ type: "Point", coordinates: [0, 0] });

      store.updateGeometry(id, { type: "Point", coordinates: [1, 1] });

      expect(store.getGeometryCopy(id)).toStrictEqual({
        type: "Point",
        coordinates: [1, 1],
      });
    });

    it("throws error on missing feature", () => {
      const store = new GeoJSONStore();

      expect(() => {
        store.updateGeometry("non-existant-id", {
          type: "Point",
          coordinates: [1, 1],
        });
      }).toThrowError();
    });
  });

  describe("registerOnChange", () => {
    it("registerOnChange", () => {
      const store = new GeoJSONStore();

      const mockCallback = jest.fn();
      store.registerOnChange(mockCallback);

      const id = store.create({ type: "Point", coordinates: [0, 0] });

      store.updateGeometry(id, { type: "Point", coordinates: [1, 1] });
      store.delete(id);

      expect(mockCallback).toBeCalledTimes(3);
      expect(mockCallback).toHaveBeenNthCalledWith(1, id, "create");
      expect(mockCallback).toHaveBeenNthCalledWith(2, id, "update");
      expect(mockCallback).toHaveBeenNthCalledWith(3, id, "delete");
    });
  });

  describe("delete", () => {
    it("deletes feature", () => {
      const store = new GeoJSONStore();

      const id = store.create({ type: "Point", coordinates: [0, 0] });
      store.delete(id);

      // No longer exists so should throw errors
      expect(() => store.getGeometryCopy(id)).toThrowError();
      expect(() =>
        store.updateGeometry(id, { type: "Point", coordinates: [1, 1] })
      ).toThrowError();
    });
  });

  describe("copyAll", () => {
    it("creates a copy of the stores features", () => {
      const store = new GeoJSONStore();

      const mockCallback = jest.fn();
      store.registerOnChange(mockCallback);

      const one = store.create({ type: "Point", coordinates: [0, 0] });
      const two = store.create({ type: "Point", coordinates: [1, 1] });

      const copies = store.copyAll();

      const ids = copies.map((f) => f.id);

      expect(ids.includes(one)).toBe(true);
      expect(ids.includes(two)).toBe(true);
    });
  });
});
