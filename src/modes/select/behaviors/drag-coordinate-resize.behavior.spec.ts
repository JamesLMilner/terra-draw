import { Position } from "geojson";
import {
	createStorePoint,
	createStorePolygon,
} from "../../../test/create-store-features";
import { mockBehaviorConfig } from "../../../test/mock-behavior-config";
import { mockDrawEvent } from "../../../test/mock-mouse-event";
import { BehaviorConfig } from "../../base.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { DragCoordinateResizeBehavior } from "./drag-coordinate-resize.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

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
			const config = mockBehaviorConfig("test");
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
			config = mockBehaviorConfig("test");
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
					mockDrawEvent(),
					id,
				);
				expect(index).toBe(-1);
			});

			it("returns -1 if nothing within pointer distance", () => {
				const id = createStorePolygon(config);
				jest.spyOn(config.store, "updateGeometry");

				(config.project as jest.Mock)
					.mockReturnValueOnce({ x: 200, y: 200 })
					.mockReturnValueOnce({ x: 200, y: 300 })
					.mockReturnValueOnce({ x: 300, y: 300 })
					.mockReturnValueOnce({ x: 300, y: 200 })
					.mockReturnValueOnce({ x: 200, y: 200 });

				const index = dragMaintainedShapeBehavior.getDraggableIndex(
					mockDrawEvent(),
					id,
				);
				expect(index).toBe(-1);
			});

			it("can get index for Polygon coordinate if within pointer distance", () => {
				const id = createStorePolygon(config);
				jest.spyOn(config.store, "updateGeometry");

				(config.project as jest.Mock)
					.mockReturnValueOnce({ x: 0, y: 0 })
					.mockReturnValueOnce({ x: 0, y: 1 })
					.mockReturnValueOnce({ x: 1, y: 1 })
					.mockReturnValueOnce({ x: 1, y: 0 })
					.mockReturnValueOnce({ x: 0, y: 0 });

				const index = dragMaintainedShapeBehavior.getDraggableIndex(
					mockDrawEvent(),
					id,
				);
				expect(index).toBe(0);
			});

			it("can drag LineString coordinate if within pointer distance", () => {
				const id = createLineString(config);
				jest.spyOn(config.store, "updateGeometry");

				(config.project as jest.Mock)
					.mockReturnValueOnce({ x: 0, y: 0 })
					.mockReturnValueOnce({ x: 0, y: 1 });

				const index = dragMaintainedShapeBehavior.getDraggableIndex(
					mockDrawEvent(),
					id,
				);
				expect(index).toBe(0);
			});
		});

		describe("drag", () => {
			it("returns early if nothing is being dragged", () => {
				jest.spyOn(config.store, "updateGeometry");

				dragMaintainedShapeBehavior.drag(mockDrawEvent(), "center-fixed");

				expect(config.store.updateGeometry).toBeCalledTimes(0);
			});

			it("returns early if geometry is a point", () => {
				createStorePoint(config);
				jest.spyOn(config.store, "updateGeometry");

				dragMaintainedShapeBehavior.drag(mockDrawEvent(), "center-fixed");

				expect(config.store.updateGeometry).toBeCalledTimes(0);
			});

			describe("center-fixed", () => {
				it("updates the Polygon coordinate if within pointer distance", () => {
					const id = createStorePolygon(config);

					dragMaintainedShapeBehavior.startDragging(id, 0);

					jest.spyOn(config.store, "updateGeometry");

					(config.project as jest.Mock)
						.mockReturnValueOnce({ x: 0, y: 0 })
						.mockReturnValueOnce({ x: 0, y: 1 })
						.mockReturnValueOnce({ x: 1, y: 1 })
						.mockReturnValueOnce({ x: 1, y: 0 })
						.mockReturnValueOnce({ x: 0, y: 0 });

					dragMaintainedShapeBehavior.drag(mockDrawEvent(), "center-fixed");
					dragMaintainedShapeBehavior.drag(mockDrawEvent(), "center-fixed");

					expect(config.store.updateGeometry).toBeCalledTimes(1);
				});

				it("updates the LineString coordinate if within pointer distance", () => {
					const id = createLineString(config);
					jest.spyOn(config.store, "updateGeometry");

					dragMaintainedShapeBehavior.startDragging(id, 0);

					(config.project as jest.Mock)
						.mockReturnValueOnce({ x: 0, y: 0 })
						.mockReturnValueOnce({ x: 0, y: 1 });

					dragMaintainedShapeBehavior.drag(mockDrawEvent(), "center-fixed");
					dragMaintainedShapeBehavior.drag(mockDrawEvent(), "center-fixed");

					expect(config.store.updateGeometry).toBeCalledTimes(1);
				});
			});

			describe("opposite-corner-fixed", () => {
				it("updates the Polygon coordinate if within pointer distance", () => {
					const id = createStorePolygon(config);

					dragMaintainedShapeBehavior.startDragging(id, 0);

					jest.spyOn(config.store, "updateGeometry");

					(config.project as jest.Mock)
						.mockReturnValueOnce({ x: 0, y: 0 })
						.mockReturnValueOnce({ x: 0, y: 1 })
						.mockReturnValueOnce({ x: 1, y: 1 })
						.mockReturnValueOnce({ x: 1, y: 0 })
						.mockReturnValueOnce({ x: 0, y: 0 });

					dragMaintainedShapeBehavior.drag(
						mockDrawEvent(),
						"opposite-corner-fixed",
					);
					dragMaintainedShapeBehavior.drag(
						mockDrawEvent(),
						"opposite-corner-fixed",
					);

					expect(config.store.updateGeometry).toBeCalledTimes(1);
				});

				it("updates the LineString coordinate if within pointer distance", () => {
					const id = createLineString(config);
					jest.spyOn(config.store, "updateGeometry");

					dragMaintainedShapeBehavior.startDragging(id, 0);

					(config.project as jest.Mock)
						.mockReturnValueOnce({ x: 0, y: 0 })
						.mockReturnValueOnce({ x: 0, y: 1 });

					dragMaintainedShapeBehavior.drag(
						mockDrawEvent(),
						"opposite-corner-fixed",
					);
					dragMaintainedShapeBehavior.drag(
						mockDrawEvent(),
						"opposite-corner-fixed",
					);

					expect(config.store.updateGeometry).toBeCalledTimes(1);
				});
			});
		});
	});
});
