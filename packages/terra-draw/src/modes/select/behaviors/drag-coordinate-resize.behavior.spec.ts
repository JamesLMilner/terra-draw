import { Position } from "geojson";
import {
	createStorePoint,
	createStorePolygon,
} from "../../../test/create-store-features";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { BehaviorConfig } from "../../base.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { DragCoordinateResizeBehavior } from "./drag-coordinate-resize.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MockCursorEvent } from "../../../test/mock-cursor-event";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";

describe("DragCoordinateResizeBehavior", () => {
	const createLineString = (
		config: BehaviorConfig,
		coordinates: Position[] = [
			[0, 0],
			[0, 1],
		],
	) => {
		const [createdId] = config.store.create([
			{
				geometry: {
					type: "LineString",
					coordinates,
				},
				properties: {
					selected: true,
				},
			},
		]);

		return createdId;
	};

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
			const pixelDistanceBehavior = new PixelDistanceBehavior(config);
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

			new DragCoordinateResizeBehavior(
				config,
				pixelDistanceBehavior,
				selectionPointBehavior,
				midpointBehavior,
				coordinatePointBehavior,
				readFeatureBehavior,
				mutateFeatureBehavior,
			);
		});

		describe("api", () => {
			let validate = jest.fn(() => ({ valid: true }));
			let config: BehaviorConfig;
			let dragMaintainedShapeBehavior: DragCoordinateResizeBehavior;
			let mutateFeatureBehavior: MutateFeatureBehavior;
			let readFeatureBehavior: ReadFeatureBehavior;
			let selectionPointBehavior: SelectionPointBehavior;
			let coordinatePointBehavior: CoordinatePointBehavior;
			let midpointBehavior: MidPointBehavior;

			beforeEach(() => {
				config = MockBehaviorConfig("test");
				mutateFeatureBehavior = new MutateFeatureBehavior(config, {
					validate,
				});
				readFeatureBehavior = new ReadFeatureBehavior(config);
				selectionPointBehavior = new SelectionPointBehavior(
					config,
					mutateFeatureBehavior,
				);
				const pixelDistanceBehavior = new PixelDistanceBehavior(config);
				coordinatePointBehavior = new CoordinatePointBehavior(
					config,
					readFeatureBehavior,
					mutateFeatureBehavior,
				);

				midpointBehavior = new MidPointBehavior(
					config,
					selectionPointBehavior,
					coordinatePointBehavior,
					mutateFeatureBehavior,
					readFeatureBehavior,
				);

				dragMaintainedShapeBehavior = new DragCoordinateResizeBehavior(
					config,
					pixelDistanceBehavior,
					selectionPointBehavior,
					midpointBehavior,
					coordinatePointBehavior,
					readFeatureBehavior,
					mutateFeatureBehavior,
				);
			});

			describe("getDraggableIndex", () => {
				it("returns -1 if geometry is a point", () => {
					const id = createStorePoint(config);
					jest.spyOn(config.store, "updateGeometry");

					const index = dragMaintainedShapeBehavior.getDraggableIndex(
						MockCursorEvent({ lng: 0, lat: 0 }),
						id,
					);
					expect(index).toBe(-1);
				});

				it("returns -1 if nothing within pointer distance", () => {
					const id = createStorePolygon(config);
					jest.spyOn(config.store, "updateGeometry");

					const index = dragMaintainedShapeBehavior.getDraggableIndex(
						MockCursorEvent({ lng: 100, lat: 100 }),
						id,
					);
					expect(index).toBe(-1);
				});

				it("can get index for Polygon coordinate if within pointer distance", () => {
					const id = createStorePolygon(config);
					jest.spyOn(config.store, "updateGeometry");

					const index = dragMaintainedShapeBehavior.getDraggableIndex(
						MockCursorEvent({ lng: 0, lat: 0 }),
						id,
					);
					expect(index).toBe(0);
				});

				it("can drag LineString coordinate if within pointer distance", () => {
					const id = createLineString(config);
					jest.spyOn(config.store, "updateGeometry");

					const index = dragMaintainedShapeBehavior.getDraggableIndex(
						MockCursorEvent({ lng: 0, lat: 0 }),
						id,
					);
					expect(index).toBe(0);
				});
			});

			describe("drag", () => {
				it("returns early if nothing is being dragged", () => {
					jest.spyOn(config.store, "updateGeometry");

					dragMaintainedShapeBehavior.drag(
						MockCursorEvent({ lng: 0, lat: 0 }),
						"center",
					);

					expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
				});

				it("returns early if geometry is a point", () => {
					createStorePoint(config);
					jest.spyOn(config.store, "updateGeometry");

					dragMaintainedShapeBehavior.drag(
						MockCursorEvent({ lng: 0, lat: 0 }),
						"center",
					);

					expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
				});

				describe("validation", () => {
					it("should not update if validation function returns false", () => {
						validate.mockImplementationOnce(() => ({ valid: false }));

						const id = createStorePolygon(config);

						dragMaintainedShapeBehavior.startDragging(id, 0);

						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"center",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
					});

					it("should update if validation function returns true", () => {
						validate.mockImplementationOnce(() => ({ valid: true }));

						const id = createStorePolygon(config);

						dragMaintainedShapeBehavior.startDragging(id, 0);

						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"center",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
					});
				});

				describe("center", () => {
					it("updates the Polygon coordinate if within pointer distance", () => {
						const id = createStorePolygon(config);

						dragMaintainedShapeBehavior.startDragging(id, 0);

						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"center",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
					});

					it("updates the LineString coordinate if within pointer distance", () => {
						const id = createLineString(config);
						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.startDragging(id, 0);

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"center",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
					});
				});

				describe("opposite", () => {
					it("updates the Polygon coordinate if within pointer distance", () => {
						const id = createStorePolygon(config);

						dragMaintainedShapeBehavior.startDragging(id, 0);

						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"opposite",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
					});

					it("updates selection points, midpoints, and coordinate points when resizing", () => {
						const id = createStorePolygon(config);

						const featureCoordinatesBefore = readFeatureBehavior.getGeometry(id)
							.coordinates as Position[][];

						coordinatePointBehavior.createOrUpdate({
							featureId: id,
							featureCoordinates: featureCoordinatesBefore,
						});
						selectionPointBehavior.create({
							featureId: id,
							featureCoordinates: featureCoordinatesBefore,
						});
						midpointBehavior.create({
							featureId: id,
							featureCoordinates: featureCoordinatesBefore,
						});

						const selectionPoint0Before = readFeatureBehavior.getGeometry(
							selectionPointBehavior.ids[0],
						).coordinates as Position;
						const midPoint0Before = readFeatureBehavior.getGeometry(
							midpointBehavior.ids[0],
						).coordinates as Position;
						const coordinatePointId0 = (
							readFeatureBehavior.getProperties(id)
								.coordinatePointIds as string[]
						)[0];
						const coordinatePoint0Before = readFeatureBehavior.getGeometry(
							coordinatePointId0,
						).coordinates as Position;

						dragMaintainedShapeBehavior.startDragging(id, 0);

						// Move the dragged corner far enough to guarantee a resize
						// (index 0 is the bottom-left corner in createStorePolygon)
						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: -1, lat: -1 }),
							"opposite",
						);

						const coordinatePoints = readFeatureBehavior.getProperties(id)
							.coordinatePointIds as string[];

						const featureCoordinatesAfter = readFeatureBehavior.getGeometry(id)
							.coordinates as Position[][];
						const selectionPoint0After = readFeatureBehavior.getGeometry(
							selectionPointBehavior.ids[0],
						).coordinates as Position;
						const midPoint0After = readFeatureBehavior.getGeometry(
							midpointBehavior.ids[0],
						).coordinates as Position;
						const coordinatePoint0After = readFeatureBehavior.getGeometry(
							coordinatePointId0,
						).coordinates as Position;

						// Ensure the polygon has the correct number of coordinates
						expect(featureCoordinatesAfter[0]).toHaveLength(5);

						// Ensure polygon is closed correctly
						expect(featureCoordinatesAfter[0][4]).toStrictEqual(
							featureCoordinatesAfter[0][0],
						);

						// Ensure the correct number of guidance points exist
						expect(midpointBehavior.ids).toHaveLength(4);
						expect(selectionPointBehavior.ids).toHaveLength(4);
						expect(coordinatePoints).toHaveLength(4);

						// Feature resized
						expect(featureCoordinatesAfter[0][0]).not.toStrictEqual(
							featureCoordinatesBefore[0][0],
						);

						// Guidance points track the updated geometry
						expect(selectionPoint0After).not.toStrictEqual(
							selectionPoint0Before,
						);
						expect(midPoint0After).not.toStrictEqual(midPoint0Before);
						expect(coordinatePoint0After).not.toStrictEqual(
							coordinatePoint0Before,
						);
					});

					it("updates the LineString coordinate if within pointer distance", () => {
						const id = createLineString(config);
						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.startDragging(id, 0);

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"opposite",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
					});
				});

				describe("center-fixed", () => {
					it("updates the Polygon coordinate if within pointer distance", () => {
						const id = createStorePolygon(config);

						dragMaintainedShapeBehavior.startDragging(id, 0);

						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"center-fixed",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
					});

					it("updates the LineString coordinate if within pointer distance", () => {
						const id = createLineString(config);
						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.startDragging(id, 0);

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"center-fixed",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
					});
				});

				describe("opposite-fixed", () => {
					it("updates the Polygon coordinate if within pointer distance", () => {
						const id = createStorePolygon(config);

						dragMaintainedShapeBehavior.startDragging(id, 0);

						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"opposite-fixed",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
					});

					it("updates the LineString coordinate if within pointer distance", () => {
						const id = createLineString(config);
						jest.spyOn(config.store, "updateGeometry");

						dragMaintainedShapeBehavior.startDragging(id, 0);

						dragMaintainedShapeBehavior.drag(
							MockCursorEvent({ lng: 0, lat: 0 }),
							"opposite-fixed",
						);

						expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
					});
				});
			});
		});
	});
});
