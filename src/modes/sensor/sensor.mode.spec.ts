import { Position } from "geojson";
import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawSectorMode } from "./sector.mode";

describe("TerraDrawSectorMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const sectorMode = new TerraDrawSectorMode();
			expect(sectorMode.mode).toBe("sector");
		});

		it("constructs with options", () => {
			const sectorMode = new TerraDrawSectorMode({
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
			expect(sectorMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawSectorMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawSectorMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const sectorMode = new TerraDrawSectorMode();
			expect(sectorMode.state).toBe("unregistered");
			sectorMode.register(getMockModeConfig(sectorMode.mode));
			expect(sectorMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const sectorMode = new TerraDrawSectorMode();

			expect(() => {
				sectorMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const sectorMode = new TerraDrawSectorMode();

			expect(() => {
				sectorMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const sectorMode = new TerraDrawSectorMode();

			expect(() => {
				sectorMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const sectorMode = new TerraDrawSectorMode();

			expect(() => {
				sectorMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const sectorMode = new TerraDrawSectorMode();

			expect(() => {
				sectorMode.register(getMockModeConfig(sectorMode.mode));
				sectorMode.register(getMockModeConfig(sectorMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const sectorMode = new TerraDrawSectorMode();

			sectorMode.register(getMockModeConfig(sectorMode.mode));
			sectorMode.start();

			expect(sectorMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const sectorMode = new TerraDrawSectorMode();

			sectorMode.register(getMockModeConfig(sectorMode.mode));
			sectorMode.start();
			sectorMode.stop();

			expect(sectorMode.state).toBe("stopped");
		});
	});

	describe("onMouseMove", () => {
		let sectorMode: TerraDrawSectorMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			store = new GeoJSONStore();
			sectorMode = new TerraDrawSectorMode({
				validation: () => {
					return true;
				},
			});
			const mockConfig = getMockModeConfig(sectorMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;

			sectorMode.register(mockConfig);
			sectorMode.start();
		});

		it("does nothing if no clicks have occurred ", () => {
			sectorMode.onMouseMove({
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
			sectorMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			sectorMode.onMouseMove({
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

		it.each([
			["clockwise", 2],
			["anticlockwise", -1],
		])(
			`updates the coordinate to the mouse position after second click (%s)`,
			(_, coordinate) => {
				sectorMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onMouseMove({
					lng: coordinate,
					lat: coordinate,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onChange).toHaveBeenCalledTimes(4);

				const features = store.copyAll();
				expect(features.length).toBe(1);

				// 64 + 4 = 68
				// We lose one coordinate because after coordinate limitation it is identical
				expect(features[0].geometry.coordinates[0]).toHaveLength(67);

				const duplicates = new Set();
				for (
					let i = 1;
					i < (features[0].geometry.coordinates[0] as Position[]).length - 1;
					i++
				) {
					const coordinate = (
						features[0].geometry.coordinates[0] as Position[]
					)[i];
					const key = `${coordinate[0]}-${coordinate[1]}`;
					if (duplicates.has(key)) {
						throw new Error("Duplicate coordinate found: " + key);
					}
					duplicates.add(key);
				}
			},
		);
	});

	describe("onClick", () => {
		let sectorMode: TerraDrawSectorMode;
		let store: GeoJSONStore;

		describe("with successful validation", () => {
			beforeEach(() => {
				sectorMode = new TerraDrawSectorMode({
					validation: () => true,
				});
				const mockConfig = getMockModeConfig(sectorMode.mode);

				store = mockConfig.store;
				sectorMode.register(mockConfig);
				sectorMode.start();
			});

			it("can create a sector", () => {
				sectorMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				// Create a new sector polygon
				sectorMode.onClick({
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
				sectorMode = new TerraDrawSectorMode({
					validation: () => false,
				});
				const mockConfig = getMockModeConfig(sectorMode.mode);

				store = mockConfig.store;
				sectorMode.register(mockConfig);
				sectorMode.start();
			});

			it("fails to create a sector when validation returns false", () => {
				sectorMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onMouseMove({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onMouseMove({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				sectorMode.onClick({
					lng: 2,
					lat: 2,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				// Create a new sector polygon
				sectorMode.onClick({
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
		let rectangleMode: TerraDrawSectorMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		it("does nothing if on finish key press is pressed while not drawing", () => {
			rectangleMode = new TerraDrawSectorMode();
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

		it("cancels drawing sector on cancel key press", () => {
			rectangleMode = new TerraDrawSectorMode();
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

		it("finishes drawing sector on finish key press", () => {
			rectangleMode = new TerraDrawSectorMode();
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
			rectangleMode = new TerraDrawSectorMode({ keyEvents: null });
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
			const rectangleMode = new TerraDrawSectorMode({
				validation: () => true,
			});
			rectangleMode.register(getMockModeConfig("sector"));

			expect(
				rectangleMode.validateFeature({
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
						mode: "sector",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toBe(true);
		});

		it("returns false for valid rectangle feature but with validation that returns false", () => {
			const rectangleMode = new TerraDrawSectorMode({
				validation: () => {
					return false;
				},
			});
			rectangleMode.register(getMockModeConfig("sector"));

			expect(
				rectangleMode.validateFeature({
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
						mode: "sector",
						createdAt: 1685655516297,
						updatedAt: 1685655518118,
					},
				}),
			).toBe(false);
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const rectangleMode = new TerraDrawSectorMode({
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
					properties: { mode: "sector" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct styles for polygon using function", () => {
			const rectangleMode = new TerraDrawSectorMode({
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
					properties: { mode: "sector" },
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
