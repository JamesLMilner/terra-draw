import { TerraDrawMouseEvent } from "../../common";
import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { mockDrawEvent } from "../../test/mock-mouse-event";
import { TerraDrawPolygonMode } from "./polygon.mode";

describe("TerraDrawPolygonMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const polygonMode = new TerraDrawPolygonMode();
			expect(polygonMode.mode).toBe("polygon");
		});

		it("constructs with options", () => {
			const polygonMode = new TerraDrawPolygonMode({
				styles: { closingPointColor: "#ffffff" },
				allowSelfIntersections: true,
				pointerDistance: 40,
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
			});
			expect(polygonMode.styles).toStrictEqual({
				closingPointColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawPolygonMode({
				styles: { closingPointColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawPolygonMode({
				styles: { closingPointColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const polygonMode = new TerraDrawPolygonMode();
			expect(polygonMode.state).toBe("unregistered");
			polygonMode.register(getMockModeConfig(polygonMode.mode));
			expect(polygonMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.state = "started";
			}).toThrowError();
		});

		it("stopping before not registering throws error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.stop();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.start();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.start();
			}).toThrowError();
		});

		it("registering multiple times throws an error", () => {
			const polygonMode = new TerraDrawPolygonMode();

			expect(() => {
				polygonMode.register(getMockModeConfig(polygonMode.mode));
				polygonMode.register(getMockModeConfig(polygonMode.mode));
			}).toThrowError();
		});

		it("can start correctly", () => {
			const polygonMode = new TerraDrawPolygonMode();

			polygonMode.register(getMockModeConfig(polygonMode.mode));
			polygonMode.start();

			expect(polygonMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const polygonMode = new TerraDrawPolygonMode();

			polygonMode.register(getMockModeConfig(polygonMode.mode));
			polygonMode.start();
			polygonMode.stop();

			expect(polygonMode.state).toBe("stopped");
		});
	});

	describe("onMouseMove", () => {
		let polygonMode: TerraDrawPolygonMode;
		let store: GeoJSONStore;
		let project: jest.Mock;
		let onChange: jest.Mock;

		beforeEach(() => {
			store = new GeoJSONStore();
			polygonMode = new TerraDrawPolygonMode();
			const mockConfig = getMockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;
			project = mockConfig.project;

			polygonMode.register(mockConfig);
			polygonMode.start();
		});

		it("does nothing if no clicks have occurred ", () => {
			polygonMode.onMouseMove({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).not.toBeCalled();
		});

		it("updates the coordinate to the mouse position after first click", () => {
			polygonMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(2);

			const features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[1, 0.999999], // Small offset to keep Mapbox GL happy
					[0, 0],
				],
			]);
		});

		it("updates the coordinate to the mouse position after second click", () => {
			polygonMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(4);

			const features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[0, 0],
				],
			]);
		});

		it("updates the coordinate to the mouse position after third click", () => {
			polygonMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onClick({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// Snapping branch
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			polygonMode.onMouseMove({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(7);

			// 1 times for the polygon
			// 2 times for the closing points
			let features = store.copyAll();
			expect(features.length).toBe(3);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[0, 0],
					[0, 0],
				],
			]);

			// No snapping branch
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			polygonMode.onMouseMove({
				lng: 4,
				lat: 4,
				containerX: 41,
				containerY: 41,
				button: "left",
				heldKeys: [],
			});

			features = store.copyAll();

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[4, 4],
					[0, 0],
				],
			]);
		});
	});

	describe("onClick", () => {
		let polygonMode: TerraDrawPolygonMode;
		let store: GeoJSONStore;
		let project: jest.Mock;
		let unproject: jest.Mock;

		const mockClickBoundingBox = (
			bbox: [
				[number, number],
				[number, number],
				[number, number],
				[number, number],
			] = [
				[0, 0],
				[0, 0],
				[0, 0],
				[0, 0],
			],
		) => {
			unproject
				.mockReturnValueOnce({ lng: bbox[0][0], lat: bbox[0][1] })
				.mockReturnValueOnce({ lng: bbox[1][0], lat: bbox[1][1] })
				.mockReturnValueOnce({ lng: bbox[2][0], lat: bbox[2][1] })
				.mockReturnValueOnce({ lng: bbox[3][0], lat: bbox[3][1] })
				.mockReturnValueOnce({ lng: bbox[0][0], lat: bbox[0][1] });
		};

		beforeEach(() => {
			polygonMode = new TerraDrawPolygonMode();
			const mockConfig = getMockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			project = mockConfig.project;
			unproject = mockConfig.project;
			polygonMode.register(mockConfig);
			polygonMode.start();
		});

		it("can create a polygon", () => {
			mockClickBoundingBox();

			polygonMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onClick({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// closingPoints
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			polygonMode.onMouseMove({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// closingPoints
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			polygonMode.onClick({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// closingPoints
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			polygonMode.onClick({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();
			expect(features.length).toBe(1);

			// Create a new polygon
			polygonMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			features = store.copyAll();
			expect(features.length).toBe(2);
		});

		it("can create a polygon with snapping enabled", () => {
			polygonMode = new TerraDrawPolygonMode({ snapping: true });
			const mockConfig = getMockModeConfig(polygonMode.mode);
			store = mockConfig.store;
			project = mockConfig.project;
			unproject = mockConfig.unproject;
			polygonMode.register(mockConfig);
			polygonMode.start();

			mockClickBoundingBox();
			polygonMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			mockClickBoundingBox();
			polygonMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			mockClickBoundingBox();
			polygonMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			mockClickBoundingBox();
			polygonMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			mockClickBoundingBox();
			polygonMode.onClick({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			mockClickBoundingBox();
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			polygonMode.onMouseMove({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			mockClickBoundingBox();
			polygonMode.onClick({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();
			expect(features.length).toBe(1);

			mockClickBoundingBox();
			project
				.mockReturnValueOnce({ x: 0, y: 0 })
				.mockReturnValueOnce({ x: 0, y: 0 })
				.mockReturnValueOnce({ x: 0, y: 0 })
				.mockReturnValueOnce({ x: 0, y: 0 });

			// Create a new polygon
			polygonMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			features = store.copyAll();
			expect(features.length).toBe(2);
		});

		it("can update polygon past 3 coordinates", () => {
			polygonMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onClick({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			project.mockReturnValueOnce({ x: 100, y: 100 });
			project.mockReturnValueOnce({ x: 150, y: 150 });

			polygonMode.onMouseMove({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// 1 times for the polygon
			// 2 times for the closing points
			let features = store.copyAll();
			expect(features.length).toBe(3);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[0, 0],
				],
			]);

			project.mockReturnValueOnce({ x: 100, y: 100 });
			project.mockReturnValueOnce({ x: 150, y: 150 });

			polygonMode.onClick({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// 1 times for the polygon
			// 2 times for the closing points
			features = store.copyAll();
			expect(features.length).toBe(3);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[3, 3],
					[0, 0],
				],
			]);

			project.mockReturnValueOnce({ x: 100, y: 100 });
			project.mockReturnValueOnce({ x: 150, y: 150 });

			polygonMode.onMouseMove({
				lng: 4,
				lat: 4,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			project.mockReturnValueOnce({ x: 100, y: 100 });
			project.mockReturnValueOnce({ x: 150, y: 150 });

			polygonMode.onClick({
				lng: 4,
				lat: 4,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// 1 times for the polygon
			// 2 times for the closing points
			features = store.copyAll();
			expect(features.length).toBe(3);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[4, 4],
					[4, 4],
					[0, 0],
				],
			]);

			// Fake onMouseMove
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 50, y: 50 });

			// Actual click
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 50, y: 50 });

			// Close off the polygon
			polygonMode.onClick({
				lng: 4,
				lat: 4,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// No closing points as polygon is closed
			features = store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[2, 2],
					[3, 3],
					[4, 4],
					[0, 0],
				],
			]);
		});

		it("it early returns early if a duplicate coordinate is provided", () => {
			polygonMode = new TerraDrawPolygonMode({
				allowSelfIntersections: false,
			});
			const mockConfig = getMockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			project = mockConfig.project;

			polygonMode.register(mockConfig);
			polygonMode.start();

			jest.spyOn(store, "updateGeometry");
			jest.spyOn(store, "create");

			const firstPoint = mockDrawEvent({
				lng: 1,
				lat: 1,
			});
			polygonMode.onMouseMove(firstPoint);
			polygonMode.onClick(firstPoint);

			expect(store.updateGeometry).toBeCalledTimes(0);
			expect(store.create).toBeCalledTimes(1);

			polygonMode.onMouseMove(firstPoint);
			expect(store.updateGeometry).toBeCalledTimes(1);

			// Nothing happens here because the coordinates
			// are identical

			polygonMode.onClick(firstPoint);
			expect(store.updateGeometry).toBeCalledTimes(1);

			const secondPoint = mockDrawEvent({
				lng: 2,
				lat: 2,
			});
			polygonMode.onMouseMove(secondPoint);
			expect(store.updateGeometry).toBeCalledTimes(2);

			// This now updates because the coordinate is different

			polygonMode.onClick(secondPoint);
			expect(store.updateGeometry).toBeCalledTimes(3);

			polygonMode.onMouseMove(secondPoint);
			expect(store.updateGeometry).toBeCalledTimes(4);

			// Again nothing happens because the coordinate is identical

			polygonMode.onClick(secondPoint);
			expect(store.updateGeometry).toBeCalledTimes(4);

			const thirdPoint = mockDrawEvent({
				lng: 3,
				lat: 3,
			});

			polygonMode.onMouseMove(thirdPoint);
			expect(store.updateGeometry).toBeCalledTimes(5);

			// This now updates because the coordinate is different

			polygonMode.onClick(thirdPoint);
			expect(store.updateGeometry).toBeCalledTimes(6);

			// We have to mock project in the final block
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			polygonMode.onMouseMove(thirdPoint);
			expect(store.updateGeometry).toBeCalledTimes(7);

			// We have to mock project in the final block
			project.mockReturnValueOnce({ x: 100, y: 100 });
			project.mockReturnValueOnce({ x: 100, y: 100 });

			polygonMode.onClick(thirdPoint);
			expect(store.updateGeometry).toBeCalledTimes(7);
		});

		it("does not create a polygon line if it has intersections and allowSelfIntersections is false", () => {
			polygonMode = new TerraDrawPolygonMode({
				allowSelfIntersections: false,
			});
			const mockConfig = getMockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			project = mockConfig.project;

			polygonMode.register(mockConfig);
			polygonMode.start();

			const coordOneEvent = {
				lng: 11.162109375,
				lat: 23.322080011,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			} as TerraDrawMouseEvent;
			polygonMode.onClick(coordOneEvent);

			const coordTwoEvent = {
				lng: -21.884765625,
				lat: -8.928487062,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			} as TerraDrawMouseEvent;
			polygonMode.onMouseMove(coordTwoEvent);
			polygonMode.onClick(coordTwoEvent);

			const coordThreeEvent = {
				lng: 26.894531249,
				lat: -20.468189222,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			} as TerraDrawMouseEvent;
			polygonMode.onMouseMove(coordThreeEvent);
			polygonMode.onClick(coordThreeEvent);

			// Overlapping point
			const coordFourEvent = {
				lng: -13.974609375,
				lat: 22.187404991,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			} as TerraDrawMouseEvent;
			project.mockReturnValueOnce({ x: 100, y: 100 });
			project.mockReturnValueOnce({ x: 100, y: 100 });
			polygonMode.onMouseMove(coordFourEvent);

			project.mockReturnValueOnce({ x: 100, y: 100 });
			project.mockReturnValueOnce({ x: 100, y: 100 });
			polygonMode.onClick(coordFourEvent);

			let features = store.copyAll();
			expect(features.length).toBe(3);

			// Here we still have the coordinate but it's not committed
			// to the finished polygon
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[11.162109375, 23.322080011],
					[-21.884765625, -8.928487062],
					[26.894531249, -20.468189222],
					[-13.974609375, 22.187404991],
					[11.162109375, 23.322080011],
				],
			]);

			const closingCoordEvent = {
				...coordOneEvent,
			};
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });
			polygonMode.onMouseMove(closingCoordEvent);

			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });
			polygonMode.onClick(closingCoordEvent);

			// No closing points as feature is closed
			features = store.copyAll();
			expect(features.length).toBe(1);
			expect(project).toBeCalledTimes(8);

			// The overlapping coordinate is not included
			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[11.162109375, 23.322080011],
					[-21.884765625, -8.928487062],
					[26.894531249, -20.468189222],
					[11.162109375, 23.322080011],
				],
			]);
		});
	});

	describe("onKeyUp", () => {
		let polygonMode: TerraDrawPolygonMode;
		let store: GeoJSONStore;
		let project: jest.Mock;
		let unproject: jest.Mock;

		const mockClickBoundingBox = (
			bbox: [
				[number, number],
				[number, number],
				[number, number],
				[number, number],
			] = [
				[0, 0],
				[0, 0],
				[0, 0],
				[0, 0],
			],
		) => {
			unproject
				.mockReturnValueOnce({ lng: bbox[0][0], lat: bbox[0][1] })
				.mockReturnValueOnce({ lng: bbox[1][0], lat: bbox[1][1] })
				.mockReturnValueOnce({ lng: bbox[2][0], lat: bbox[2][1] })
				.mockReturnValueOnce({ lng: bbox[3][0], lat: bbox[3][1] })
				.mockReturnValueOnce({ lng: bbox[0][0], lat: bbox[0][1] });
		};

		beforeEach(() => {
			polygonMode = new TerraDrawPolygonMode();
			const mockConfig = getMockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			project = mockConfig.project;
			unproject = mockConfig.project;
			polygonMode.register(mockConfig);
			polygonMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no line is present", () => {
				polygonMode.onKeyUp({
					key: "Escape",
					preventDefault: jest.fn(),
					heldKeys: [],
				});
			});

			it("deletes the line when currently editing", () => {
				polygonMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				polygonMode.onKeyUp({
					key: "Escape",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(0);
			});

			it("does not delete the line when cancel is set to null", () => {
				polygonMode = new TerraDrawPolygonMode({ keyEvents: { cancel: null } });
				const mockConfig = getMockModeConfig(polygonMode.mode);

				store = mockConfig.store;
				project = mockConfig.project;
				unproject = mockConfig.project;
				polygonMode.register(mockConfig);
				polygonMode.start();

				polygonMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				polygonMode.onKeyUp({
					key: "Escape",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(1);
			});
		});

		describe("finish", () => {
			it("can create a polygon", () => {
				mockClickBoundingBox();

				polygonMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				polygonMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				polygonMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				polygonMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				polygonMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				// closingPoints
				project.mockReturnValueOnce({ x: 0, y: 0 });
				project.mockReturnValueOnce({ x: 0, y: 0 });

				polygonMode.onMouseMove({
					lng: 3,
					lat: 3,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				// closingPoints
				project.mockReturnValueOnce({ x: 0, y: 0 });
				project.mockReturnValueOnce({ x: 0, y: 0 });

				polygonMode.onClick({
					lng: 3,
					lat: 3,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				// closingPoints
				project.mockReturnValueOnce({ x: 0, y: 0 });
				project.mockReturnValueOnce({ x: 0, y: 0 });

				polygonMode.onClick({
					lng: 3,
					lat: 3,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				// Finish drawing the polygon
				polygonMode.onKeyUp({
					key: "Enter",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				// Creates a new polygon
				polygonMode.onClick({
					lng: 4,
					lat: 4,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(2);
			});
		});

		it("does not finish drawing polygon when finish is null", () => {
			polygonMode = new TerraDrawPolygonMode({ keyEvents: { finish: null } });
			const mockConfig = getMockModeConfig(polygonMode.mode);

			store = mockConfig.store;
			project = mockConfig.project;
			unproject = mockConfig.project;
			polygonMode.register(mockConfig);
			polygonMode.start();

			mockClickBoundingBox();

			polygonMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onClick({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// closingPoints
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			polygonMode.onMouseMove({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// closingPoints
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });

			polygonMode.onClick({
				lng: 3,
				lat: 3,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			polygonMode.onKeyUp({
				key: "Enter",
				preventDefault: jest.fn(),
				heldKeys: [],
			});

			const features = store.copyAll();

			// 2 Closing points and 1 Polygon
			// has not finished the polygon off and deleted the closing points
			expect(features.length).toBe(3);
		});
	});
});

describe("cleanUp", () => {
	let store: GeoJSONStore;
	let polygonMode: TerraDrawPolygonMode;

	beforeEach(() => {
		jest.resetAllMocks();
		polygonMode = new TerraDrawPolygonMode();

		const mockConfig = getMockModeConfig(polygonMode.mode);
		store = mockConfig.store;

		polygonMode.register(mockConfig);
		polygonMode.start();
	});

	it("does not throw error if feature has not been created ", () => {
		expect(() => {
			polygonMode.cleanUp();
		}).not.toThrowError();
	});

	it("cleans up correctly if drawing has started", () => {
		polygonMode.onClick({
			lng: 0,
			lat: 0,
			containerX: 0,
			containerY: 0,
			button: "left",
			heldKeys: [],
		});

		expect(store.copyAll().length).toBe(1);

		polygonMode.cleanUp();

		// Removes the LineString that was being created
		expect(store.copyAll().length).toBe(0);
	});
});

describe("onDrag", () => {
	it("does nothing", () => {
		const polygonMode = new TerraDrawPolygonMode();
		polygonMode.register(getMockModeConfig(polygonMode.mode));

		expect(() => {
			polygonMode.onDrag();
		}).not.toThrowError();
	});
});

describe("onDragStart", () => {
	it("does nothing", () => {
		const polygonMode = new TerraDrawPolygonMode();
		polygonMode.register(getMockModeConfig(polygonMode.mode));

		expect(() => {
			polygonMode.onDragStart();
		}).not.toThrowError();
	});
});

describe("onDragEnd", () => {
	it("does nothing", () => {
		const polygonMode = new TerraDrawPolygonMode();
		polygonMode.register(getMockModeConfig(polygonMode.mode));

		expect(() => {
			polygonMode.onDragEnd();
		}).not.toThrowError();
	});
});

describe("styling", () => {
	it("gets", () => {
		const polygonMode = new TerraDrawPolygonMode();
		polygonMode.register(getMockModeConfig(polygonMode.mode));
		expect(polygonMode.styles).toStrictEqual({});
	});

	it("set fails if non valid styling", () => {
		const polygonMode = new TerraDrawPolygonMode();
		polygonMode.register(getMockModeConfig(polygonMode.mode));

		expect(() => {
			(polygonMode.styles as unknown) = "test";
		}).toThrowError();

		expect(polygonMode.styles).toStrictEqual({});
	});

	it("sets", () => {
		const polygonMode = new TerraDrawPolygonMode();
		polygonMode.register(getMockModeConfig(polygonMode.mode));

		polygonMode.styles = {
			closingPointColor: "#ffffff",
		};

		expect(polygonMode.styles).toStrictEqual({
			closingPointColor: "#ffffff",
		});
	});
});

describe("styleFeature", () => {
	it("returns the correct styles for polygon", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: "#ffffff",
				outlineColor: "#111111",
				outlineWidth: 2,
				fillOpacity: 0.5,
				closingPointWidth: 2,
				closingPointColor: "#dddddd",
				closingPointOutlineWidth: 1,
				closingPointOutlineColor: "#222222",
			},
		});

		expect(
			polygonMode.styleFeature({
				type: "Feature",
				geometry: { type: "Polygon", coordinates: [] },
				properties: { mode: "polygon" },
			}),
		).toMatchObject({
			polygonFillColor: "#ffffff",
			polygonOutlineColor: "#111111",
			polygonOutlineWidth: 2,
			polygonFillOpacity: 0.5,
		});
	});

	it("returns the correct styles for polygon using function", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: () => "#ffffff",
				outlineColor: () => "#111111",
				outlineWidth: () => 2,
				fillOpacity: () => 0.5,
				closingPointWidth: () => 2,
				closingPointColor: () => "#dddddd",
				closingPointOutlineWidth: () => 1,
				closingPointOutlineColor: () => "#222222",
			},
		});

		expect(
			polygonMode.styleFeature({
				type: "Feature",
				geometry: { type: "Polygon", coordinates: [] },
				properties: { mode: "polygon" },
			}),
		).toMatchObject({
			polygonFillColor: "#ffffff",
			polygonOutlineColor: "#111111",
			polygonOutlineWidth: 2,
			polygonFillOpacity: 0.5,
		});
	});

	it("returns the correct styles for point", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: "#ffffff",
				outlineColor: "#111111",
				outlineWidth: 2,
				fillOpacity: 0.5,
				closingPointWidth: 2,
				closingPointColor: "#dddddd",
				closingPointOutlineWidth: 1,
				closingPointOutlineColor: "#222222",
			},
		});

		expect(
			polygonMode.styleFeature({
				type: "Feature",
				geometry: { type: "Point", coordinates: [] },
				properties: { mode: "polygon" },
			}),
		).toMatchObject({
			pointWidth: 2,
			pointColor: "#dddddd",
			pointOutlineColor: "#222222",
			pointOutlineWidth: 1,
		});
	});
});

describe("validateFeature", () => {
	it("returns false for invalid polygon feature", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: "#ffffff",
				outlineColor: "#ffffff",
				outlineWidth: 2,
				fillOpacity: 0.5,
			},
		});
		polygonMode.register(getMockModeConfig("polygon"));

		expect(
			polygonMode.validateFeature({
				id: "29da86c2-92e2-4095-a1b3-22103535ebfa",
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [[]],
				},
				properties: {
					mode: "circle",
					createdAt: 1685568434891,
					updatedAt: 1685568435434,
				},
			}),
		).toBe(false);
	});

	it("returns true for valid polygon feature", () => {
		const polygonMode = new TerraDrawPolygonMode({
			styles: {
				fillColor: "#ffffff",
				outlineColor: "#ffffff",
				outlineWidth: 2,
				fillOpacity: 0.5,
			},
		});
		polygonMode.register(getMockModeConfig("polygon"));

		expect(
			polygonMode.validateFeature({
				id: "66608334-7cf1-4f9e-a7f9-75e5ac135e68",
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[-1.812744141, 52.429222278],
							[-1.889648438, 51.652110862],
							[0.505371094, 52.052490476],
							[-0.417480469, 52.476089041],
							[-1.812744141, 52.429222278],
						],
					],
				},
				properties: {
					mode: "polygon",
					createdAt: 1685655516297,
					updatedAt: 1685655518118,
				},
			}),
		).toBe(true);
	});
});
