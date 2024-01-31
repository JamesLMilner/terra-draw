/**
 * @jest-environment jsdom
 */
import {
	TerraDraw,
	TerraDrawGoogleMapsAdapter,
	TerraDrawPointMode,
} from "./terra-draw";

// Frustratingly required to keep the tests working and avoiding SyntaxError: Cannot use import statement outside a module
jest.mock("ol/style/Circle", () => jest.fn());
jest.mock("ol/style/Fill", () => jest.fn());
jest.mock("ol/style/Stroke", () => jest.fn());
jest.mock("ol/style/Style", () => jest.fn());
jest.mock("ol/proj", () => jest.fn());
jest.mock("ol/geom/Geometry", () => jest.fn());

describe("Terra Draw", () => {
	let adapter: TerraDrawGoogleMapsAdapter;

	beforeAll(() => {
		adapter = new TerraDrawGoogleMapsAdapter({
			map: {
				getDiv: () => ({
					id: "map",
					querySelector: () => ({ addEventListener: jest.fn() }),
				}),
				setOptions: jest.fn(),
				data: {
					addListener: jest.fn(),
					addGeoJson: jest.fn(),
					setStyle: jest.fn(),
				},
			} as any,
			lib: {
				LatLng: jest.fn(),
				OverlayView: jest.fn().mockImplementation(() => ({
					setMap: jest.fn(),
				})),
			} as any,
			coordinatePrecision: 9,
		});
	});

	describe("addFeature", () => {
		it("respects the default id strategy", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			const snapshot = draw.getSnapshot();
			expect(typeof snapshot[0].id).toBe("string");
			expect(snapshot[0].id).toHaveLength(36);
		});

		it("respects the user defined id strategy", () => {
			let id = 1;

			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
				idStrategy: {
					isValidId: (id) => typeof id === "number" && Number.isInteger(id),
					getId: () => id++,
				},
			});

			draw.start();

			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			const snapshot = draw.getSnapshot();
			expect(typeof snapshot[0].id).toBe("number");
			expect(snapshot[0].id).toBe(1);
		});

		it("does not allow features with same id to be added twice ", () => {
			const draw = new TerraDraw({
				adapter: adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(() => {
				draw.addFeatures([
					{
						id: "e90e54ea-0a63-407e-b433-08717009d9f6",
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-25.431289673, 34.355907891],
						},
						properties: {
							mode: "point",
						},
					},
					{
						id: "e90e54ea-0a63-407e-b433-08717009d9f6",
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-26.431289673, 34.355907891],
						},
						properties: {
							mode: "point",
						},
					},
				]);
			}).toThrowError();
		});

		it("does not allow features with incorrect id strategy to be added", () => {
			const draw = new TerraDraw({
				adapter: adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(() => {
				draw.addFeatures([
					{
						id: 1,
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-25.431289673, 34.355907891],
						},
						properties: {
							mode: "point",
						},
					},
					{
						id: 2,
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [-26.431289673, 34.355907891],
						},
						properties: {
							mode: "point",
						},
					},
				]);
			}).toThrowError();
		});
	});

	describe("getFeatureId", () => {
		it("respects the default id strategy", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			const featureId = draw.getFeatureId();
			expect(typeof featureId).toBe("string");
			expect(featureId).toHaveLength(36);

			const featureId2 = draw.getFeatureId();
			expect(typeof featureId2).toBe("string");
			expect(featureId2).toHaveLength(36);

			expect(featureId).not.toBe(featureId2);
		});

		it("respects the user defined id strategy", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
				idStrategy: {
					isValidId: (id) => typeof id === "number" && Number.isInteger(id),
					getId: (function () {
						let id = 0;
						return function () {
							return ++id;
						};
					})(),
				},
			});

			draw.start();

			const featureId = draw.getFeatureId();
			expect(typeof featureId).toBe("number");
			expect(featureId).toBe(1);

			const featureId2 = draw.getFeatureId();
			expect(typeof featureId2).toBe("number");
			expect(featureId2).toBe(2);

			expect(featureId).not.toBe(featureId2);
		});
	});

	describe("hasFeature", () => {
		it("returns true if there is a feature with a given id", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();
			draw.addFeatures([
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-25.431289673, 34.355907891],
					},
					properties: {
						mode: "point",
					},
				},
			]);

			const id = draw.getSnapshot()[0].id as string;

			expect(draw.hasFeature(id)).toBe(true);
		});

		it("returns false if there is no feature with a given id", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(draw.hasFeature("f8e5a38d-ecfa-4294-8461-d9cff0e0d7f8")).toBe(
				false,
			);
		});
	});

	describe("enabled", () => {
		it("returns false if disabled", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			expect(draw.enabled).toBe(false);
		});

		it("returns true if enabled", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(draw.enabled).toBe(true);
		});
	});

	describe("setMode", () => {
		it("point mode when mode is set", () => {
			const draw = new TerraDraw({
				adapter,
				modes: [new TerraDrawPointMode()],
			});

			draw.start();

			expect(draw.getMode()).toBe("static");

			draw.setMode("point");

			expect(draw.getMode()).toBe("point");
		});
	});
});
