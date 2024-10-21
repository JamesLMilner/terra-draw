import {
	MockLineString,
	MockPoint,
	MockPolygonSquare,
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
			spatialIndex.load([MockPolygonSquare() as GeoJSONStoreFeatures]);
		});
		it("throws error loading features with the same id", () => {
			const spatialIndex = new SpatialIndex();
			expect(() => {
				spatialIndex.load([
					MockPolygonSquare("1") as GeoJSONStoreFeatures,
					MockPolygonSquare("1") as GeoJSONStoreFeatures,
				]);
			}).toThrow();
		});

		it("can build with many features in without throwing", () => {
			const spatialIndex = new SpatialIndex();

			const polygons = [];
			for (let i = 0; i < 1000; i++) {
				polygons.push(MockPolygonSquare(String(i), i, i + 1));
			}

			spatialIndex.load(polygons as GeoJSONStoreFeatures[]);
		});

		it("can load twice with same number of polygons", () => {
			const spatialIndex = new SpatialIndex();

			const polygons = [];
			for (let i = 0; i < 10; i++) {
				polygons.push(MockPolygonSquare(String(i + "A"), i, i + 1));
			}

			spatialIndex.load(polygons as GeoJSONStoreFeatures[]);

			const polygonsTwo = [];
			for (let i = 0; i < 10; i++) {
				polygonsTwo.push(MockPolygonSquare(String(i + "B"), i, i + 1));
			}

			spatialIndex.load(polygonsTwo as GeoJSONStoreFeatures[]);
		});

		it("can load twice with same number of polygons", () => {
			const spatialIndex = new SpatialIndex();

			const polygons = [];
			for (let i = 0; i < 10; i++) {
				polygons.push(MockPolygonSquare(String(i + "A"), i, i + 1));
			}

			spatialIndex.load(polygons as GeoJSONStoreFeatures[]);

			const polygonsTwo = [];
			for (let i = 0; i < 100; i++) {
				polygonsTwo.push(MockPolygonSquare(String(i + "B"), i, i + 1));
			}

			spatialIndex.load(polygonsTwo as GeoJSONStoreFeatures[]);
		});
	});

	describe("insert", () => {
		it("does not throw", () => {
			const spatialIndex = new SpatialIndex();
			spatialIndex.insert(MockPoint("1") as GeoJSONStoreFeatures);
			spatialIndex.insert(MockPolygonSquare("2") as GeoJSONStoreFeatures);
			spatialIndex.insert(MockLineString("3") as GeoJSONStoreFeatures);
		});

		it("throws for unhandled geometries", () => {
			const spatialIndex = new SpatialIndex();
			expect(() => {
				spatialIndex.insert({
					type: "Feature",
					geometry: { type: "MultiPolygon", coordinates: [] },
				} as any);
			}).toThrow();
		});

		it("throws for duplicate ids", () => {
			const spatialIndex = new SpatialIndex();

			expect(() => {
				spatialIndex.insert(MockPoint("1") as GeoJSONStoreFeatures);
				spatialIndex.insert(MockPolygonSquare("1") as GeoJSONStoreFeatures);
			}).toThrow();
		});

		// TODO: Name this test properly
		it("handles identical insert", () => {
			const spatialIndex = new SpatialIndex();
			for (let i = 0; i < 100; i++) {
				spatialIndex.insert(
					MockPolygonSquare(String(i), 0, 1) as GeoJSONStoreFeatures,
				);
			}
			spatialIndex.insert(
				MockPolygonSquare(String(101), 0, 2) as GeoJSONStoreFeatures,
			);
			spatialIndex.insert(
				MockPolygonSquare(String(102), 0, 1) as GeoJSONStoreFeatures,
			);
		});

		it("handles many point inserts", () => {
			const spatialIndex = new SpatialIndex();
			for (let i = 1; i < 6; i += 0.5) {
				spatialIndex.insert(
					MockPoint(
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
				spatialIndex.update(MockPolygonSquare() as GeoJSONStoreFeatures);
			}).toThrow();
		});

		it("does not throw if inserted already", () => {
			const spatialIndex = new SpatialIndex();
			spatialIndex.insert(MockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures);
			spatialIndex.update(MockPolygonSquare("1", 0, 2) as GeoJSONStoreFeatures);
		});
	});

	describe("remove", () => {
		it("throws if not inserted yet", () => {
			const spatialIndex = new SpatialIndex();
			expect(() => {
				spatialIndex.remove("1");
			}).toThrow();
		});

		it("does not throw if inserted already", () => {
			const spatialIndex = new SpatialIndex();
			spatialIndex.insert(MockPolygonSquare("1") as GeoJSONStoreFeatures);
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
			spatialIndex.insert(MockPolygonSquare() as GeoJSONStoreFeatures);

			spatialIndex.clear();
		});
	});

	describe("collides", () => {
		it("returns true for colliding objects", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(MockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures);
			expect(
				spatialIndex.collides(
					MockPolygonSquare("2", 0, 2) as GeoJSONStoreFeatures,
				),
			).toBe(true);
		});

		it("returns false for non colliding objects", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(MockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures);
			expect(
				spatialIndex.collides(
					MockPolygonSquare("2", 2, 3) as GeoJSONStoreFeatures,
				),
			).toBe(false);
		});

		it("returns false for non colliding objects outside of current tree", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(MockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures);
			expect(
				spatialIndex.collides(
					MockPolygonSquare("2", 45, 90) as GeoJSONStoreFeatures,
				),
			).toBe(false);
		});
	});

	describe("search", () => {
		it("returns the intersecting feature id", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(MockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures);
			expect(
				spatialIndex.search(
					MockPolygonSquare("2", 0, 2) as GeoJSONStoreFeatures,
				),
			).toStrictEqual(["1"]);
		});

		it("returns empty array for non intersecting feature", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(MockPolygonSquare("1", 0, 1) as GeoJSONStoreFeatures);
			expect(
				spatialIndex.search(
					MockPolygonSquare("2", 2, 3) as GeoJSONStoreFeatures,
				),
			).toStrictEqual([]);
		});

		it("returns the multiple intersecting feature ids", () => {
			const spatialIndex = new SpatialIndex();

			spatialIndex.insert(
				MockPolygonSquare("1", 0.2, 0.8) as GeoJSONStoreFeatures,
			);
			spatialIndex.insert(
				MockPolygonSquare("2", 0.3, 0.7) as GeoJSONStoreFeatures,
			);
			spatialIndex.insert(
				MockPolygonSquare("3", 0.4, 0.6) as GeoJSONStoreFeatures,
			);

			expect(
				spatialIndex.search(
					MockPolygonSquare("4", 0, 1) as GeoJSONStoreFeatures,
				),
			).toStrictEqual(["1", "2", "3"]);
		});
	});

	describe("series of events", () => {
		it("can handle", () => {
			const spatialIndex = new SpatialIndex();

			const polygons = [];
			for (let i = -90; i < 90; i += 1) {
				polygons.push(MockPolygonSquare(String(i + "A"), i, i + 1));
			}

			spatialIndex.load(polygons as GeoJSONStoreFeatures[]);

			for (let i = -90; i < 90; i += 1) {
				spatialIndex.insert(
					MockPolygonSquare(String(i + "B"), i, i + 1) as GeoJSONStoreFeatures,
				);
			}

			for (let i = -90; i < 90; i += 1) {
				spatialIndex.search(
					MockPolygonSquare("4", i, i + 1) as GeoJSONStoreFeatures,
				);
				spatialIndex.collides(
					MockPolygonSquare("4", i + 0.5, i + 1) as GeoJSONStoreFeatures,
				);
				spatialIndex.remove(String(i + "B"));
				spatialIndex.remove(String(i + "A"));
			}
		});
	});
});
