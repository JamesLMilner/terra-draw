import {
	createMockLineString,
	createMockPoint,
	createMockPolygonSquare,
} from "../../test/mock-features";
import { GeoJSONStoreFeatures } from "../store";
import { SpatialIndex } from "./spatial-index";

describe("Spatial Index", () => {
	describe("construct", () => {
		it("can construct with default maxEntries", () => {
			new SpatialIndex();
		});

		it("can construct with custom maxEntries", () => {
			new SpatialIndex({ maxEntries: 9 });
		});
	});

	describe("load", () => {
		it("loads features in without throwing", () => {
			const spatialIndex = new SpatialIndex();
			spatialIndex.load([createMockPolygonSquare() as GeoJSONStoreFeatures]);
		});
		it("throws error loading features with the same id", () => {
			const spatialIndex = new SpatialIndex();
			expect(() => {
				spatialIndex.load([
					createMockPolygonSquare("1") as GeoJSONStoreFeatures,
					createMockPolygonSquare("1") as GeoJSONStoreFeatures,
				]);
			}).toThrowError();
		});

		it("can build with many features in without throwing", () => {
			const spatialIndex = new SpatialIndex();

			const polygons = [];
			for (let i = 0; i < 1000; i++) {
				polygons.push(createMockPolygonSquare(String(i), i, i + 1));
			}

			spatialIndex.load(polygons as GeoJSONStoreFeatures[]);
		});

		it("can load twice with same number of polygons", () => {
			const spatialIndex = new SpatialIndex();

			const polygons = [];
			for (let i = 0; i < 10; i++) {
				polygons.push(createMockPolygonSquare(String(i + "A"), i, i + 1));
			}

			spatialIndex.load(polygons as GeoJSONStoreFeatures[]);

			const polygonsTwo = [];
			for (let i = 0; i < 10; i++) {
				polygonsTwo.push(createMockPolygonSquare(String(i + "B"), i, i + 1));
			}

			spatialIndex.load(polygonsTwo as GeoJSONStoreFeatures[]);
		});

		it("can load twice with same number of polygons", () => {
			const spatialIndex = new SpatialIndex();

			const polygons = [];
			for (let i = 0; i < 10; i++) {
				polygons.push(createMockPolygonSquare(String(i + "A"), i, i + 1));
			}

			spatialIndex.load(polygons as GeoJSONStoreFeatures[]);

			const polygonsTwo = [];
			for (let i = 0; i < 100; i++) {
				polygonsTwo.push(createMockPolygonSquare(String(i + "B"), i, i + 1));
			}

			spatialIndex.load(polygonsTwo as GeoJSONStoreFeatures[]);
		});
	});

	describe("insert", () => {
		it("does not throw", () => {
			const spatialIndex = new SpatialIndex();
			spatialIndex.insert(createMockPoint("1") as GeoJSONStoreFeatures);
			spatialIndex.insert(createMockPolygonSquare("2") as GeoJSONStoreFeatures);
			spatialIndex.insert(createMockLineString("3") as GeoJSONStoreFeatures);
		});

		it("throws for unhandled geometries", () => {
			const spatialIndex = new SpatialIndex();
			expect(() => {
				spatialIndex.insert({
					type: "Feature",
					geometry: { type: "MultiPolygon", coordinates: [] },
				} as any);
			}).toThrowError();
		});

		it("throws for duplicate ids", () => {
			const spatialIndex = new SpatialIndex();

			expect(() => {
				spatialIndex.insert(createMockPoint("1") as GeoJSONStoreFeatures);
				spatialIndex.insert(
					createMockPolygonSquare("1") as GeoJSONStoreFeatures,
				);
			}).toThrowError();
		});

		// TODO: Name this test properly
		it("handles identical insert", () => {
			const spatialIndex = new SpatialIndex();
			for (let i = 0; i < 100; i++) {
				spatialIndex.insert(
					createMockPolygonSquare(String(i), 0, 1) as GeoJSONStoreFeatures,
				);
			}
			spatialIndex.insert(
				createMockPolygonSquare(String(101), 0, 2) as GeoJSONStoreFeatures,
			);
			spatialIndex.insert(
				createMockPolygonSquare(String(102), 0, 1) as GeoJSONStoreFeatures,
			);
		});

		it("handles many point inserts", () => {
			const spatialIndex = new SpatialIndex();
			for (let i = 1; i < 6; i += 0.5) {
				spatialIndex.insert(
					createMockPoint(
						String(i),
						Math.sqrt(i / 1000) * 90,
						Math.sqrt(i / 1000) * -90,
					) as GeoJSONStoreFeatures,
				);
			}
		});
	});

	describe("update", () => {
		it("throws if not inserted yet", () => {
			const spatialIndex = new SpatialIndex();

			expect(() => {
				spatialIndex.update(createMockPolygonSquare() as GeoJSONStoreFeatures);
			}).toThrowError();
		});

		it("does not throw if inserted already", () => {
			const spatialIndex = new SpatialIndex();
			spatialIndex.insert(
				createMockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures,
			);
			spatialIndex.update(
				createMockPolygonSquare("1", 0, 2) as GeoJSONStoreFeatures,
			);
		});
	});

	describe("remove", () => {
		it("throws if not inserted yet", () => {
			const spatialIndex = new SpatialIndex();
			expect(() => {
				spatialIndex.remove("1");
			}).toThrowError();
		});

		it("does not throw if inserted already", () => {
			const spatialIndex = new SpatialIndex();
			spatialIndex.insert(createMockPolygonSquare("1") as GeoJSONStoreFeatures);
			spatialIndex.remove("1");
		});
	});

	describe("clear", () => {
		it("clearing empty spatial index does not throw", () => {
			const spatialIndex = new SpatialIndex();
			spatialIndex.clear();
		});

		it("does not throw with inserted feature", () => {
			const spatialIndex = new SpatialIndex();
			spatialIndex.insert(createMockPolygonSquare() as GeoJSONStoreFeatures);

			spatialIndex.clear();
		});
	});

	describe("collides", () => {
		it("returns true for colliding objects", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(
				createMockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures,
			);
			expect(
				spatialIndex.collides(
					createMockPolygonSquare("2", 0, 2) as GeoJSONStoreFeatures,
				),
			).toBe(true);
		});

		it("returns false for non colliding objects", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(
				createMockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures,
			);
			expect(
				spatialIndex.collides(
					createMockPolygonSquare("2", 2, 3) as GeoJSONStoreFeatures,
				),
			).toBe(false);
		});

		it("returns false for non colliding objects outside of current tree", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(
				createMockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures,
			);
			expect(
				spatialIndex.collides(
					createMockPolygonSquare("2", 45, 90) as GeoJSONStoreFeatures,
				),
			).toBe(false);
		});
	});

	describe("search", () => {
		it("returns the intersecting feature id", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(
				createMockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures,
			);
			expect(
				spatialIndex.search(
					createMockPolygonSquare("2", 0, 2) as GeoJSONStoreFeatures,
				),
			).toStrictEqual(["1"]);
		});

		it("returns empty array for non intersecting feature", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(
				createMockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures,
			);
			expect(
				spatialIndex.search(
					createMockPolygonSquare("2", 2, 3) as GeoJSONStoreFeatures,
				),
			).toStrictEqual([]);
		});

		it("returns the multiple intersecting feature ids", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(
				createMockPolygonSquare("1", 0.2, 0.8) as GeoJSONStoreFeatures,
			);
			spatialIndex.insert(
				createMockPolygonSquare("2", 0.3, 0.7) as GeoJSONStoreFeatures,
			);
			spatialIndex.insert(
				createMockPolygonSquare("3", 0.4, 0.6) as GeoJSONStoreFeatures,
			);

			expect(
				spatialIndex.search(
					createMockPolygonSquare("4", 0, 1) as GeoJSONStoreFeatures,
				),
			).toStrictEqual(["1", "2", "3"]);
		});
	});

	describe("series of events", () => {
		it("can handle", () => {
			const spatialIndex = new SpatialIndex();

			const polygons = [];
			for (let i = -90; i < 90; i += 1) {
				polygons.push(createMockPolygonSquare(String(i + "A"), i, i + 1));
			}

			spatialIndex.load(polygons as GeoJSONStoreFeatures[]);

			for (let i = -90; i < 90; i += 1) {
				spatialIndex.insert(
					createMockPolygonSquare(
						String(i + "B"),
						i,
						i + 1,
					) as GeoJSONStoreFeatures,
				);
			}

			for (let i = -90; i < 90; i += 1) {
				spatialIndex.search(
					createMockPolygonSquare("4", i, i + 1) as GeoJSONStoreFeatures,
				);
				spatialIndex.collides(
					createMockPolygonSquare("4", i + 0.5, i + 1) as GeoJSONStoreFeatures,
				);
				spatialIndex.remove(String(i + "B"));
				spatialIndex.remove(String(i + "A"));
			}
		});
	});
});
