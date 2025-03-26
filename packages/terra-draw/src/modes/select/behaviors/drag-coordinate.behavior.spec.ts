import { Position } from "geojson";
import {
	createStorePoint,
	createStorePolygon,
} from "../../../test/create-store-features";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { BehaviorConfig } from "../../base.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { DragCoordinateBehavior } from "./drag-coordinate.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MockCursorEvent } from "../../../test/mock-cursor-event";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { CoordinateSnappingBehavior } from "../../coordinate-snapping.behavior";
import { ClickBoundingBoxBehavior } from "../../click-bounding-box.behavior";

describe("DragCoordinateBehavior", () => {
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
			const coordinatePointBehavior = new CoordinatePointBehavior(config);

			const pixelDistanceBehavior = new PixelDistanceBehavior(config);
			new DragCoordinateBehavior(
				config,
				pixelDistanceBehavior,
				selectionPointBehavior,
				new MidPointBehavior(
					config,
					selectionPointBehavior,
					coordinatePointBehavior,
				),
				coordinatePointBehavior,
				new CoordinateSnappingBehavior(
					config,
					pixelDistanceBehavior,
					new ClickBoundingBoxBehavior(config),
				),
			);
		});
	});

	describe("api", () => {
		let config: BehaviorConfig;
		let dragCoordinateBehavior: DragCoordinateBehavior;

		beforeEach(() => {
			config = MockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const pixelDistanceBehavior = new PixelDistanceBehavior(config);
			const coordinatePointBehavior = new CoordinatePointBehavior(config);

			const midpointBehavior = new MidPointBehavior(
				config,
				selectionPointBehavior,
				coordinatePointBehavior,
			);
			const coordinateBehavior = new CoordinateSnappingBehavior(
				config,
				pixelDistanceBehavior,
				new ClickBoundingBoxBehavior(config),
			);

			dragCoordinateBehavior = new DragCoordinateBehavior(
				config,
				pixelDistanceBehavior,
				selectionPointBehavior,
				midpointBehavior,
				coordinatePointBehavior,
				coordinateBehavior,
			);
		});

		describe("getDraggableIndex", () => {
			it("returns -1 if geometry is a point", () => {
				const id = createStorePoint(config);
				jest.spyOn(config.store, "updateGeometry");

				const index = dragCoordinateBehavior.getDraggableIndex(
					MockCursorEvent({ lng: 0, lat: 0 }),
					id,
				);
				expect(index).toBe(-1);
			});

			it("returns -1 if nothing within pointer distance", () => {
				const id = createStorePolygon(config);
				jest.spyOn(config.store, "updateGeometry");

				const index = dragCoordinateBehavior.getDraggableIndex(
					MockCursorEvent({ lng: 100, lat: 100 }),
					id,
				);
				expect(index).toBe(-1);
			});

			it("can get index for Polygon coordinate if within pointer distance", () => {
				const id = createStorePolygon(config);
				jest.spyOn(config.store, "updateGeometry");

				const index = dragCoordinateBehavior.getDraggableIndex(
					MockCursorEvent({ lng: 0, lat: 0 }),

					id,
				);
				expect(index).toBe(0);
			});

			it("can drag LineString coordinate if within pointer distance", () => {
				const id = createLineString(config);
				jest.spyOn(config.store, "updateGeometry");

				const index = dragCoordinateBehavior.getDraggableIndex(
					MockCursorEvent({ lng: 0, lat: 0 }),

					id,
				);
				expect(index).toBe(0);
			});
		});

		describe("drag", () => {
			it("returns early if nothing is being dragged", () => {
				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 0, lat: 0 }),
					true,
					() => ({ valid: true }),
					false,
				);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("returns early if geometry is a point", () => {
				createStorePoint(config);
				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 0, lat: 0 }),
					true,
					() => ({ valid: true }),
					false,
				);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("validation returning false means updates are not called", () => {
				const id = createStorePolygon(config);

				dragCoordinateBehavior.startDragging(id, 0);

				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 0, lat: 0 }),
					true,
					() => ({ valid: false }),
					false,
				);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("validation returning true means updates are called", () => {
				const id = createStorePolygon(config);

				dragCoordinateBehavior.startDragging(id, 0);

				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 0, lat: 0 }),
					true,
					() => ({ valid: true }),
					false,
				);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});

			it("updates the Polygon coordinate if within pointer distance", () => {
				const id = createStorePolygon(config);

				dragCoordinateBehavior.startDragging(id, 0);

				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 0, lat: 0 }),
					true,
					() => ({ valid: true }),
					false,
				);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});

			it("snaps the Polygon coordinate if there is a nearby coordinate to snap to and snapping is true", () => {
				const id = createStorePolygon(config);

				createStorePolygon(config, [
					[
						[1, 1],
						[1, 2],
						[2, 2],
						[2, 1],
						[1, 1],
					],
				]);

				dragCoordinateBehavior.startDragging(id, 0);

				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 0.5, lat: 0.5 }),
					true,
					() => ({ valid: true }),
					true,
				);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
				expect(config.store.updateGeometry).toHaveBeenCalledWith([
					{
						geometry: {
							coordinates: [
								[
									[1, 1],
									[0, 1],
									[1, 1],
									[1, 0],
									[1, 1],
								],
							],
							type: "Polygon",
						},
						id: expect.any(String),
					},
				]);
			});

			it("does not snap the Polygon coordinate if there is a nearby coordinate to snap to and snap is false", () => {
				const id = createStorePolygon(config);

				createStorePolygon(config, [
					[
						[1, 1],
						[1, 2],
						[2, 2],
						[2, 1],
						[1, 1],
					],
				]);

				dragCoordinateBehavior.startDragging(id, 0);

				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 0.5, lat: 0.5 }),
					true,
					() => ({ valid: true }),
					false,
				);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
				expect(config.store.updateGeometry).toHaveBeenCalledWith([
					{
						geometry: {
							coordinates: [
								[
									[0.5, 0.5],
									[0, 1],
									[1, 1],
									[1, 0],
									[0.5, 0.5],
								],
							],
							type: "Polygon",
						},
						id: expect.any(String),
					},
				]);
			});

			it("updates the LineString coordinate if within pointer distance", () => {
				const id = createLineString(config);
				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.startDragging(id, 0);

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 0, lat: 0 }),
					true,
					() => ({ valid: true }),
					false,
				);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});

			it("does not update Polygon coordinate of self-intersecting Polygon if self-intersections are disabled", () => {
				const id = createStorePolygon(config, [
					[
						[0, 1],
						[50, 2],
						[100, 2],
						[150, 1],
						[0, 1],
					],
				] as Position[][]);

				dragCoordinateBehavior.startDragging(id, 2);

				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 100, lat: 0 }),
					false,
					() => ({ valid: true }),
					false,
				);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("does not update LineString coordinate of self-intersecting LineString if self-intersections are disabled", () => {
				const id = createLineString(config, [
					[0, 1],
					[50, 2],
					[100, 2],
					[150, 1],
					[0, 1],
				] as Position[]);
				jest.spyOn(config.store, "updateGeometry");

				dragCoordinateBehavior.startDragging(id, 2);

				dragCoordinateBehavior.drag(
					MockCursorEvent({ lng: 100, lat: 0 }),
					false,
					() => ({ valid: true }),
					false,
				);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});
		});
	});
});
