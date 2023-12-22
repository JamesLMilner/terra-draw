import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawRectangleMode } from "./rectangle.mode";

describe("TerraDrawRectangleMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const rectangleMode = new TerraDrawRectangleMode();
			expect(rectangleMode.mode).toBe("rectangle");
			expect(rectangleMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
			});
			expect(rectangleMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawRectangleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawRectangleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const rectangleMode = new TerraDrawRectangleMode();
			expect(rectangleMode.state).toBe("unregistered");
			rectangleMode.register(getMockModeConfig(rectangleMode.mode));
			expect(rectangleMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.state = "started";
			}).toThrowError();
		});

		it("stopping before not registering throws error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.stop();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.start();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.start();
			}).toThrowError();
		});

		it("registering multiple times throws an error", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.register(getMockModeConfig(rectangleMode.mode));
				rectangleMode.register(getMockModeConfig(rectangleMode.mode));
			}).toThrowError();
		});

		it("can start correctly", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			rectangleMode.register(getMockModeConfig(rectangleMode.mode));
			rectangleMode.start();

			expect(rectangleMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			rectangleMode.register(getMockModeConfig(rectangleMode.mode));
			rectangleMode.start();
			rectangleMode.stop();

			expect(rectangleMode.state).toBe("stopped");
		});
	});

	describe("onClick", () => {
		let rectangleMode: TerraDrawRectangleMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			rectangleMode = new TerraDrawRectangleMode();
			store = new GeoJSONStore();
			onChange = jest.fn();
		});

		it("throws an error if not registered", () => {
			expect(() => {
				rectangleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});
			}).toThrowError();
		});

		describe("registered", () => {
			beforeEach(() => {
				const mockConfig = getMockModeConfig(rectangleMode.mode);

				store = mockConfig.store;
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;

				rectangleMode.register(mockConfig);
				rectangleMode.start();
			});
			it("adds a rectangle to store if registered", () => {
				rectangleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onChange).toBeCalledTimes(1);
				expect(onChange).toBeCalledWith([expect.any(String)], "create");
			});

			it("finishes drawing rectangle on second click", () => {
				rectangleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				rectangleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(1);

				expect(onChange).toBeCalledTimes(2);
				expect(onChange).toBeCalledWith([expect.any(String)], "create");
				expect(onFinish).toBeCalledTimes(1);
			});
		});
	});

	describe("onKeyUp", () => {
		let rectangleMode: TerraDrawRectangleMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		it("finishes drawing rectangle on finish key press", () => {
			rectangleMode = new TerraDrawRectangleMode();
			const mockConfig = getMockModeConfig(rectangleMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			rectangleMode.register(mockConfig);
			rectangleMode.start();

			rectangleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();
			expect(features.length).toBe(1);

			rectangleMode.onKeyUp({
				key: "Enter",
				preventDefault: jest.fn(),
				heldKeys: [],
			});

			rectangleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			features = store.copyAll();
			// Two as the rectangle has been closed via enter
			expect(features.length).toBe(2);

			expect(onChange).toBeCalledTimes(2);
			expect(onChange).toBeCalledWith([expect.any(String)], "create");
			expect(onFinish).toBeCalledTimes(1);
		});

		it("does not finish on key press when keyEvents null", () => {
			rectangleMode = new TerraDrawRectangleMode({ keyEvents: null });
			const mockConfig = getMockModeConfig(rectangleMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			rectangleMode.register(mockConfig);
			rectangleMode.start();

			rectangleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();
			expect(features.length).toBe(1);

			rectangleMode.onKeyUp({
				key: "Enter",
				preventDefault: jest.fn(),
				heldKeys: [],
			});

			features = store.copyAll();

			// Only one as the click will close the rectangle
			expect(features.length).toBe(1);

			expect(onChange).toBeCalledTimes(1);
			expect(onChange).toBeCalledWith([expect.any(String)], "create");
			expect(onFinish).toBeCalledTimes(0);
		});
	});

	describe("onMouseMove", () => {
		let rectangleMode: TerraDrawRectangleMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			rectangleMode = new TerraDrawRectangleMode();

			const mockConfig = getMockModeConfig(rectangleMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;

			rectangleMode.register(mockConfig);
			rectangleMode.start();
		});

		it("updates the rectangle size", () => {
			rectangleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(1);
			expect(onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"create",
			);

			const feature = store.copyAll()[0];

			rectangleMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 1,
				containerY: 1,
				button: "left",
				heldKeys: [],
			});
			expect(onChange).toBeCalledTimes(2);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"update",
			);

			const updatedFeature = store.copyAll()[0];

			expect(feature.id).toBe(updatedFeature.id);
			expect(feature.geometry.coordinates).not.toStrictEqual(
				updatedFeature.geometry.coordinates,
			);
		});
	});

	describe("cleanUp", () => {
		let rectangleMode: TerraDrawRectangleMode;
		let onChange: jest.Mock;

		beforeEach(() => {
			rectangleMode = new TerraDrawRectangleMode();

			const mockConfig = getMockModeConfig(rectangleMode.mode);

			onChange = mockConfig.onChange;

			rectangleMode.register(mockConfig);
			rectangleMode.start();
		});

		it("does not delete if no rectangle has been created", () => {
			rectangleMode.cleanUp();
			expect(onChange).toBeCalledTimes(0);
		});

		it("does delete if a rectangle has been created", () => {
			rectangleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			rectangleMode.cleanUp();

			expect(onChange).toBeCalledTimes(2);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"delete",
			);
		});
	});

	describe("onKeyUp", () => {
		let store: GeoJSONStore;
		let rectangleMode: TerraDrawRectangleMode;

		beforeEach(() => {
			jest.resetAllMocks();
			rectangleMode = new TerraDrawRectangleMode();

			const mockConfig = getMockModeConfig(rectangleMode.mode);
			store = mockConfig.store;
			rectangleMode.register(mockConfig);
			rectangleMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no rectangle is present", () => {
				rectangleMode.onKeyUp({
					key: "Escape",
					preventDefault: jest.fn(),
					heldKeys: [],
				});
			});

			it("deletes the rectangle when currently editing", () => {
				rectangleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				rectangleMode.onKeyUp({
					key: "Escape",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(0);
			});
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.onDrag();
			}).not.toThrowError();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.onDragStart();
			}).not.toThrowError();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const rectangleMode = new TerraDrawRectangleMode();

			expect(() => {
				rectangleMode.onDragEnd();
			}).not.toThrowError();
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#111111",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});

			expect(
				rectangleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "rectangle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct styles for polygon using function", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: {
					fillColor: () => "#ffffff",
					outlineColor: () => "#111111",
					outlineWidth: () => 2,
					fillOpacity: () => 0.5,
				},
			});

			expect(
				rectangleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "rectangle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid rectangle feature", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			rectangleMode.register(getMockModeConfig("rectangle"));

			expect(
				rectangleMode.validateFeature({
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

		it("returns false for self intersecting polygon feature", () => {
			const rectangleMode = new TerraDrawRectangleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			rectangleMode.register(getMockModeConfig("rectangle"));

			expect(
				rectangleMode.validateFeature({
					id: "66608334-7cf1-4f9e-a7f9-75e5ac135e68",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[32.444491568083606, 14.505420356577304],
							[30.307948144285064, 14.505420356577304],
							[34.06410625175073, 12.956749504791858],
							[30.307948144285064, 11.633717129582067],
							[32.444491568083606, 11.633717129582067],
							[32.444491568083606, 14.505420356577304],
						],
					},
					properties: {
						mode: "rectangle",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toBe(false);
		});
	});
});
