import { Polygon, Position } from "geojson";
import { GeoJSONStore, GeoJSONStoreFeatures } from "../../store/store";
import { MockModeConfig } from "../../test/mock-mode-config";
import { TerraDrawSectorMode } from "./sector.mode";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { followsRightHandRule } from "../../geometry/boolean/right-hand-rule";
import { COMMON_PROPERTIES, TerraDrawGeoJSONStore } from "../../common";

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
			sectorMode.register(MockModeConfig(sectorMode.mode));
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
				sectorMode.register(MockModeConfig(sectorMode.mode));
				sectorMode.register(MockModeConfig(sectorMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const sectorMode = new TerraDrawSectorMode();

			sectorMode.register(MockModeConfig(sectorMode.mode));
			sectorMode.start();

			expect(sectorMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const sectorMode = new TerraDrawSectorMode();

			sectorMode.register(MockModeConfig(sectorMode.mode));
			sectorMode.start();
			sectorMode.stop();

			expect(sectorMode.state).toBe("stopped");
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const sectorMode = new TerraDrawSectorMode();
			sectorMode.updateOptions({
				cursors: {
					start: "pointer",
				},
			});
			const mockConfig = MockModeConfig(sectorMode.mode);
			sectorMode.register(mockConfig);
			sectorMode.start();
			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change key events", () => {
			const sectorMode = new TerraDrawSectorMode();
			sectorMode.updateOptions({
				keyEvents: {
					cancel: "C",
					finish: "F",
				},
			});
			const mockConfig = MockModeConfig(sectorMode.mode);
			sectorMode.register(mockConfig);
			sectorMode.start();

			sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);

			sectorMode.onKeyUp(MockKeyboardEvent({ key: "C" }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(0);
		});

		it("can update styles", () => {
			const sectorMode = new TerraDrawSectorMode();

			const mockConfig = MockModeConfig(sectorMode.mode);

			sectorMode.register(mockConfig);
			sectorMode.start();

			sectorMode.updateOptions({
				styles: {
					fillColor: "#ffffff",
				},
			});
			expect(sectorMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
		});
	});

	describe("onMouseMove", () => {
		let sectorMode: TerraDrawSectorMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			store = new GeoJSONStore();
			sectorMode = new TerraDrawSectorMode({
				validation: () => {
					return { valid: true };
				},
			});
			const mockConfig = MockModeConfig(sectorMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;

			sectorMode.register(mockConfig);
			sectorMode.start();
		});

		it("does nothing if no clicks have occurred ", () => {
			sectorMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).not.toHaveBeenCalled();
		});

		it("updates the coordinate to the mouse position after first click", () => {
			sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			sectorMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

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

		it.each([["clockwise"], ["anticlockwise"]])(
			`updates the coordinate to the mouse position after second click (%s)`,
			() => {
				sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				sectorMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				sectorMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				sectorMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 0 }));

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
		let store: TerraDrawGeoJSONStore;
		let onFinish: jest.Mock;

		describe("with successful validation", () => {
			beforeEach(() => {
				sectorMode = new TerraDrawSectorMode({
					validation: () => {
						return { valid: true };
					},
				});
				const mockConfig = MockModeConfig(sectorMode.mode);

				store = mockConfig.store;
				onFinish = mockConfig.onFinish;
				sectorMode.register(mockConfig);
				sectorMode.start();
			});

			it("can create a sector", () => {
				sectorMode.onClick(
					MockCursorEvent({ lng: -0.128673315, lat: 51.500349947 }),
				);

				let features = store.copyAll();
				expect(features.length).toBe(1);
				expect(
					features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBe(true);

				sectorMode.onMouseMove(
					MockCursorEvent({ lng: -0.092495679, lat: 51.515995286 }),
				);

				sectorMode.onClick(
					MockCursorEvent({ lng: -0.092495679, lat: 51.515995286 }),
				);

				sectorMode.onMouseMove(
					MockCursorEvent({ lng: -0.087491348, lat: 51.490132315 }),
				);

				sectorMode.onClick(
					MockCursorEvent({ lng: -0.087491348, lat: 51.490132315 }),
				);

				features = store.copyAll();
				expect(features.length).toBe(1);
				expect(
					features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
				).toBe(undefined);

				expect(features[0].geometry.type).toBe("Polygon");

				expect(followsRightHandRule(features[0].geometry as Polygon)).toBe(
					true,
				);

				expect(onFinish).toHaveBeenCalledTimes(1);

				// Create a new sector polygon
				sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				features = store.copyAll();
				expect(features.length).toBe(2);
			});
		});

		describe("with unsuccessful validation", () => {
			beforeEach(() => {
				sectorMode = new TerraDrawSectorMode({
					validation: () => {
						return { valid: false };
					},
				});
				const mockConfig = MockModeConfig(sectorMode.mode);

				store = mockConfig.store;
				sectorMode.register(mockConfig);
				sectorMode.start();
			});

			it("fails to create a sector when validation returns false", () => {
				sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				sectorMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

				sectorMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				sectorMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));

				sectorMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

				let features = store.copyAll();
				expect(features.length).toBe(1);

				// Create a new sector polygon
				sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				features = store.copyAll();
				expect(features.length).toBe(1);
			});
		});
	});

	describe("onKeyUp", () => {
		let sectorMode: TerraDrawSectorMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		it("does nothing if on finish key press is pressed while not drawing", () => {
			sectorMode = new TerraDrawSectorMode();
			const mockConfig = MockModeConfig(sectorMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			sectorMode.register(mockConfig);
			sectorMode.start();

			let features = store.copyAll();
			expect(features.length).toBe(0);

			sectorMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

			features = store.copyAll();
			expect(features.length).toBe(0);
		});

		it("cancels drawing sector on cancel key press", () => {
			sectorMode = new TerraDrawSectorMode();
			const mockConfig = MockModeConfig(sectorMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			sectorMode.register(mockConfig);
			sectorMode.start();

			sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);

			sectorMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

			features = store.copyAll();
			expect(features.length).toBe(0);
		});

		it("finishes drawing sector on finish key press", () => {
			sectorMode = new TerraDrawSectorMode();
			const mockConfig = MockModeConfig(sectorMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			sectorMode.register(mockConfig);
			sectorMode.start();

			sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			sectorMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

			sectorMode.onMouseMove(MockCursorEvent({ lng: 2, lat: 1 }));

			sectorMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

			expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
				action: "draw",
				mode: "sector",
			});

			const features = store.copyAll();
			expect(features.length).toBe(1);
			expect(features[0].geometry.type).toBe("Polygon");
			expect(features[0].properties[COMMON_PROPERTIES.CURRENTLY_DRAWING]).toBe(
				undefined,
			);
			expect(followsRightHandRule(features[0].geometry as Polygon)).toBe(true);
		});

		it("does not finish on key press when keyEvents null", () => {
			sectorMode = new TerraDrawSectorMode({ keyEvents: null });
			const mockConfig = MockModeConfig(sectorMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			sectorMode.register(mockConfig);
			sectorMode.start();

			sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = store.copyAll();
			expect(features.length).toBe(1);

			sectorMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

			features = store.copyAll();

			// Only one as the click will close the sector
			expect(features.length).toBe(1);

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"create",
				undefined,
			);
			expect(onFinish).toHaveBeenCalledTimes(0);
		});
	});

	describe("validateFeature", () => {
		it("returns true for valid sector feature with validation that returns true", () => {
			const sectorMode = new TerraDrawSectorMode({
				validation: () => {
					return { valid: true };
				},
			});
			sectorMode.register(MockModeConfig("sector"));

			expect(
				sectorMode.validateFeature({
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
			).toEqual({
				valid: true,
			});
		});

		it("returns false for valid sector feature but with validation that returns false", () => {
			const sectorMode = new TerraDrawSectorMode({
				validation: () => {
					return { valid: true };
				},
			});
			sectorMode.register(MockModeConfig("sector"));

			expect(
				sectorMode.validateFeature({
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
			).toEqual({
				valid: true,
			});
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const sectorMode = new TerraDrawSectorMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#111111",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});

			expect(
				sectorMode.styleFeature({
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
			const sectorMode = new TerraDrawSectorMode({
				styles: {
					fillColor: () => "#ffffff",
					outlineColor: () => "#111111",
					outlineWidth: () => 2,
					fillOpacity: () => 0.5,
				},
			});

			sectorMode.register(MockModeConfig(sectorMode.mode));

			expect(
				sectorMode.styleFeature({
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

	describe("afterFeatureUpdated", () => {
		it("does nothing when update is not for the currently drawn polygon", () => {
			const sectorMode = new TerraDrawSectorMode();
			const mockConfig = MockModeConfig(sectorMode.mode);
			sectorMode.register(mockConfig);
			sectorMode.start();

			jest.spyOn(mockConfig.store, "delete");

			sectorMode.onClick(
				MockCursorEvent({ lng: -0.128673315, lat: 51.500349947 }),
			);

			sectorMode.onMouseMove(
				MockCursorEvent({ lng: -0.092495679, lat: 51.515995286 }),
			);

			sectorMode.onClick(
				MockCursorEvent({ lng: -0.092495679, lat: 51.515995286 }),
			);

			sectorMode.onMouseMove(
				MockCursorEvent({ lng: -0.087491348, lat: 51.490132315 }),
			);

			sectorMode.onClick(
				MockCursorEvent({ lng: -0.087491348, lat: 51.490132315 }),
			);

			sectorMode.onClick(
				MockCursorEvent({ lng: -0.087491348, lat: 51.490132315 }),
			);

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			const createdPolygon = features[0] as GeoJSONStoreFeatures;

			// Ensure the onChange count to 0
			mockConfig.onChange.mockClear();
			mockConfig.setDoubleClickToZoom.mockClear();

			sectorMode.afterFeatureUpdated({
				...createdPolygon,
			});

			expect(mockConfig.setDoubleClickToZoom).toHaveBeenCalledTimes(0);
			expect(mockConfig.store.delete).toHaveBeenCalledTimes(0);
			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("sets drawing back to started", () => {
			const sectorMode = new TerraDrawSectorMode();
			const mockConfig = MockModeConfig(sectorMode.mode);
			sectorMode.register(mockConfig);
			sectorMode.start();

			sectorMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			sectorMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			const features = mockConfig.store.copyAll();
			expect(features.length).toBe(1);
			const feature = features[0];

			// Set the onChange count to 0
			mockConfig.setDoubleClickToZoom.mockClear();

			sectorMode.afterFeatureUpdated({
				...feature,
			});

			expect(mockConfig.setDoubleClickToZoom).toHaveBeenCalledTimes(1);
		});
	});
});
