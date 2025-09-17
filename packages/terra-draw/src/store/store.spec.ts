import { GeoJSONStore, GeoJSONStoreFeatures } from "./store";

describe("GeoJSONStore", () => {
	const UUIDV4 = new RegExp(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);

	const isUUIDV4 = (received: string) => UUIDV4.test(received);

	describe("creates", () => {
		it("Point", () => {
			const store = new GeoJSONStore();

			const [id] = store.create<string>([
				{ geometry: { type: "Point", coordinates: [0, 0] } },
			]);

			expect(isUUIDV4(id)).toBe(true);
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
		it("returns false for non existing store feature", () => {
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
			}).toThrow();
		});

		it("throws error if feature does not exist", () => {
			const store = new GeoJSONStore();

			expect(() => {
				store.delete(["non-existant-id"]);
			}).toThrow();
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
			}).toThrow();
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
			}).toThrow();
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
			}).toThrow();
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
			}).toThrow();
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
			}).toThrow();
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

			const [idTwo] = store.create<string>(
				[{ geometry: { type: "Point", coordinates: [0, 0] } }],
				{ origin: "api" },
			);

			expect(mockCallback).toHaveBeenCalledTimes(4);
			expect(mockCallback).toHaveBeenNthCalledWith(
				1,
				[id],
				"create",
				undefined,
			);
			expect(mockCallback).toHaveBeenNthCalledWith(
				2,
				[id],
				"update",
				undefined,
			);
			expect(mockCallback).toHaveBeenNthCalledWith(
				3,
				[id],
				"delete",
				undefined,
			);
			expect(mockCallback).toHaveBeenNthCalledWith(4, [idTwo], "create", {
				origin: "api",
			});
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
			expect(() => store.getGeometryCopy(id)).toThrow();
			expect(() =>
				store.updateGeometry([
					{
						id,
						geometry: { type: "Point", coordinates: [1, 1] },
					},
				]),
			).toThrow();
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
			expect(isUUIDV4(result[0].id as any)).toBe(true);
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
			expect(isUUIDV4(result[0].id as any)).toBe(true);
		});

		it("errors if feature does not pass validation", () => {
			const store = new GeoJSONStore({ tracked: false });

			const result = store.load(
				[
					{
						type: "Feature",
						properties: {},
						geometry: { type: "Point", coordinates: [0, 0] },
					},
				],
				(feature) => ({
					valid: Boolean(
						feature &&
							typeof feature === "object" &&
							"type" in feature &&
							feature.type === "Polygon",
					),
					reason: "Test",
				}),
			);

			expect(result).toStrictEqual([
				{
					id: expect.any(String),
					reason: expect.any(String),
					valid: false,
				},
			]);
		});

		it("errors if feature createdAt is not valid numeric timestamps", () => {
			const store = new GeoJSONStore({ tracked: true });

			const result = store.load([
				{
					type: "Feature",
					properties: {
						mode: "point",
						createdAt: new Date().toISOString(),
					},
					geometry: { type: "Point", coordinates: [0, 0] },
				},
			]);

			return expect(result).toStrictEqual([
				{
					id: expect.any(String),
					reason: "createdAt is not a valid numeric timestamp",
					valid: false,
				},
			]);
		});

		it("errors if feature createdAt is not valid numeric timestamps", () => {
			const store = new GeoJSONStore({ tracked: true });

			const result = store.load([
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

			expect(result).toStrictEqual([
				{
					id: expect.any(String),
					reason: "updatedAt is not a valid numeric timestamp",
					valid: false,
				},
			]);
		});

		it("calls onChange with created features and context if features are valid", () => {
			const store = new GeoJSONStore({ tracked: false });

			const mockChangeCallback = jest.fn();
			store.registerOnChange(mockChangeCallback);

			const result = store.load(
				[
					{
						type: "Feature",
						properties: {
							mode: "point",
						},
						geometry: { type: "Point", coordinates: [0, 0] },
					},
					{
						type: "Feature",
						properties: {
							mode: "point",
						},
						geometry: { type: "Point", coordinates: [1, 1] },
					},
				],
				(feature) => ({
					valid: Boolean(
						feature &&
							typeof feature === "object" &&
							"type" in feature &&
							(feature as GeoJSONStoreFeatures).geometry.type === "Point",
					),
				}),
			);

			expect(result).toStrictEqual([
				{
					id: expect.any(String),
					valid: true,
				},
				{
					id: expect.any(String),
					valid: true,
				},
			]);

			expect(mockChangeCallback).toHaveBeenCalledTimes(1);
			expect(mockChangeCallback).toHaveBeenNthCalledWith(
				1,
				[result[0].id, result[1].id],
				"create",
				undefined,
			);
		});

		it("does not call onChange if no features are valid", () => {
			const store = new GeoJSONStore({ tracked: false });

			const mockChangeCallback = jest.fn();
			store.registerOnChange(mockChangeCallback);

			const result = store.load(
				[
					{
						type: "Feature",
						properties: {
							mode: "point",
						},
						geometry: {
							type: "LineString",
							coordinates: [
								[0, 0],
								[1, 1],
							],
						},
					},
					{
						type: "Feature",
						properties: {
							mode: "point",
						},
						geometry: {
							type: "LineString",
							coordinates: [
								[1, 1],
								[2, 2],
							],
						},
					},
				],
				(feature) => ({
					valid: Boolean(
						feature &&
							typeof feature === "object" &&
							"type" in feature &&
							(feature as GeoJSONStoreFeatures).geometry.type === "Point", // Must be Point to be valid
					),
					reason: "Feature must be valid Point",
				}),
			);

			expect(result).toStrictEqual([
				{
					id: expect.any(String),
					valid: false,
					reason: "Feature must be valid Point",
				},
				{
					id: expect.any(String),
					valid: false,
					reason: "Feature must be valid Point",
				},
			]);

			expect(mockChangeCallback).toHaveBeenCalledTimes(0);
		});

		it("calls afterFeatureAdded for each created feature when function is provided and passed features are valid", () => {
			const store = new GeoJSONStore({ tracked: false });

			const mockChangeCallback = jest.fn();
			store.registerOnChange(mockChangeCallback);
			const afterFeatureAddedMock = jest.fn();

			const result = store.load(
				[
					{
						type: "Feature",
						properties: {
							mode: "point",
						},
						geometry: { type: "Point", coordinates: [0, 0] },
					},
					{
						type: "Feature",
						properties: {
							mode: "point",
						},
						geometry: { type: "Point", coordinates: [1, 1] },
					},
				],
				(feature) => ({
					valid: Boolean(
						feature &&
							typeof feature === "object" &&
							"type" in feature &&
							(feature as GeoJSONStoreFeatures).geometry.type === "Point",
					),
				}),
				afterFeatureAddedMock,
			);

			expect(result).toStrictEqual([
				{
					id: expect.any(String),
					valid: true,
				},
				{
					id: expect.any(String),
					valid: true,
				},
			]);

			expect(mockChangeCallback).toHaveBeenCalledTimes(1);
			expect(mockChangeCallback).toHaveBeenNthCalledWith(
				1,
				[result[0].id, result[1].id],
				"create",
				undefined,
			);

			expect(afterFeatureAddedMock).toHaveBeenCalledTimes(2);
			expect(afterFeatureAddedMock).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ id: result[0].id }),
			);
			expect(afterFeatureAddedMock).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ id: result[1].id }),
			);

			// Ensure onChange is called before afterFeatureAdded
			expect(mockChangeCallback.mock.invocationCallOrder[0]).toBeLessThan(
				afterFeatureAddedMock.mock.invocationCallOrder[0],
			);
		});

		it("does not call afterFeatureAdded when function is provided if passed features are invalid", () => {
			const store = new GeoJSONStore({ tracked: false });

			const mockChangeCallback = jest.fn();
			store.registerOnChange(mockChangeCallback);
			const afterFeatureAddedMock = jest.fn();

			const result = store.load(
				[
					{
						type: "Feature",
						properties: {
							mode: "point",
						},
						geometry: {
							type: "LineString",
							coordinates: [
								[0, 0],
								[1, 1],
							],
						},
					},
					{
						type: "Feature",
						properties: {
							mode: "point",
						},
						geometry: {
							type: "LineString",
							coordinates: [
								[1, 1],
								[2, 2],
							],
						},
					},
				],
				(feature) => ({
					valid: Boolean(
						feature &&
							typeof feature === "object" &&
							"type" in feature &&
							(feature as GeoJSONStoreFeatures).geometry.type === "Point", // Must be Point to be valid
					),
					reason: "Feature must be valid Point",
				}),
				afterFeatureAddedMock,
			);

			expect(result).toStrictEqual([
				{
					id: expect.any(String),
					valid: false,
					reason: "Feature must be valid Point",
				},
				{
					id: expect.any(String),
					valid: false,
					reason: "Feature must be valid Point",
				},
			]);

			expect(mockChangeCallback).toHaveBeenCalledTimes(0);
			expect(afterFeatureAddedMock).toHaveBeenCalledTimes(0);
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
