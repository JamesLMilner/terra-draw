import { createStorePolygon } from "../../../test/create-store-features";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MockCursorEvent } from "../../../test/mock-cursor-event";
import { BehaviorConfig } from "../../base.behavior";
import { ClickBoundingBoxBehavior } from "../../click-bounding-box.behavior";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { DragFeatureBehavior } from "./drag-feature.behavior";
import { FeatureAtPointerEventBehavior } from "./feature-at-pointer-event.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("DragFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			const readFeatureBehavior = new ReadFeatureBehavior(config);
			const mutateFeatureBehavior = new MutateFeatureBehavior(config, {
				validate: jest.fn(() => ({ valid: true })),
			});
			const selectionPointBehavior = new SelectionPointBehavior(
				config,
				mutateFeatureBehavior,
			);
			const featureAtPointerEventBehavior = new FeatureAtPointerEventBehavior(
				config,
				new ClickBoundingBoxBehavior(config),
				new PixelDistanceBehavior(config),
			);
			const coordinatePointBehavior = new CoordinatePointBehavior(
				config,
				readFeatureBehavior,
				mutateFeatureBehavior,
			);

			const midpointBehavior = new MidPointBehavior(
				config,
				selectionPointBehavior,
				coordinatePointBehavior,
				mutateFeatureBehavior,
				readFeatureBehavior,
			);

			new DragFeatureBehavior(
				config,
				featureAtPointerEventBehavior,
				selectionPointBehavior,
				midpointBehavior,
				coordinatePointBehavior,
				readFeatureBehavior,
				mutateFeatureBehavior,
			);
		});
	});

	describe.each(["web-mercator", "globe"])("api", (projection) => {
		let config: BehaviorConfig;
		let dragFeatureBehavior: DragFeatureBehavior;
		let validate: jest.Mock;

		beforeEach(() => {
			validate = jest.fn(() => ({ valid: true }));
			config = MockBehaviorConfig(
				"test",
				projection as "web-mercator" | "globe",
			);
			const mutateFeatureBehavior = new MutateFeatureBehavior(config, {
				validate: validate,
			});
			const readFeatureBehavior = new ReadFeatureBehavior(config);
			const selectionPointBehavior = new SelectionPointBehavior(
				config,
				mutateFeatureBehavior,
			);
			const featureAtPointerEventBehavior = new FeatureAtPointerEventBehavior(
				config,
				new ClickBoundingBoxBehavior(config),
				new PixelDistanceBehavior(config),
			);
			const coordinatePointBehavior = new CoordinatePointBehavior(
				config,
				readFeatureBehavior,
				mutateFeatureBehavior,
			);

			const midpointBehavior = new MidPointBehavior(
				config,
				selectionPointBehavior,
				coordinatePointBehavior,
				mutateFeatureBehavior,
				readFeatureBehavior,
			);

			dragFeatureBehavior = new DragFeatureBehavior(
				config,
				featureAtPointerEventBehavior,
				selectionPointBehavior,
				midpointBehavior,
				coordinatePointBehavior,
				readFeatureBehavior,
				mutateFeatureBehavior,
			);
		});

		describe("canDrag", () => {
			it("returns true when it is possible to drag a feature", () => {
				const id = createStorePolygon(config);

				jest.spyOn(config.store, "updateGeometry");

				const event = MockCursorEvent({ lat: 0.5, lng: 0.5 });
				const canDrag = dragFeatureBehavior.canDrag(event, id);

				expect(canDrag).toBe(true);
			});

			it("returns false when it is not possible to drag a feature", () => {
				const id = createStorePolygon(config);

				jest.spyOn(config.store, "updateGeometry");

				const event = MockCursorEvent({ lat: 89, lng: 89 });
				const canDrag = dragFeatureBehavior.canDrag(event, id);

				expect(canDrag).toBe(false);
			});
		});

		describe("drag", () => {
			it("returns early if no position is set", () => {
				const event = MockCursorEvent({ lat: 0.5, lng: 0.5 });

				jest.spyOn(config.store, "updateGeometry");

				dragFeatureBehavior.drag(event);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("updates the polygon to the dragged position", () => {
				const id = createStorePolygon(config);
				const event = MockCursorEvent({ lat: 0.5, lng: 0.5 });

				dragFeatureBehavior.startDragging(event, id);

				jest.spyOn(config.store, "updateGeometry");

				dragFeatureBehavior.drag(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);

				expect(config.store.updateGeometry).not.toHaveBeenCalledWith({
					id,
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
				});
			});

			it("validation returning false does not update the polygon to the dragged position", () => {
				validate.mockImplementation(() => ({ valid: false }));
				const id = createStorePolygon(config);
				const event = MockCursorEvent({ lat: 0.5, lng: 0.5 });

				dragFeatureBehavior.startDragging(event, id);

				jest.spyOn(config.store, "updateGeometry");

				dragFeatureBehavior.drag(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("validation returning true does update the polygon to the dragged position", () => {
				const id = createStorePolygon(config);
				const event = MockCursorEvent({ lat: 0.5, lng: 0.5 });

				dragFeatureBehavior.startDragging(event, id);

				jest.spyOn(config.store, "updateGeometry");

				dragFeatureBehavior.drag(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});
		});
	});
});
