import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawAngledRectangleMode } from "./angled-rectangle.mode";

describe("TerraDrawAngledRectangleMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode();
			expect(angledRectangleMode.mode).toBe("angled-rectangle");
		});

		it("constructs with options", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode({
				styles: { fillColor: "#ffffff" },
				pointerDistance: 40,
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
				cursors: {
					start: "crosshair",
					close: "pointer",
				},
			});
			expect(angledRectangleMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawAngledRectangleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawAngledRectangleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode();
			expect(angledRectangleMode.state).toBe("unregistered");
			angledRectangleMode.register(getMockModeConfig(angledRectangleMode.mode));
			expect(angledRectangleMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode();

			expect(() => {
				angledRectangleMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode();

			expect(() => {
				angledRectangleMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode();

			expect(() => {
				angledRectangleMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode();

			expect(() => {
				angledRectangleMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode();

			expect(() => {
				angledRectangleMode.register(
					getMockModeConfig(angledRectangleMode.mode),
				);
				angledRectangleMode.register(
					getMockModeConfig(angledRectangleMode.mode),
				);
			}).toThrow();
		});

		it("can start correctly", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode();

			angledRectangleMode.register(getMockModeConfig(angledRectangleMode.mode));
			angledRectangleMode.start();

			expect(angledRectangleMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const angledRectangleMode = new TerraDrawAngledRectangleMode();

			angledRectangleMode.register(getMockModeConfig(angledRectangleMode.mode));
			angledRectangleMode.start();
			angledRectangleMode.stop();

			expect(angledRectangleMode.state).toBe("stopped");
		});
	});

	describe("onMouseMove", () => {
		let angledRectangleMode: TerraDrawAngledRectangleMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			store = new GeoJSONStore();
			angledRectangleMode = new TerraDrawAngledRectangleMode({
				validation: () => {
					return true;
				},
			});
			const mockConfig = getMockModeConfig(angledRectangleMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;

			angledRectangleMode.register(mockConfig);
			angledRectangleMode.start();
		});

		it("does nothing if no clicks have occurred ", () => {
			angledRectangleMode.onMouseMove({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).not.toHaveBeenCalled();
		});

		it("updates the coordinate to the mouse position after first click", () => {
			angledRectangleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			angledRectangleMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toHaveBeenCalledTimes(2);

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
			angledRectangleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			angledRectangleMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			angledRectangleMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			angledRectangleMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toHaveBeenCalledTimes(4);

			const features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[
					[0, 0],
					[1, 1],
					[0.999809548845192, 1.0001904124747523],
					[-0.00019045115480796916, 0.00019044148544254127],
					[0, 0],
				],
			]);
		});
	});

	describe("onClick", () => {
		let angledRectangleMode: TerraDrawAngledRectangleMode;
		let store: GeoJSONStore;

		describe("with successful validation", () => {
			beforeEach(() => {
				angledRectangleMode = new TerraDrawAngledRectangleMode({
					validation: () => true,
				});
				const mockConfig = getMockModeConfig(angledRectangleMode.mode);

				store = mockConfig.store;
				angledRectangleMode.register(mockConfig);
				angledRectangleMode.start();
			});

			it("can create a angled rectangle", () => {
				angledRectangleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				angledRectangleMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				angledRectangleMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				angledRectangleMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				angledRectangleMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				// Create a new angled rectangle polygon
				angledRectangleMode.onClick({
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
		});

		describe("with unsuccessful validation", () => {
			beforeEach(() => {
				angledRectangleMode = new TerraDrawAngledRectangleMode({
					validation: () => false,
				});
				const mockConfig = getMockModeConfig(angledRectangleMode.mode);

				store = mockConfig.store;
				angledRectangleMode.register(mockConfig);
				angledRectangleMode.start();
			});

			it("fails to create a angled rectangle when validation returns false", () => {
				angledRectangleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				angledRectangleMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				angledRectangleMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				angledRectangleMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				angledRectangleMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				// Create a new angled rectangle polygon
				angledRectangleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(1);
			});
		});
	});

	describe("onKeyUp", () => {
		let rectangleMode: TerraDrawAngledRectangleMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		it("does nothing if on finish key press is pressed while not drawing", () => {
			rectangleMode = new TerraDrawAngledRectangleMode();
			const mockConfig = getMockModeConfig(rectangleMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			rectangleMode.register(mockConfig);
			rectangleMode.start();

			let features = store.copyAll();
			expect(features.length).toBe(0);

			rectangleMode.onKeyUp({
				key: "Enter",
				preventDefault: jest.fn(),
				heldKeys: [],
			});

			features = store.copyAll();
			expect(features.length).toBe(0);
		});

		it("cancels drawing angled rectangle on cancel key press", () => {
			rectangleMode = new TerraDrawAngledRectangleMode();
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
				key: "Escape",
				preventDefault: jest.fn(),
				heldKeys: [],
			});

			features = store.copyAll();
			expect(features.length).toBe(0);
		});

		it("finishes drawing angled rectangle on finish key press", () => {
			rectangleMode = new TerraDrawAngledRectangleMode();
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

			expect(onChange).toHaveBeenCalledTimes(2);
			expect(onChange).toHaveBeenCalledWith([expect.any(String)], "create");
			expect(onFinish).toHaveBeenCalledTimes(1);
		});

		it("does not finish on key press when keyEvents null", () => {
			rectangleMode = new TerraDrawAngledRectangleMode({ keyEvents: null });
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

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith([expect.any(String)], "create");
			expect(onFinish).toHaveBeenCalledTimes(0);
		});
	});

	describe("validateFeature", () => {
		it("returns true for valid rectangle feature with validation that returns true", () => {
			const rectangleMode = new TerraDrawAngledRectangleMode({
				validation: () => true,
			});
			rectangleMode.register(getMockModeConfig("angled-rectangle"));

			expect(
				rectangleMode.validateFeature({
					id: "5c582a42-c3a7-4bfc-b686-6036f311df3c",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.127976611, 51.514237243],
								[-0.106284245, 51.514237243],
								[-0.106284245, 51.504807832],
								[-0.127976611, 51.504807832],
								[-0.127976611, 51.514237243],
							],
						],
					},
					properties: {
						mode: "angled-rectangle",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toBe(true);
		});

		it("returns false for valid rectangle feature but with validation that returns false", () => {
			const rectangleMode = new TerraDrawAngledRectangleMode({
				validation: () => {
					return false;
				},
			});
			rectangleMode.register(getMockModeConfig("angled-rectangle"));

			expect(
				rectangleMode.validateFeature({
					id: "5c582a42-c3a7-4bfc-b686-6036f311df3c",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.127976611, 51.514237243],
								[-0.106284245, 51.514237243],
								[-0.106284245, 51.504807832],
								[-0.127976611, 51.504807832],
								[-0.127976611, 51.514237243],
							],
						],
					},
					properties: {
						mode: "angled-rectangle",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toBe(false);
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const rectangleMode = new TerraDrawAngledRectangleMode({
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
					properties: { mode: "angled-rectangle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct styles for polygon using function", () => {
			const rectangleMode = new TerraDrawAngledRectangleMode({
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
					properties: { mode: "angled-rectangle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});
	});
});
