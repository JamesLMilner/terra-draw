import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";
import { PointSearchBehavior } from "./point-search.behavior";

describe("PointSearchBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");

			new PointSearchBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);
		});
	});

	describe("api", () => {
		it("getNearestPointFeature returns undefined when no features exist", () => {
			const config = MockBehaviorConfig("test");

			const pointSearchBehavior = new PointSearchBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);

			const features = pointSearchBehavior.getNearestPointFeature(
				MockCursorEvent({ lng: 0, lat: 0 }),
			);

			expect(features).toStrictEqual(undefined);
		});

		it("getNearestPointFeature returns feature when it exists nearby", () => {
			const config = MockBehaviorConfig("test");

			config.store.create([
				{
					geometry: { type: "Point", coordinates: [0, 0] },
					properties: { mode: "test" },
				},
			]);

			const pointSearchBehavior = new PointSearchBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);

			const features = pointSearchBehavior.getNearestPointFeature(
				MockCursorEvent({ lng: 0, lat: 0 }),
			);

			expect(features).toStrictEqual({
				id: expect.any(String),
				type: "Feature",
				geometry: { coordinates: [0, 0], type: "Point" },
				properties: {
					mode: "test",
					createdAt: expect.any(Number),
					updatedAt: expect.any(Number),
				},
			});
		});

		it("getNearestPointFeature returns nearest feature when they exist", () => {
			const config = MockBehaviorConfig("test");

			config.store.create([
				{
					geometry: { type: "Point", coordinates: [0, 0] },
					properties: { mode: "test" },
				},
			]);

			config.store.create([
				{
					geometry: { type: "Point", coordinates: [10, 10] },
					properties: { mode: "test" },
				},
			]);

			const pointSearchBehavior = new PointSearchBehavior(
				config,
				new PixelDistanceBehavior(config),
				new ClickBoundingBoxBehavior(config),
			);

			const features = pointSearchBehavior.getNearestPointFeature(
				MockCursorEvent({ lng: 0, lat: 0 }),
			);

			expect(features).toStrictEqual({
				id: expect.any(String),
				type: "Feature",
				geometry: { coordinates: [0, 0], type: "Point" },
				properties: {
					mode: "test",
					createdAt: expect.any(Number),
					updatedAt: expect.any(Number),
				},
			});
		});
	});
});
