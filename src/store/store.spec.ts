import { GeoJSONStore } from "./store";
import { StoreValidationErrors } from "./store-feature-validation";

describe("GeoJSONStore", () => {
	describe("creates", () => {
		it("Point", () => {
			const store = new GeoJSONStore();

			const [id] = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			expect(id).toBeUUID4();
		});

		it("LineString", () => {
			const store = new GeoJSONStore();

			const [id] = store.create<string>([
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

			expect(typeof id).toBe("string");
			expect(id.length).toBe(36);
		});

		it("Polygon", () => {
			const store = new GeoJSONStore();

			const [id] = store.create<string>([
				{
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[1, 1],
								[2, 2],
								[0, 0],
							],
						],
					},
				},
			]);

			expect(typeof id).toBe("string");
			expect(id.length).toBe(36);
		});
	});

	describe("has", () => {
		it("returns false for non exisiting store feature", () => {
			const store = new GeoJSONStore();

			expect(store.has("e3ccd3b9-afb1-4f0b-91d8-22a768d5f284")).toBe(false);
		});

		it("returns true for existing store feature", () => {
			const store = new GeoJSONStore();

			const [id] = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			expect(store.has(id)).toBe(true);
		});
	});

	describe("delete", () => {
		it("removes geometry from the store", () => {
			const store = new GeoJSONStore();

			const ids = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			store.delete(ids);

			expect(() => {
				store.getGeometryCopy(ids[0]);
			}).toThrowError();
		});

		it("throws error if feature does not exist", () => {
			const store = new GeoJSONStore();

			expect(() => {
				store.delete(["non-existant-id"]);
			}).toThrowError();
		});
	});

	describe("size", () => {
		it("gets zero size on initialisation", () => {
			const store = new GeoJSONStore();
			expect(store.size()).toBe(0);
		});

		it("gets size one after feature added", () => {
			const store = new GeoJSONStore();

			store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			expect(store.size()).toBe(1);
		});
	});

	describe("clear", () => {
		it("removes all data from store", () => {
			const store = new GeoJSONStore();

			const ids = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			store.clear();

			expect(store.size()).toBe(0);

			expect(() => {
				store.getGeometryCopy(ids[0]);
			}).toThrowError();
		});
	});

	describe("getGeometryCopy", () => {
		it("copy existing geometry", () => {
			const store = new GeoJSONStore();

			const ids = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			expect(store.getGeometryCopy(ids[0])).toStrictEqual({
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

	describe("getPropertiesCopy", () => {
		it("copy existing properties", () => {
			const store = new GeoJSONStore();

			const ids = store.create<string>([
				{
					geometry: { type: "Point", coordinates: [0, 0] },
					properties: { mode: "test" },
				},
			]);

			expect(store.getPropertiesCopy(ids[0])).toStrictEqual({
				createdAt: expect.any(Number),
				updatedAt: expect.any(Number),
				mode: "test",
			});
		});

		it("do not expect createdAt and updatedAt in returned properties if flag is disabled", () => {
			const store = new GeoJSONStore({ tracked: false });

			const ids = store.create<string>([
				{
					geometry: { type: "Point", coordinates: [0, 0] },
					properties: { mode: "test" },
				},
			]);

			expect(store.getPropertiesCopy(ids[0])).toStrictEqual({
				mode: "test",
			});
		});

		it("return original createdAt and updatedAt properties if originally created with them", () => {
			const store = new GeoJSONStore();

			const createdAt = +new Date();
			const ids = store.create<string>([
				{
					geometry: { type: "Point", coordinates: [0, 0] },
					properties: {
						mode: "test",
						createdAt: createdAt,
						updatedAt: createdAt,
					},
				},
			]);

			expect(store.getPropertiesCopy(ids[0])).toStrictEqual({
				mode: "test",
				createdAt: createdAt,
				updatedAt: createdAt,
			});
		});

		it("throws error on missing feature", () => {
			const store = new GeoJSONStore();

			expect(() => {
				store.getPropertiesCopy("non-existant-id");
			}).toThrowError();
		});
	});

	describe("updateGeometry", () => {
		it("updates geometry", () => {
			const store = new GeoJSONStore();

			const [id] = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			store.updateGeometry([
				{ id, geometry: { type: "Point", coordinates: [1, 1] } },
			]);

			expect(store.getGeometryCopy(id)).toStrictEqual({
				type: "Point",
				coordinates: [1, 1],
			});
		});

		it("throws error on missing feature", () => {
			const store = new GeoJSONStore();

			expect(() => {
				store.updateGeometry([
					{
						id: "non-existant-id",
						geometry: {
							type: "Point",
							coordinates: [1, 1],
						},
					},
				]);
			}).toThrowError();
		});
	});

	describe("updateProperty", () => {
		it("updates geometry", () => {
			const store = new GeoJSONStore();

			const [id] = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			store.updateProperty([{ id, property: "test", value: 1 }]);

			expect(store.copyAll()[0].properties).toStrictEqual({
				test: 1,
				createdAt: expect.any(Number),
				updatedAt: expect.any(Number),
			});
		});

		it("throws error on missing feature", () => {
			const store = new GeoJSONStore();

			expect(() => {
				store.updateProperty([
					{ id: "non-existant-id", property: "test", value: 1 },
				]);
			}).toThrowError();
		});
	});

	describe("registerOnChange", () => {
		it("registerOnChange", () => {
			const store = new GeoJSONStore();

			const mockCallback = jest.fn();
			store.registerOnChange(mockCallback);

			const [id] = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			store.updateGeometry([
				{ id, geometry: { type: "Point", coordinates: [1, 1] } },
			]);
			store.delete([id]);

			expect(mockCallback).toBeCalledTimes(3);
			expect(mockCallback).toHaveBeenNthCalledWith(1, [id], "create");
			expect(mockCallback).toHaveBeenNthCalledWith(2, [id], "update");
			expect(mockCallback).toHaveBeenNthCalledWith(3, [id], "delete");
		});
	});

	describe("delete", () => {
		it("deletes feature", () => {
			const store = new GeoJSONStore();

			const [id] = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);
			store.delete([id]);

			// No longer exists so should throw errors
			expect(() => store.getGeometryCopy(id)).toThrowError();
			expect(() =>
				store.updateGeometry([
					{
						id,
						geometry: { type: "Point", coordinates: [1, 1] },
					},
				]),
			).toThrowError();
		});
	});

	describe("load", () => {
		it("does nothing if empty data array is passed", () => {
			const store = new GeoJSONStore();
			store.load([]);
			expect(store.copyAll()).toStrictEqual([]);
		});

		it("attempts to add ids if missing", () => {
			const store = new GeoJSONStore({ tracked: false });
			store.load([
				{
					type: "Feature",
					properties: {},
					geometry: { type: "Point", coordinates: [0, 0] },
				},
			]);
			const result = store.copyAll();
			expect(result).toStrictEqual([
				{
					id: expect.any(String),
					type: "Feature",
					properties: {},
					geometry: { type: "Point", coordinates: [0, 0] },
				},
			]);
			expect(result[0].id).toBeUUID4();
		});

		it("attempts to add tracking properties if enabled and they are missing", () => {
			const store = new GeoJSONStore({ tracked: true });
			store.load([
				{
					type: "Feature",
					properties: {},
					geometry: { type: "Point", coordinates: [0, 0] },
				},
			]);
			const result = store.copyAll();
			expect(result).toStrictEqual([
				{
					id: expect.any(String),
					type: "Feature",
					properties: {
						createdAt: expect.any(Number),
						updatedAt: expect.any(Number),
					},
					geometry: { type: "Point", coordinates: [0, 0] },
				},
			]);
			expect(result[0].id).toBeUUID4();
		});

		it("errors if feature does not pass validation", () => {
			const store = new GeoJSONStore({ tracked: false });

			expect(() => {
				store.load(
					[
						{
							type: "Feature",
							properties: {},
							geometry: { type: "Point", coordinates: [0, 0] },
						},
					],
					(feature) => {
						return Boolean(
							feature &&
								typeof feature === "object" &&
								"type" in feature &&
								feature.type === "Polygon",
						);
					},
				);
			}).toThrowError();
		});

		it("errors if feature createdAt is not valid numeric timestamps", () => {
			const store = new GeoJSONStore({ tracked: true });

			expect(() => {
				store.load([
					{
						type: "Feature",
						properties: {
							mode: "point",
							createdAt: new Date().toISOString(),
						},
						geometry: { type: "Point", coordinates: [0, 0] },
					},
				]);
			}).toThrowError(StoreValidationErrors.InvalidTrackedProperties);
		});

		it("errors if feature createdAt is not valid numeric timestamps", () => {
			const store = new GeoJSONStore({ tracked: true });

			expect(() => {
				store.load([
					{
						type: "Feature",
						properties: {
							mode: "point",
							createdAt: +new Date(),
							updatedAt: new Date().toISOString(),
						},
						geometry: { type: "Point", coordinates: [0, 0] },
					},
				]);
			}).toThrowError(StoreValidationErrors.InvalidTrackedProperties);
		});
	});

	describe("copyAll", () => {
		it("creates a copy of the stores features", () => {
			const store = new GeoJSONStore();

			const mockCallback = jest.fn();
			store.registerOnChange(mockCallback);

			const [one] = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);
			const [two] = store.create<string>([
				{ geometry: { type: "Point", coordinates: [1, 1] } },
			]);

			const copies = store.copyAll();

			const ids = copies.map((f) => f.id);

			expect(ids.includes(one)).toBe(true);
			expect(ids.includes(two)).toBe(true);
		});
	});
});
