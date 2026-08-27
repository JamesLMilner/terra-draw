import {
	createStorePoint,
	createStoreLineString,
	createStorePolygon,
} from "../../../test/create-store-features";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MockCursorEvent } from "../../../test/mock-cursor-event";
import { BehaviorConfig } from "../../base.behavior";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { DragCoordinateResizeBehavior } from "./drag-coordinate-resize.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { ScaleFeatureBehavior } from "./scale-feature.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("ScaleFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			const mutateFeatureBehavior = new MutateFeatureBehavior(config, {
				validate: jest.fn(() => ({ valid: true })),
			});
			const readFeatureBehavior = new ReadFeatureBehavior(config);
			const selectionPointBehavior = new SelectionPointBehavior(
				config,
				mutateFeatureBehavior,
			);
			const coordinatePointBehavior = new CoordinatePointBehavior(
				config,
				readFeatureBehavior,
				mutateFeatureBehavior,
			);

			const dragCoordinatePointBehavior = new DragCoordinateResizeBehavior(
				config,
				new PixelDistanceBehavior(config),
				selectionPointBehavior,
				new MidPointBehavior(
					config,
					selectionPointBehavior,
					coordinatePointBehavior,
					mutateFeatureBehavior,
					readFeatureBehavior,
					new PixelDistanceBehavior(config),
				),
				coordinatePointBehavior,
				readFeatureBehavior,
				mutateFeatureBehavior,
			);

			new ScaleFeatureBehavior(config, dragCoordinatePointBehavior);
		});
	});

	describe("api", () => {
		let scaleFeatureBehavior: ScaleFeatureBehavior;
		let config: BehaviorConfig;

		beforeEach(() => {
			config = MockBehaviorConfig("test");

			const mutateFeatureBehavior = new MutateFeatureBehavior(config, {
				validate: jest.fn(() => ({ valid: true })),
			});
			const readFeatureBehavior = new ReadFeatureBehavior(config);
			const selectionPointBehavior = new SelectionPointBehavior(
				config,
				mutateFeatureBehavior,
			);
			const coordinatePointBehavior = new CoordinatePointBehavior(
				config,
				readFeatureBehavior,
				mutateFeatureBehavior,
			);

			const dragCoordinatePointBehavior = new DragCoordinateResizeBehavior(
				config,
				new PixelDistanceBehavior(config),
				selectionPointBehavior,
				new MidPointBehavior(
					config,
					selectionPointBehavior,
					coordinatePointBehavior,
					mutateFeatureBehavior,
					readFeatureBehavior,
					new PixelDistanceBehavior(config),
				),
				coordinatePointBehavior,
				readFeatureBehavior,
				mutateFeatureBehavior,
			);

			scaleFeatureBehavior = new ScaleFeatureBehavior(
				config,
				dragCoordinatePointBehavior,
			);

			jest.spyOn(config.store, "updateGeometry");
		});

		describe("scale", () => {
			it("non Polygon or LineStrings do an early return", () => {
				const id = createStorePoint(config);

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("scales the LineString", () => {
				const originalCoordinates = [
					[0, 0],
					[1, 1],
				];
				const id = createStoreLineString(config, [...originalCoordinates]);

				scaleFeatureBehavior.scale(
					MockCursorEvent({ lng: 1.001, lat: 1.001 }),
					id,
				);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);

				const [updatedFeature] = (config.store.updateGeometry as jest.Mock).mock
					.calls[0][0];
				expect(updatedFeature.geometry.coordinates).not.toEqual(
					originalCoordinates,
				);
			});

			it("scales the Polygon", () => {
				const id = createStorePolygon(config);

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});
		});

		describe("reset", () => {
			it("can be called to reset the behaviors state", () => {
				const id = createStoreLineString(config, [
					[0, 0],
					[1, 1],
				]);
				const id2 = createStoreLineString(
					config,
					[
						[10, 10],
						[11, 11],
					],
					true,
				);

				jest.spyOn(config.store, "updateGeometry");

				scaleFeatureBehavior.scale(
					MockCursorEvent({ lng: 1.001, lat: 1.001 }),
					id,
				);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);

				scaleFeatureBehavior.reset();

				scaleFeatureBehavior.scale(
					MockCursorEvent({ lng: 11.001, lat: 11.001 }),
					id2,
				);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(2);
				expect(config.store.updateGeometry).toHaveBeenLastCalledWith(
					expect.arrayContaining([expect.objectContaining({ id: id2 })]),
				);
			});
		});
	});
});
