import { createStorePolygon } from "../../../test/create-store-features";
import { mockBehaviorConfig } from "../../../test/mock-behavior-config";
import { mockDrawEvent } from "../../../test/mock-mouse-event";
import { BehaviorConfig } from "../../base.behavior";
import { ClickBoundingBoxBehavior } from "../../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { DragFeatureBehavior } from "./drag-feature.behavior";
import { FeatureAtPointerEventBehavior } from "./feature-at-pointer-event.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("DragFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = mockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const featureAtPointerEventBehavior = new FeatureAtPointerEventBehavior(
				config,
				new ClickBoundingBoxBehavior(config),
				new PixelDistanceBehavior(config),
			);
			const midpointBehavior = new MidPointBehavior(
				config,
				selectionPointBehavior,
			);

			new DragFeatureBehavior(
				config,
				featureAtPointerEventBehavior,
				selectionPointBehavior,
				midpointBehavior,
			);
		});
	});

	describe("api", () => {
		let config: BehaviorConfig;
		let dragFeatureBehavior: DragFeatureBehavior;

		beforeEach(() => {
			config = mockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const featureAtPointerEventBehavior = new FeatureAtPointerEventBehavior(
				config,
				new ClickBoundingBoxBehavior(config),
				new PixelDistanceBehavior(config),
			);
			const midpointBehavior = new MidPointBehavior(
				config,
				selectionPointBehavior,
			);

			dragFeatureBehavior = new DragFeatureBehavior(
				config,
				featureAtPointerEventBehavior,
				selectionPointBehavior,
				midpointBehavior,
			);
		});

		describe("canDrag", () => {
			it("returns true when it is possible to drag a feature", () => {
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
				const canDrag = dragFeatureBehavior.canDrag(event, id);

				expect(canDrag).toBe(true);
			});

			it("returns false when it is not possible to drag a feature", () => {
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

				const event = mockDrawEvent(mockDrawEvent({ lat: 89, lng: 89 }));
				const canDrag = dragFeatureBehavior.canDrag(event, id);

				expect(canDrag).toBe(false);
			});
		});

		describe("drag", () => {
			it("returns early if no position is set", () => {
				const event = mockDrawEvent({ lat: 0.5, lng: 0.5 });

				jest.spyOn(config.store, "updateGeometry");
				jest.spyOn(config.store, "getGeometryCopy");

				dragFeatureBehavior.drag(event);

				expect(config.store.getGeometryCopy).toBeCalledTimes(0);
				expect(config.store.updateGeometry).toBeCalledTimes(0);
			});

			it("updates the polygon to the dragged position", () => {
				const id = createStorePolygon(config);
				const event = mockDrawEvent({ lat: 0.5, lng: 0.5 });

				dragFeatureBehavior.startDragging(event, id);

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

				dragFeatureBehavior.drag(mockDrawEvent());

				expect(config.store.getGeometryCopy).toBeCalledTimes(1);
				expect(config.store.updateGeometry).toBeCalledTimes(1);
			});
		});
	});
});
