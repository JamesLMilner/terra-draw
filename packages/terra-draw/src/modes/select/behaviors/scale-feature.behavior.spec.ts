import {
	createStorePoint,
	createStoreLineString,
	createStorePolygon,
} from "../../../test/create-store-features";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MockCursorEvent } from "../../../test/mock-cursor-event";
import { BehaviorConfig } from "../../base.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { DragCoordinateResizeBehavior } from "./drag-coordinate-resize.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { ScaleFeatureBehavior } from "./scale-feature.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("ScaleFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const coordinatePointBehavior = new CoordinatePointBehavior(config);
			const dragCoordinatePointBehavior = new DragCoordinateResizeBehavior(
				config,
				new PixelDistanceBehavior(config),
				selectionPointBehavior,
				new MidPointBehavior(
					config,
					selectionPointBehavior,
					coordinatePointBehavior,
				),
				coordinatePointBehavior,
			);

			new ScaleFeatureBehavior(config, dragCoordinatePointBehavior);
		});
	});

	describe("api", () => {
		let scaleFeatureBehavior: ScaleFeatureBehavior;
		let config: BehaviorConfig;

		beforeEach(() => {
			config = MockBehaviorConfig("test");

			const selectionPointBehavior = new SelectionPointBehavior(config);
			const coordinatePointBehavior = new CoordinatePointBehavior(config);
			const dragCoordinatePointBehavior = new DragCoordinateResizeBehavior(
				config,
				new PixelDistanceBehavior(config),
				selectionPointBehavior,
				new MidPointBehavior(
					config,
					selectionPointBehavior,
					coordinatePointBehavior,
				),
				coordinatePointBehavior,
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
				const id = createStoreLineString(config);

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});

			it("scales the Polygon", () => {
				const id = createStorePolygon(config);

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});
		});

		describe("reset", () => {
			it("can be called to reset the behaviors state", () => {
				const id = createStoreLineString(config);
				const id2 = createStoreLineString(
					config,
					[
						[10, 10],
						[10, 11],
					],
					true,
				);

				jest.spyOn(config.store, "updateGeometry");

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
				expect(config.store.updateGeometry).toHaveBeenCalledWith([
					{
						geometry: {
							coordinates: [
								[0, 0],
								[0, 1],
							],
							type: "LineString",
						},
						id: id,
					},
				]);

				scaleFeatureBehavior.reset();

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 10, lat: 10 }), id2);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(2);
				expect(config.store.updateGeometry).toHaveBeenCalledWith([
					{
						geometry: {
							coordinates: [
								[10, 10],
								[10, 11],
							],
							type: "LineString",
						},
						id: id2,
					},
				]);
			});
		});
	});
});
