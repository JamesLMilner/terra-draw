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
				onFinish: jest.fn(),

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

			beforeEach(() => {
				config = MockBehaviorConfig("test");
				const mutateFeatureBehavior = new MutateFeatureBehavior(config, {
					onFinish: jest.fn(),
					validate,
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
