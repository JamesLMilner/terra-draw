import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawSensorMode } from "./sensor.mode";

describe("TerraDrawSensorMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const sensorMode = new TerraDrawSensorMode();
			expect(sensorMode.mode).toBe("sensor");
		});

		it("constructs with options", () => {
			const sensorMode = new TerraDrawSensorMode({
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
			expect(sensorMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawSensorMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawSensorMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const sensorMode = new TerraDrawSensorMode();
			expect(sensorMode.state).toBe("unregistered");
			sensorMode.register(getMockModeConfig(sensorMode.mode));
			expect(sensorMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const sensorMode = new TerraDrawSensorMode();

			expect(() => {
				sensorMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const sensorMode = new TerraDrawSensorMode();

			expect(() => {
				sensorMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const sensorMode = new TerraDrawSensorMode();

			expect(() => {
				sensorMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const sensorMode = new TerraDrawSensorMode();

			expect(() => {
				sensorMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const sensorMode = new TerraDrawSensorMode();

			expect(() => {
				sensorMode.register(getMockModeConfig(sensorMode.mode));
				sensorMode.register(getMockModeConfig(sensorMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const sensorMode = new TerraDrawSensorMode();

			sensorMode.register(getMockModeConfig(sensorMode.mode));
			sensorMode.start();

			expect(sensorMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const sensorMode = new TerraDrawSensorMode();

			sensorMode.register(getMockModeConfig(sensorMode.mode));
			sensorMode.start();
			sensorMode.stop();

			expect(sensorMode.state).toBe("stopped");
		});
	});

	describe("onMouseMove", () => {
		let sensorMode: TerraDrawSensorMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			store = new GeoJSONStore();
			sensorMode = new TerraDrawSensorMode({
				validation: () => {
					return true;
				},
			});
			const mockConfig = getMockModeConfig(sensorMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;

			sensorMode.register(mockConfig);
			sensorMode.start();
		});

		it("does nothing if no clicks have occurred ", () => {
			sensorMode.onMouseMove({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).not.toHaveBeenCalled();
		});

		it("updates the initial point coordinate to the mouse position after first click", () => {
			sensorMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sensorMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toHaveBeenCalledTimes(1);

			const features = store.copyAll();
			expect(features.length).toBe(1);

			expect(features[0].geometry.type).toStrictEqual("Point");
			expect(features[0].geometry.coordinates).toStrictEqual([0, 0]);
		});

		it("updates the linestring coordinate to the mouse position after second click and mouse move", () => {
			sensorMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sensorMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sensorMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sensorMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toHaveBeenCalledTimes(3);

			const features = store.copyAll();
			expect(features.length).toBe(2);

			expect(features[0].geometry.type).toStrictEqual("Point");
			expect(features[0].geometry.coordinates).toStrictEqual([0, 0]);

			expect(features[1].geometry.type).toStrictEqual("LineString");
			expect(features[1].geometry.coordinates).toHaveLength(65);
		});
	});

	describe("onClick", () => {
		let sensorMode: TerraDrawSensorMode;
		let store: GeoJSONStore;

		describe("with successful validation", () => {
			beforeEach(() => {
				sensorMode = new TerraDrawSensorMode({
					validation: () => true,
				});
				const mockConfig = getMockModeConfig(sensorMode.mode);

				store = mockConfig.store;
				sensorMode.register(mockConfig);
				sensorMode.start();
			});

			it("fails to create sensor if the final point is not within sector", () => {
				sensorMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 3,
					lat: 3,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				const features = store.copyAll();

				expect(features.length).toBe(2);
			});

			it("fails to create sensor if the final point is not within sector (clockwise)", () => {
				sensorMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: -1,
					lat: -1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onClick({
					lng: -1,
					lat: -1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: -1,
					lat: -1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				const features = store.copyAll();

				expect(features.length).toBe(2);
			});

			it("successfully creates a sensor", () => {
				sensorMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 1.5,
					lat: 1.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				// Move again to ensure the update path works
				sensorMode.onMouseMove({
					lng: 1.5,
					lat: 1.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				const features = store.copyAll();

				expect(features.length).toBe(3);

				sensorMode.onClick({
					lng: 1.5,
					lat: 1.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				const featuresAfterFinalClick = store.copyAll();

				expect(featuresAfterFinalClick.length).toBe(1);
			});
		});

		describe("with non successful validation", () => {
			beforeEach(() => {
				sensorMode = new TerraDrawSensorMode({
					validation: () => false,
				});
				const mockConfig = getMockModeConfig(sensorMode.mode);

				store = mockConfig.store;
				sensorMode.register(mockConfig);
				sensorMode.start();
			});

			it("fails to create a sensor", () => {
				sensorMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sensorMode.onMouseMove({
					lng: 1.5,
					lat: 1.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				// Move again to ensure the update path works
				sensorMode.onMouseMove({
					lng: 1.5,
					lat: 1.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				const features = store.copyAll();

				expect(features.length).toBe(3);

				sensorMode.onClick({
					lng: 1.5,
					lat: 1.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				const featuresAfterFinalClick = store.copyAll();

				expect(featuresAfterFinalClick.length).toBe(1);
			});
		});
	});

	describe("onKeyUp", () => {
		let sensorMode: TerraDrawSensorMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		it("does nothing if on finish key press is pressed while not drawing", () => {
			sensorMode = new TerraDrawSensorMode();
			const mockConfig = getMockModeConfig(sensorMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			sensorMode.register(mockConfig);
			sensorMode.start();

			let features = store.copyAll();
			expect(features.length).toBe(0);

			sensorMode.onKeyUp({
				key: "Enter",
				preventDefault: jest.fn(),
				heldKeys: [],
			});

			features = store.copyAll();
			expect(features.length).toBe(0);
		});

		it("cancels drawing sensor on cancel key press", () => {
			sensorMode = new TerraDrawSensorMode();
			const mockConfig = getMockModeConfig(sensorMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			sensorMode.register(mockConfig);
			sensorMode.start();

			sensorMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();
			expect(features.length).toBe(1);

			sensorMode.onKeyUp({
				key: "Escape",
				preventDefault: jest.fn(),
				heldKeys: [],
			});

			features = store.copyAll();
			expect(features.length).toBe(0);
		});

		it("successfully creates a sensor on enter key press on final part of drawing", () => {
			sensorMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sensorMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sensorMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sensorMode.onMouseMove({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sensorMode.onClick({
				lng: 2,
				lat: 2,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sensorMode.onMouseMove({
				lng: 1.5,
				lat: 1.5,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			const features = store.copyAll();

			expect(features.length).toBe(3);

			sensorMode.onKeyUp({
				key: "Enter",
				preventDefault: jest.fn(),
				heldKeys: [],
			});

			const featuresAfterFinalClick = store.copyAll();

			expect(featuresAfterFinalClick.length).toBe(1);
		});

		it("does not finish on key press when keyEvents null", () => {
			sensorMode = new TerraDrawSensorMode({ keyEvents: null });
			const mockConfig = getMockModeConfig(sensorMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			sensorMode.register(mockConfig);
			sensorMode.start();

			sensorMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();
			expect(features.length).toBe(1);

			sensorMode.onKeyUp({
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
			const sensorMode = new TerraDrawSensorMode({
				validation: () => true,
			});
			sensorMode.register(getMockModeConfig("sensor"));

			expect(
				sensorMode.validateFeature({
					id: "5c582a42-c3a7-4bfc-b686-6036f311df3c",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.096802636, 51.500464739],
								[-0.109590068, 51.510206381],
								[-0.109590068, 51.510206381],
								[-0.11416909, 51.50689961],
								[-0.116656509, 51.502817579],
								[-0.116752741, 51.498451789],
								[-0.114446197, 51.494328048],
								[-0.110014675, 51.490943142],
								[-0.103991904, 51.48870495],
								[-0.097103263, 51.487883219],
								[-0.090178415, 51.488576994],
								[-0.084051383, 51.490702652],
								[-0.079460103, 51.494004006],
								[-0.076957545, 51.498083239],
								[-0.076845116, 51.502448914],
								[-0.079136357, 51.506575225],
								[-0.083555311, 51.509965331],
								[-0.089569764, 51.512211129],
								[-0.096455339, 51.513042321],
								[-0.096802636, 51.500464739],
							],
						],
					},
					properties: {
						mode: "sensor",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toBe(true);
		});

		it("returns false for valid rectangle feature but with validation that returns false", () => {
			const sensorMode = new TerraDrawSensorMode({
				validation: () => {
					return false;
				},
			});
			sensorMode.register(getMockModeConfig("sensor"));

			expect(
				sensorMode.validateFeature({
					id: "5c582a42-c3a7-4bfc-b686-6036f311df3c",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.096802636, 51.500464739],
								[-0.109590068, 51.510206381],
								[-0.109590068, 51.510206381],
								[-0.11416909, 51.50689961],
								[-0.116656509, 51.502817579],
								[-0.116752741, 51.498451789],
								[-0.114446197, 51.494328048],
								[-0.110014675, 51.490943142],
								[-0.103991904, 51.48870495],
								[-0.097103263, 51.487883219],
								[-0.090178415, 51.488576994],
								[-0.084051383, 51.490702652],
								[-0.079460103, 51.494004006],
								[-0.076957545, 51.498083239],
								[-0.076845116, 51.502448914],
								[-0.079136357, 51.506575225],
								[-0.083555311, 51.509965331],
								[-0.089569764, 51.512211129],
								[-0.096455339, 51.513042321],
								[-0.096802636, 51.500464739],
							],
						],
					},
					properties: {
						mode: "sensor",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toBe(false);
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const sensorMode = new TerraDrawSensorMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#111111",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});

			expect(
				sensorMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "sensor" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct styles for point", () => {
			const sensorMode = new TerraDrawSensorMode({
				styles: {
					centerPointColor: "#222222",
					centerPointOutlineColor: "#333333",
					centerPointWidth: 2,
					centerPointOutlineWidth: 1,
					outlineColor: "#111111",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});

			expect(
				sensorMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "sensor" },
				}),
			).toMatchObject({
				pointColor: "#222222",
				pointOutlineColor: "#333333",
				pointWidth: 2,
				pointOutlineWidth: 1,
			});
		});

		it("returns the correct styles for polygon using function", () => {
			const sensorMode = new TerraDrawSensorMode({
				styles: {
					fillColor: () => "#ffffff",
					outlineColor: () => "#111111",
					outlineWidth: () => 2,
					fillOpacity: () => 0.5,
				},
			});

			expect(
				sensorMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "sensor" },
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
