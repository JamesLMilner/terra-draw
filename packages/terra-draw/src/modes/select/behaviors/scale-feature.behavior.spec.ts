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
import { buildGuideBehaviors } from "../../../test/build-guide-behaviors";
import { BoundingBoxBehavior } from "./bounding-box.behavior";
import { Polygon } from "geojson";
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

			const guides = buildGuideBehaviors(
				config,
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
				guides.rotateFeature,
				readFeatureBehavior,
				mutateFeatureBehavior,
				guides.boundingBox,
				guides.scaleHandles,
			);

			new ScaleFeatureBehavior(
				config,
				dragCoordinatePointBehavior,
				guides.boundingBox,
			);
		});
	});

	describe("api", () => {
		let scaleFeatureBehavior: ScaleFeatureBehavior;
		let config: BehaviorConfig;
		let boundingBox: BoundingBoxBehavior;

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

			const guides = buildGuideBehaviors(
				config,
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
				guides.rotateFeature,
				readFeatureBehavior,
				mutateFeatureBehavior,
				guides.boundingBox,
				guides.scaleHandles,
			);

			scaleFeatureBehavior = new ScaleFeatureBehavior(
				config,
				dragCoordinatePointBehavior,
				guides.boundingBox,
			);
			boundingBox = guides.boundingBox;

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

		describe("corner scaling", () => {
			// Default polygon is the unit square [0,0]..[1,1]; bbox corners are
			// SW[0,0] SE[1,0] NE[1,1] NW[0,1].
			const setupSquare = () => {
				const id = createStorePolygon(config);
				boundingBox.create({
					featureId: id,
					featureCoordinates:
						config.store.getGeometryCopy<Polygon>(id).coordinates,
				});
				return id;
			};

			it("isCornerScaling reflects start/reset", () => {
				const id = setupSquare();
				expect(scaleFeatureBehavior.isCornerScaling()).toBe(false);
				scaleFeatureBehavior.startCornerScaling(id, 2);
				expect(scaleFeatureBehavior.isCornerScaling()).toBe(true);
				scaleFeatureBehavior.reset();
				expect(scaleFeatureBehavior.isCornerScaling()).toBe(false);
			});

			it("scaleFromCorner is a no-op when not corner scaling", () => {
				setupSquare();
				scaleFeatureBehavior.scaleFromCorner(
					MockCursorEvent({ lng: 2, lat: 2 }),
					false,
				);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("scales the feature from the opposite corner", () => {
				const id = setupSquare();
				scaleFeatureBehavior.startCornerScaling(id, 2); // grab NE corner

				// Drag the NE corner out to [2,2] — SW [0,0] stays fixed.
				scaleFeatureBehavior.scaleFromCorner(
					MockCursorEvent({ lng: 2, lat: 2 }),
					false,
				);

				expect(config.store.updateGeometry).toHaveBeenCalled();
				const coords = config.store.getGeometryCopy<Polygon>(id).coordinates[0];
				// SW corner is the fixed pivot and must not move.
				expect(coords).toContainEqual([0, 0]);
				// The feature grew beyond the original unit square.
				const maxX = Math.max(...coords.map((c) => c[0]));
				expect(maxX).toBeGreaterThan(1);
			});

			it("scales about the centre when scaleFromCenter is true", () => {
				const id = setupSquare();
				scaleFeatureBehavior.startCornerScaling(id, 2);

				scaleFeatureBehavior.scaleFromCorner(
					MockCursorEvent({ lng: 2, lat: 2 }),
					true,
				);

				expect(config.store.updateGeometry).toHaveBeenCalled();
				const coords = config.store.getGeometryCopy<Polygon>(id).coordinates[0];
				// Scaling about the centre moves the SW corner below/left of origin.
				const minX = Math.min(...coords.map((c) => c[0]));
				expect(minX).toBeLessThan(0);
			});

			it("opposite scaling after a centre scaling still pins the opposite corner", () => {
				const id = setupSquare();

				// Gesture 1: centre scaling.
				scaleFeatureBehavior.startCornerScaling(id, 2);
				scaleFeatureBehavior.scaleFromCorner(
					MockCursorEvent({ lng: 2, lat: 2 }),
					true,
				);
				scaleFeatureBehavior.reset();

				const before = config.store.getGeometryCopy<Polygon>(id).coordinates[0];
				const swBefore = [
					Math.min(...before.map((c) => c[0])),
					Math.min(...before.map((c) => c[1])),
				];

				// Gesture 2: opposite-fixed scaling (no centre). The opposite (SW)
				// corner must stay fixed — i.e. a prior centre gesture must not make
				// subsequent gestures behave as centre.
				scaleFeatureBehavior.startCornerScaling(id, 2);
				scaleFeatureBehavior.scaleFromCorner(
					MockCursorEvent({ lng: 5, lat: 5 }),
					false,
				);

				const after = config.store.getGeometryCopy<Polygon>(id).coordinates[0];
				const swAfter = [
					Math.min(...after.map((c) => c[0])),
					Math.min(...after.map((c) => c[1])),
				];

				expect(swAfter[0]).toBeCloseTo(swBefore[0], 5);
				expect(swAfter[1]).toBeCloseTo(swBefore[1], 5);
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
