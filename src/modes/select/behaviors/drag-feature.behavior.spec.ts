import { Position } from "geojson";
import { createStorePolygon } from "../../../test/create-store-features";
import { mockBehaviorConfig } from "../../../test/mock-behavior-config";
import { mockDrawEvent } from "../../../test/mock-mouse-event";
import { BehaviorConfig } from "../../base.behavior";
import { ClickBoundingBoxBehavior } from "../../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { DragFeatureBehavior } from "./drag-feature.behavior";
import { FeaturesAtMouseEventBehavior } from "./features-at-mouse-event.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("DragFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = mockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const featuresAtMouseEventBehavior = new FeaturesAtMouseEventBehavior(
				config,
				new ClickBoundingBoxBehavior(config),
				new PixelDistanceBehavior(config)
			);
			const midpointBehavior = new MidPointBehavior(
				config,
				selectionPointBehavior
			);

			new DragFeatureBehavior(
				config,
				featuresAtMouseEventBehavior,
				selectionPointBehavior,
				midpointBehavior
			);
		});
	});

	describe("api", () => {
		let config: BehaviorConfig;
		let dragFeatureBehavior: DragFeatureBehavior;

		beforeEach(() => {
			config = mockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const featuresAtMouseEventBehavior = new FeaturesAtMouseEventBehavior(
				config,
				new ClickBoundingBoxBehavior(config),
				new PixelDistanceBehavior(config)
			);
			const midpointBehavior = new MidPointBehavior(
				config,
				selectionPointBehavior
			);

			dragFeatureBehavior = new DragFeatureBehavior(
				config,
				featuresAtMouseEventBehavior,
				selectionPointBehavior,
				midpointBehavior
			);
		});

		describe("position", () => {
			it("is undefined at initialisation", () => {
				expect(dragFeatureBehavior.position).toBe(undefined);
			});

			it("throws if setting position to non [number, number] array", () => {
				expect(() => {
					(dragFeatureBehavior.position as any) = 1;
				}).toThrowError();
			});

			it("does not throw if setting position to a [number, number] array", () => {
				expect(() => {
					dragFeatureBehavior.position = [0, 0];
				}).not.toThrowError();
			});

			it("allows resetting by setting to undefined", () => {
				dragFeatureBehavior.position = [0, 0];
				dragFeatureBehavior.position = undefined;
				expect(dragFeatureBehavior.position);
			});
		});

		describe("drag", () => {
			it("returns early if no feature under mouse", () => {
				jest.spyOn(config.store, "getGeometryCopy");

				// Mock the unproject to return a valid set
				// of bbox coordinates
				(config.unproject as jest.Mock)
					.mockImplementationOnce(() => ({ lng: 0, lat: 1 }))
					.mockImplementationOnce(() => ({ lng: 1, lat: 1 }))
					.mockImplementationOnce(() => ({ lng: 1, lat: 0 }))
					.mockImplementationOnce(() => ({ lng: 0, lat: 0 }))
					.mockImplementationOnce(() => ({ lng: 0, lat: 1 }));

				dragFeatureBehavior.drag(mockDrawEvent(), "nonExistentId");

				// Returns before getting to copying a geometry
				expect(config.store.getGeometryCopy).toBeCalledTimes(0);
			});

			it("returns early if no position is set", () => {
				const id = createStorePolygon(config);

				jest.spyOn(config.store, "updateGeometry");
				jest.spyOn(config.store, "getGeometryCopy");

				// Mock the unproject to return a valid set
				// of bbox coordinates
				(config.unproject as jest.Mock)
					.mockImplementationOnce(() => ({ lng: 0, lat: 1 }))
					.mockImplementationOnce(() => ({ lng: 1, lat: 1 }))
					.mockImplementationOnce(() => ({ lng: 1, lat: 0 }))
					.mockImplementationOnce(() => ({ lng: 0, lat: 0 }))
					.mockImplementationOnce(() => ({ lng: 0, lat: 1 }));

				const event = mockDrawEvent(mockDrawEvent({ lat: 0.5, lng: 0.5 }));
				dragFeatureBehavior.drag(event, id);

				expect(config.store.getGeometryCopy).toBeCalledTimes(1);
				expect(config.store.updateGeometry).toBeCalledTimes(0);
			});

			it("updates the polygon to the dragged position", () => {
				const id = createStorePolygon(config);

				dragFeatureBehavior.position = [0, 0];

				jest.spyOn(config.store, "updateGeometry");
				jest.spyOn(config.store, "getGeometryCopy");

				// Mock the unproject to return a valid set
				// of bbox coordinates
				(config.unproject as jest.Mock)
					.mockImplementationOnce(() => ({ lng: 0, lat: 1 }))
					.mockImplementationOnce(() => ({ lng: 1, lat: 1 }))
					.mockImplementationOnce(() => ({ lng: 1, lat: 0 }))
					.mockImplementationOnce(() => ({ lng: 0, lat: 0 }))
					.mockImplementationOnce(() => ({ lng: 0, lat: 1 }));

				dragFeatureBehavior.drag(mockDrawEvent(), id);

				expect(config.store.getGeometryCopy).toBeCalledTimes(1);
				expect(config.store.updateGeometry).toBeCalledTimes(1);
			});
		});
	});
});
