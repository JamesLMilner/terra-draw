import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawLineStringMode } from "./linestring.mode";

describe("TerraDrawLineStringMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			expect(lineStringMode.mode).toBe("linestring");
			expect(lineStringMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: { cancel: "Backspace", finish: "Enter" },
			});
			expect(lineStringMode.styles).toStrictEqual({
				lineStringColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawLineStringMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawLineStringMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			expect(lineStringMode.state).toBe("unregistered");
			lineStringMode.register(getMockModeConfig(lineStringMode.mode));
			expect(lineStringMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.state = "started";
			}).toThrowError();
		});

		it("stopping before not registering throws error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.stop();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.start();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.start();
			}).toThrowError();
		});

		it("registering multiple times throws an error", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.register(getMockModeConfig(lineStringMode.mode));
				lineStringMode.register(getMockModeConfig(lineStringMode.mode));
			}).toThrowError();
		});

		it("can start correctly", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			lineStringMode.register(getMockModeConfig(lineStringMode.mode));
			lineStringMode.start();

			expect(lineStringMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			lineStringMode.register(getMockModeConfig(lineStringMode.mode));
			lineStringMode.start();
			lineStringMode.stop();

			expect(lineStringMode.state).toBe("stopped");
		});
	});

	describe("onMouseMove", () => {
		let lineStringMode: TerraDrawLineStringMode;
		let onChange: jest.Mock;
		let store: GeoJSONStore;

		beforeEach(() => {
			lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = getMockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			store = mockConfig.store;

			lineStringMode.register(mockConfig);
			lineStringMode.start();
		});

		it("does nothing if no clicks have occurred ", () => {
			lineStringMode.onMouseMove({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).not.toBeCalled();
		});

		it("updates the coordinate to the mouse position if a coordinate has been created", () => {
			lineStringMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onMouseMove({
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
				[0, 0],
				[1, 1],
			]);
		});
	});

	describe("onClick", () => {
		let lineStringMode: TerraDrawLineStringMode;
		let onChange: jest.Mock;
		let store: GeoJSONStore;
		let project: jest.Mock;

		beforeEach(() => {
			lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = getMockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			store = mockConfig.store;
			project = mockConfig.project;
			lineStringMode.register(mockConfig);
			lineStringMode.start();
		});

		it("creates two identical coordinates on click", () => {
			lineStringMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(1);

			const features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[0, 0],
			]);
		});

		it("creates two additional identical coordinates on second click", () => {
			lineStringMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 1,
				containerY: 1,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 1,
				containerY: 1,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(4);

			const features = store.copyAll();

			// Drawn LineString and Closing point
			expect(features.length).toBe(2);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[1, 1],
			]);
		});

		it("finishes the line on the the third click", () => {
			project.mockReturnValueOnce({ x: 50, y: 50 });
			project.mockReturnValueOnce({ x: 50, y: 50 });
			project.mockReturnValueOnce({ x: 100, y: 100 });
			project.mockReturnValueOnce({ x: 100, y: 100 });

			lineStringMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 50,
				containerY: 50,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 50,
				containerY: 50,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();

			// Drawn LineString and Closing point
			expect(features.length).toBe(2);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[1, 1],
			]);

			expect(features[1].geometry.coordinates).toStrictEqual([1, 1]);

			lineStringMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 100,
				containerY: 100,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onClick({
				lng: 2,
				lat: 2,
				containerX: 100,
				containerY: 100,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).not.toBeCalledWith([expect.any(String)], "delete");

			lineStringMode.onClick({
				lng: 2,
				lat: 2,
				containerX: 100,
				containerY: 100,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(9);

			expect(onChange).toHaveBeenNthCalledWith(
				9,
				[expect.any(String)],
				"delete",
			);

			features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[1, 1],
				[2, 2],
			]);
		});

		it("handles self intersection", () => {
			// TODO: Limit precision to 9 decimals

			lineStringMode = new TerraDrawLineStringMode({
				allowSelfIntersections: false,
			});

			const mockConfig = getMockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			store = mockConfig.store;
			project = mockConfig.project;
			lineStringMode.register(mockConfig);
			lineStringMode.start();

			// We don't want there to be a closing click, so we
			// make the distances between points huge (much large than 40 pixels)
			project.mockImplementation((lng, lat) => ({
				x: lng * 1000,
				y: lat * 1000,
			}));

			lineStringMode.onClick({
				lng: 6.50390625,
				lat: 32.99023555965106,
				containerX: 6.50390625,
				containerY: 32.99023555965106,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onMouseMove({
				lng: -9.931640625,
				lat: 5.090944175033399,
				containerX: -9.931640625,
				containerY: 5.090944175033399,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onClick({
				lng: -9.931640625,
				lat: 5.090944175033399,
				containerX: -9.931640625,
				containerY: 5.090944175033399,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onMouseMove({
				lng: 19.86328125,
				lat: 2.0210651187669897,
				containerX: 19.86328125,
				containerY: 2.0210651187669897,
				button: "left",
				heldKeys: [],
			});

			lineStringMode.onClick({
				lng: 19.86328125,
				lat: 2.0210651187669897,
				containerX: 19.86328125,
				containerY: 2.0210651187669897,
				button: "left",
				heldKeys: [],
			});

			// This point is causing self intersection
			lineStringMode.onMouseMove({
				lng: -8.173828125,
				lat: 24.367113562651262,
				containerX: -8.173828125,
				containerY: 24.367113562651262,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(7);

			lineStringMode.onClick({
				lng: -8.173828125,
				lat: 24.367113562651262,
				containerX: -8.173828125,
				containerY: 24.367113562651262,
				button: "left",
				heldKeys: [],
			});

			// Update geometry is NOT called because
			// there is a self intersection
			expect(onChange).toBeCalledTimes(7);
		});
	});

	describe("onKeyUp", () => {
		let lineStringMode: TerraDrawLineStringMode;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let store: GeoJSONStore;
		let project: jest.Mock;

		beforeEach(() => {
			lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = getMockModeConfig(lineStringMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			store = mockConfig.store;
			project = mockConfig.project;
			lineStringMode.register(mockConfig);
			lineStringMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no line is present", () => {
				lineStringMode.onKeyUp({
					key: "Escape",
					preventDefault: jest.fn(),
					heldKeys: [],
				});
			});

			it("deletes the line when currently editing", () => {
				lineStringMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				lineStringMode.onKeyUp({
					key: "Escape",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(0);
			});
		});

		describe("finish", () => {
			it("finishes the line on finish key press", () => {
				project.mockReturnValueOnce({ x: 50, y: 50 });
				project.mockReturnValueOnce({ x: 50, y: 50 });
				project.mockReturnValueOnce({ x: 100, y: 100 });
				project.mockReturnValueOnce({ x: 100, y: 100 });

				lineStringMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				lineStringMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 50,
					containerY: 50,
					button: "left",
					heldKeys: [],
				});

				lineStringMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 50,
					containerY: 50,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();

				// Drawn LineString and Closing point
				expect(features.length).toBe(2);

				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[1, 1],
				]);

				expect(features[1].geometry.coordinates).toStrictEqual([1, 1]);

				lineStringMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 100,
					containerY: 100,
					button: "left",
					heldKeys: [],
				});

				lineStringMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 100,
					containerY: 100,
					button: "left",
					heldKeys: [],
				});

				expect(onChange).not.toBeCalledWith([expect.any(String)], "delete");

				lineStringMode.onKeyUp({
					key: "Enter",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				expect(onChange).toBeCalledTimes(8);

				expect(onChange).toHaveBeenNthCalledWith(
					8,
					[expect.any(String)],
					"delete",
				);

				features = store.copyAll();
				expect(features.length).toBe(1);

				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[2, 2],
				]);

				expect(onFinish).toBeCalledTimes(1);
			});

			it("does not finish linestring when finish is set to null", () => {
				lineStringMode = new TerraDrawLineStringMode({ keyEvents: null });
				const mockConfig = getMockModeConfig(lineStringMode.mode);
				onChange = mockConfig.onChange;
				store = mockConfig.store;
				project = mockConfig.project;
				lineStringMode.register(mockConfig);
				lineStringMode.start();

				project.mockReturnValueOnce({ x: 50, y: 50 });
				project.mockReturnValueOnce({ x: 50, y: 50 });
				project.mockReturnValueOnce({ x: 100, y: 100 });
				project.mockReturnValueOnce({ x: 100, y: 100 });

				lineStringMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				lineStringMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 50,
					containerY: 50,
					button: "left",
					heldKeys: [],
				});

				lineStringMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 50,
					containerY: 50,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();

				// Drawn LineString and Closing point
				expect(features.length).toBe(2);

				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[1, 1],
				]);

				expect(features[1].geometry.coordinates).toStrictEqual([1, 1]);

				lineStringMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 100,
					containerY: 100,
					button: "left",
					heldKeys: [],
				});

				lineStringMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 100,
					containerY: 100,
					button: "left",
					heldKeys: [],
				});

				expect(onChange).not.toBeCalledWith([expect.any(String)], "delete");

				lineStringMode.onKeyUp({
					key: "Enter",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				expect(onChange).toBeCalledTimes(6);

				features = store.copyAll();
				expect(features.length).toBe(2);

				expect(features[1].geometry.type).toStrictEqual("Point");
				expect(features[1].geometry.coordinates).toStrictEqual([2, 2]);
				expect(features[0].geometry.type).toStrictEqual("LineString");
				expect(features[0].geometry.coordinates).toStrictEqual([
					[0, 0],
					[1, 1],
					[2, 2],
					[2, 2],
				]);
			});
		});
	});

	describe("cleanUp", () => {
		let lineStringMode: TerraDrawLineStringMode;
		let store: GeoJSONStore;

		beforeEach(() => {
			lineStringMode = new TerraDrawLineStringMode();
			const mockConfig = getMockModeConfig(lineStringMode.mode);
			store = mockConfig.store;
			lineStringMode.register(mockConfig);
			lineStringMode.start();
		});

		it("does not throw error if feature has not been created ", () => {
			expect(() => {
				lineStringMode.cleanUp();
			}).not.toThrowError();
		});

		it("cleans up correctly if drawing has started", () => {
			lineStringMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(store.copyAll().length).toBe(1);

			lineStringMode.cleanUp();

			// Removes the LineString that was being created
			expect(store.copyAll().length).toBe(0);
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.onDrag();
			}).not.toThrowError();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.onDragStart();
			}).not.toThrowError();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const lineStringMode = new TerraDrawLineStringMode();

			expect(() => {
				lineStringMode.onDragEnd();
			}).not.toThrowError();
		});
	});

	describe("styling", () => {
		it("gets", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			lineStringMode.register(getMockModeConfig(lineStringMode.mode));
			expect(lineStringMode.styles).toStrictEqual({});
		});

		it("set fails if non valid styling", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			lineStringMode.register(getMockModeConfig(lineStringMode.mode));

			expect(() => {
				(lineStringMode.styles as unknown) = "test";
			}).toThrowError();

			expect(lineStringMode.styles).toStrictEqual({});
		});

		it("sets", () => {
			const lineStringMode = new TerraDrawLineStringMode();
			lineStringMode.register(getMockModeConfig(lineStringMode.mode));

			lineStringMode.styles = {
				lineStringColor: "#ffffff",
			};

			expect(lineStringMode.styles).toStrictEqual({
				lineStringColor: "#ffffff",
			});
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for point", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
					lineStringWidth: 4,
					closingPointColor: "#111111",
					closingPointWidth: 3,
					closingPointOutlineColor: "#222222",
					closingPointOutlineWidth: 2,
				},
			});

			expect(
				lineStringMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "linestring" },
				}),
			).toMatchObject({
				pointColor: "#111111",
				pointWidth: 3,
				pointOutlineColor: "#222222",
				pointOutlineWidth: 2,
			});
		});

		it("returns the correct styles for point using functions", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: () => "#ffffff",
					lineStringWidth: () => 4,
					closingPointColor: () => "#111111",
					closingPointWidth: () => 3,
					closingPointOutlineColor: () => "#222222",
					closingPointOutlineWidth: () => 2,
				},
			});

			expect(
				lineStringMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "linestring" },
				}),
			).toMatchObject({
				pointColor: "#111111",
				pointWidth: 3,
				pointOutlineColor: "#222222",
				pointOutlineWidth: 2,
			});
		});

		it("returns the correct styles for linestring", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
					lineStringWidth: 4,
					closingPointColor: "#111111",
					closingPointWidth: 3,
					closingPointOutlineColor: "#222222",
					closingPointOutlineWidth: 2,
				},
			});

			expect(
				lineStringMode.styleFeature({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties: { mode: "linestring" },
				}),
			).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 4,
			});
		});

		it("returns the correct styles for linestring using functions", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: () => "#ffffff",
					lineStringWidth: () => 4,
					closingPointColor: () => "#111111",
					closingPointWidth: () => 3,
					closingPointOutlineColor: () => "#222222",
					closingPointOutlineWidth: () => 2,
				},
			});

			expect(
				lineStringMode.styleFeature({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties: { mode: "linestring" },
				}),
			).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 4,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid linestring feature", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
				},
			});
			lineStringMode.register(getMockModeConfig("linestring"));

			expect(
				lineStringMode.validateFeature({
					id: "ed030248-d7ee-45a2-b8e8-37ad2f622509",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [],
					},
					properties: {
						mode: "linestring",
						createdAt: 1685654949450,
						updatedAt: 1685654950609,
					},
				}),
			).toBe(false);
		});

		it("returns true for valid linestring feature", () => {
			const lineStringMode = new TerraDrawLineStringMode({
				styles: {
					lineStringColor: "#ffffff",
				},
			});
			lineStringMode.register(getMockModeConfig("linestring"));

			expect(
				lineStringMode.validateFeature({
					id: "ed030248-d7ee-45a2-b8e8-37ad2f622509",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[-2.329101563, 51.392350875],
							[-0.439453125, 52.52290594],
						],
					},
					properties: {
						mode: "linestring",
						createdAt: 1685654949450,
						updatedAt: 1685654950609,
					},
				}),
			).toBe(true);
		});
	});
});
