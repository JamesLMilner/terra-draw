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
			const selectionPointBehavior = new SelectionPointBehavior(config);
			new DragCoordinateResizeBehavior(
				config,
				new PixelDistanceBehavior(config),
				selectionPointBehavior,
				new MidPointBehavior(config, selectionPointBehavior),
			);
		});
	});

	describe("api", () => {
		let config: BehaviorConfig;
		let dragMaintainedShapeBehavior: DragCoordinateResizeBehavior;

		beforeEach(() => {
			config = MockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const pixelDistanceBehavior = new PixelDistanceBehavior(config);
			const midpointBehavior = new MidPointBehavior(
				config,
				selectionPointBehavior,
			);

			dragMaintainedShapeBehavior = new DragCoordinateResizeBehavior(
				config,
				pixelDistanceBehavior,
				selectionPointBehavior,
				midpointBehavior,
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
					const id = createStorePolygon(config);

					dragMaintainedShapeBehavior.startDragging(id, 0);

					jest.spyOn(config.store, "updateGeometry");

					dragMaintainedShapeBehavior.drag(
						MockCursorEvent({ lng: 0, lat: 0 }),
						"center",
						() => {
							return false;
						},
					);

					expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
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
