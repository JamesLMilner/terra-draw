import { GeoJSONStore } from "../../store/store";
import { MockModeConfig } from "../../test/mock-mode-config";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { TerraDrawFreehandMode } from "./freehand.mode";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { Polygon } from "geojson";
import { followsRightHandRule } from "../../geometry/boolean/right-hand-rule";
import { TerraDrawGeoJSONStore } from "../../common";

describe("TerraDrawFreehandMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const freehandMode = new TerraDrawFreehandMode();
			expect(freehandMode.mode).toBe("freehand");
			expect(freehandMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const freehandMode = new TerraDrawFreehandMode({
				styles: { outlineColor: "#ffffff" },
				minDistance: 5,
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
			});
			expect(freehandMode.styles).toStrictEqual({
				outlineColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawFreehandMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawFreehandMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const freehandMode = new TerraDrawFreehandMode();
			expect(freehandMode.state).toBe("unregistered");
			freehandMode.register(MockModeConfig(freehandMode.mode));
			expect(freehandMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const freehandMode = new TerraDrawFreehandMode();

			expect(() => {
				freehandMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const freehandMode = new TerraDrawFreehandMode();

			expect(() => {
				freehandMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const freehandMode = new TerraDrawFreehandMode();

			expect(() => {
				freehandMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const freehandMode = new TerraDrawFreehandMode();

			expect(() => {
				freehandMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const freehandMode = new TerraDrawFreehandMode();

			expect(() => {
				freehandMode.register(MockModeConfig(freehandMode.mode));
				freehandMode.register(MockModeConfig(freehandMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const freehandMode = new TerraDrawFreehandMode();

			freehandMode.register(MockModeConfig(freehandMode.mode));
			freehandMode.start();

			expect(freehandMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const freehandMode = new TerraDrawFreehandMode();

			freehandMode.register(MockModeConfig(freehandMode.mode));
			freehandMode.start();
			freehandMode.stop();

			expect(freehandMode.state).toBe("stopped");
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const freehandMode = new TerraDrawFreehandMode();
			freehandMode.updateOptions({
				cursors: {
					start: "pointer",
					close: "pointer",
				},
			});
			const mockConfig = MockModeConfig(freehandMode.mode);
			freehandMode.register(mockConfig);
			freehandMode.start();
			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change key events", () => {
			const freehandMode = new TerraDrawFreehandMode();
			freehandMode.updateOptions({
				keyEvents: {
					cancel: "C",
					finish: "F",
				},
			});
			const mockConfig = MockModeConfig(freehandMode.mode);
			freehandMode.register(mockConfig);
			freehandMode.start();

			freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			let features = mockConfig.store.copyAll();
			expect(features.length).toBe(2);

			freehandMode.onKeyUp(MockKeyboardEvent({ key: "C" }));

			features = mockConfig.store.copyAll();
			expect(features.length).toBe(0);
		});

		it("can update styles", () => {
			const freehandMode = new TerraDrawFreehandMode();

			const mockConfig = MockModeConfig(freehandMode.mode);

			freehandMode.register(mockConfig);
			freehandMode.start();

			freehandMode.updateOptions({
				styles: {
					fillColor: "#ffffff",
				},
			});
			expect(freehandMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
		});
	});

	describe("onClick", () => {
		let freehandMode: TerraDrawFreehandMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			freehandMode = new TerraDrawFreehandMode();
			store = new GeoJSONStore();
		});

		it("throws an error if not registered", () => {
			expect(() => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			}).toThrow();
		});

		describe("registered", () => {
			beforeEach(() => {
				const mockConfig = MockModeConfig(freehandMode.mode);
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				store = mockConfig.store;
				freehandMode.register(mockConfig);
				freehandMode.start();
			});

			it("adds a polygon and closing point to store if registered", () => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledWith(
					[expect.any(String), expect.any(String)],
					"create",
					undefined,
				);

				const features = store.copyAll();
				expect(features.length).toBe(2);
				expect(features[0].geometry.type).toBe("Polygon");
				expect(features[1].geometry.type).toBe("Point");
				expect(features[1].properties.closingPoint).toBe(true);
			});

			it("finishes drawing polygon on second click", () => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				freehandMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 1 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				// No more closing coordinate so we drop to 1 feature
				features = store.copyAll();
				expect(features.length).toBe(1);

				expect(onChange).toHaveBeenCalledTimes(4);
				expect(onChange).toHaveBeenCalledWith(
					[expect.any(String), expect.any(String)],
					"create",
					undefined,
				);
				expect(onFinish).toHaveBeenCalledTimes(1);
			});
		});

		describe("registered with validate", () => {
			let valid = true;
			beforeEach(() => {
				freehandMode = new TerraDrawFreehandMode({
					validation: () => {
						return { valid };
					},
				});
				store = new GeoJSONStore();

				const mockConfig = MockModeConfig(freehandMode.mode);
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				store = mockConfig.store;
				freehandMode.register(mockConfig);
				freehandMode.start();
			});

			it("does not finish drawing polygon on second click because validate returns false", () => {
				valid = false;

				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				// Closing coordinate should still exist
				features = store.copyAll();
				expect(features.length).toBe(2);

				expect(onChange).toHaveBeenCalledTimes(2);
				expect(onFinish).not.toHaveBeenCalled();
			});

			it("does finish drawing polygon on second click because validate returns true", () => {
				valid = true;

				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				// Closing coordinate should be removed
				features = store.copyAll();
				expect(features.length).toBe(1);
				expect(features[0].geometry.type).toBe("Polygon");

				expect(onChange).toHaveBeenCalledTimes(3);
				expect(onFinish).toHaveBeenCalledTimes(1);
				expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
					action: "draw",
					mode: "freehand",
				});
			});
		});
	});

	describe("onMouseMove", () => {
		let freehandMode: TerraDrawFreehandMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			freehandMode = new TerraDrawFreehandMode();

			const mockConfig = MockModeConfig(freehandMode.mode);
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			freehandMode.register(mockConfig);
			freehandMode.start();
		});

		it("updates the freehand polygon when the mouse cursor has moved a minimum amount", () => {
			freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String), expect.any(String)],
				"create",
				undefined,
			);

			const feature = store.copyAll()[0];

			for (let i = 1; i < 6; i++) {
				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: i,
						lat: i,
					}),
				);
			}

			expect(onChange).toHaveBeenCalledTimes(6);

			const updatedFeature = store.copyAll()[0];

			expect(feature.id).toBe(updatedFeature.id);
			expect(feature.geometry.coordinates).not.toStrictEqual(
				updatedFeature.geometry.coordinates,
			);
		});

		it("does nothing if no first click", () => {
			freehandMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));

			expect(onChange).toHaveBeenCalledTimes(0);
		});

		describe("autoClose", () => {
			it("can close the polygon if autoClose is enabled and the cursor comes back to the starting point", () => {
				freehandMode = new TerraDrawFreehandMode({ autoClose: true });

				const mockConfig = MockModeConfig(freehandMode.mode);
				store = mockConfig.store;
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				freehandMode.register(mockConfig);
				freehandMode.start();

				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String), expect.any(String)],
					"create",
					undefined,
				);

				const feature = store.copyAll()[0];

				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: 0,
						lat: 0,
					}),
				);

				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: 1,
						lat: 0,
					}),
				);

				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: 1,
						lat: 1,
					}),
				);

				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: 0,
						lat: 0,
					}),
				);

				expect(onChange).toHaveBeenCalledTimes(4);

				expect(onFinish).toHaveBeenCalledTimes(1);

				const updatedFeature = store.copyAll()[0];

				expect(followsRightHandRule(updatedFeature.geometry as Polygon)).toBe(
					true,
				);

				expect(feature.id).toBe(updatedFeature.id);
				expect(feature.geometry.coordinates).not.toStrictEqual(
					updatedFeature.geometry.coordinates,
				);
			});

			it("prevents accidental clicks creating a new polygon", () => {
				freehandMode = new TerraDrawFreehandMode({ autoClose: true });

				const mockConfig = MockModeConfig(freehandMode.mode);
				store = mockConfig.store;
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;
				freehandMode.register(mockConfig);
				freehandMode.start();

				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String), expect.any(String)],
					"create",
					undefined,
				);

				const feature = store.copyAll()[0];

				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: 0,
						lat: 0,
					}),
				);

				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: 1,
						lat: 0,
					}),
				);

				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: 1,
						lat: 1,
					}),
				);

				freehandMode.onMouseMove(
					MockCursorEvent({
						lng: 0,
						lat: 0,
					}),
				);

				expect(onChange).toHaveBeenCalledTimes(4);

				expect(onFinish).toHaveBeenCalledTimes(1);

				freehandMode.onClick(
					MockCursorEvent({
						lng: 0,
						lat: 0,
					}),
				);

				expect(onChange).toHaveBeenCalledTimes(4);

				const updatedFeature = store.copyAll()[0];

				expect(feature.id).toBe(updatedFeature.id);
				expect(feature.geometry.coordinates).not.toStrictEqual(
					updatedFeature.geometry.coordinates,
				);
			});
		});
	});

	describe("onMouseMove - autoClose", () => {
		let freehandMode: TerraDrawFreehandMode;
		let store: TerraDrawGeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			freehandMode = new TerraDrawFreehandMode({ autoClose: true });

			const mockConfig = MockModeConfig(freehandMode.mode);
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			freehandMode.register(mockConfig);
			freehandMode.start();
		});

		it("can close the polygon if autoClose is enabled and the cursor comes back to the starting point", () => {
			freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String), expect.any(String)],
				"create",
				undefined,
			);

			const feature = store.copyAll()[0];

			freehandMode.onMouseMove(
				MockCursorEvent({
					lng: 0,
					lat: 0,
				}),
			);

			freehandMode.onMouseMove(
				MockCursorEvent({
					lng: 1,
					lat: 0,
				}),
			);

			freehandMode.onMouseMove(
				MockCursorEvent({
					lng: 1,
					lat: 1,
				}),
			);

			freehandMode.onMouseMove(
				MockCursorEvent({
					lng: 0,
					lat: 0,
				}),
			);

			expect(onChange).toHaveBeenCalledTimes(4);

			expect(onFinish).toHaveBeenCalledTimes(1);

			const updatedFeature = store.copyAll()[0];
			expect(followsRightHandRule(updatedFeature.geometry as Polygon)).toBe(
				true,
			);

			expect(feature.id).toBe(updatedFeature.id);
			expect(feature.geometry.coordinates).not.toStrictEqual(
				updatedFeature.geometry.coordinates,
			);
		});
	});

	describe("cleanUp", () => {
		let freehandMode: TerraDrawFreehandMode;
		let onChange: jest.Mock;

		beforeEach(() => {
			freehandMode = new TerraDrawFreehandMode();
			const mockConfig = MockModeConfig(freehandMode.mode);
			onChange = mockConfig.onChange;
			freehandMode.register(mockConfig);
			freehandMode.start();
		});

		it("does not delete if no freehand has been created", () => {
			freehandMode.cleanUp();
			expect(onChange).toHaveBeenCalledTimes(0);
		});

		it("does delete if a freehand has been created", () => {
			freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			freehandMode.cleanUp();

			expect(onChange).toHaveBeenCalledTimes(3);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"delete",
				undefined,
			);
		});
	});

	describe("onKeyUp", () => {
		let store: TerraDrawGeoJSONStore;
		let freehandMode: TerraDrawFreehandMode;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			jest.resetAllMocks();

			freehandMode = new TerraDrawFreehandMode();

			const mockConfig = MockModeConfig(freehandMode.mode);
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			freehandMode.register(mockConfig);
			freehandMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no freehand is present", () => {
				freehandMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));
			});

			it("deletes the freehand when currently editing", () => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				features = store.copyAll();
				expect(features.length).toBe(0);
			});

			it("does not delete the freehand when currently editing if cancel is null", () => {
				freehandMode = new TerraDrawFreehandMode({ keyEvents: null });

				const mockConfig = MockModeConfig(freehandMode.mode);
				store = mockConfig.store;
				onChange = mockConfig.onChange;
				freehandMode.register(mockConfig);
				freehandMode.start();

				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				features = store.copyAll();
				expect(features.length).toBe(2);
			});
		});

		describe("finish", () => {
			it("finishes drawing polygon on finish key press", () => {
				freehandMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
				freehandMode.onMouseMove(MockCursorEvent({ lng: 0, lat: 1 }));

				let features = store.copyAll();
				expect(features.length).toBe(2);

				freehandMode.onKeyUp(MockKeyboardEvent({ key: "Enter" }));

				features = store.copyAll();

				expect(features.length).toBe(1);

				expect(onChange).toHaveBeenCalledTimes(4);
				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String), expect.any(String)],
					"create",
					undefined,
				);
				expect(onChange).toHaveBeenNthCalledWith(
					2,
					[expect.any(String)],
					"update",
					undefined,
				);
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
					undefined,
				);
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String)],
					"delete",
					undefined,
				);
				expect(onFinish).toHaveBeenCalledTimes(1);
				expect(onFinish).toHaveBeenNthCalledWith(1, expect.any(String), {
					action: "draw",
					mode: "freehand",
				});
			});
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const freehandMode = new TerraDrawFreehandMode();

			expect(() => {
				freehandMode.onDrag();
			}).not.toThrow();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const freehandMode = new TerraDrawFreehandMode();

			expect(() => {
				freehandMode.onDragStart();
			}).not.toThrow();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const freehandMode = new TerraDrawFreehandMode();

			expect(() => {
				freehandMode.onDragEnd();
			}).not.toThrow();
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const freehandMode = new TerraDrawFreehandMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});

			expect(
				freehandMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "freehand" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct styles for polygon using function", () => {
			const freehandMode = new TerraDrawFreehandMode({
				styles: {
					fillColor: () => "#ffffff",
					outlineColor: () => "#ffffff",
					outlineWidth: () => 2,
					fillOpacity: () => 0.5,
				},
			});

			freehandMode.register(MockModeConfig(freehandMode.mode));

			expect(
				freehandMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "freehand" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct styles for point", () => {
			const freehandMode = new TerraDrawFreehandMode({
				styles: {
					closingPointColor: "#ffffff",
					closingPointOutlineWidth: 2,
					closingPointWidth: 1,
					closingPointOutlineColor: "#111111",
				},
			});

			expect(
				freehandMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "freehand" },
				}),
			).toMatchObject({
				pointColor: "#ffffff",
				pointOutlineWidth: 2,
				pointWidth: 1,
				pointOutlineColor: "#111111",
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid freehand feature", () => {
			const freehandMode = new TerraDrawFreehandMode({
				styles: {
					closingPointColor: "#ffffff",
					closingPointOutlineWidth: 2,
					closingPointWidth: 1,
					closingPointOutlineColor: "#111111",
				},
			});
			freehandMode.register(MockModeConfig("freehand"));

			expect(
				freehandMode.validateFeature({
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
			).toEqual({
				valid: false,
				reason: "Feature mode property does not match the mode being added to",
			});
		});

		it("returns true for valid freehand feature", () => {
			const freehandMode = new TerraDrawFreehandMode({
				styles: {
					closingPointColor: "#ffffff",
					closingPointOutlineWidth: 2,
					closingPointWidth: 1,
					closingPointOutlineColor: "#111111",
				},
			});
			freehandMode.register(MockModeConfig("freehand"));

			expect(
				freehandMode.validateFeature({
					id: "ddfa9367-3151-48b1-a7b2-c8ed3c0222db",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.120849609, 52.348763182],
								[-0.120849609, 52.348763182],
								[-0.120849609, 52.348763182],
								[-0.197753906, 52.207606673],
								[-0.197753906, 52.072753654],
								[-0.043945312, 51.951036645],
								[0.186767578, 51.957807389],
								[0.362548828, 52.066000283],
								[0.373535156, 52.214338608],
								[0.208740234, 52.308478624],
								[-0.021972656, 52.315195264],
								[-0.120849609, 52.348763182],
							],
						],
					},
					properties: {
						mode: "freehand",
						createdAt: 1685569592712,
						updatedAt: 1685569593386,
					},
				}),
			).toEqual({
				valid: true,
			});
		});

		it("returns false for valid freehand feature but the validate function returns false", () => {
			const freehandMode = new TerraDrawFreehandMode({
				validation: () => {
					return { valid: false };
				},
				styles: {
					closingPointColor: "#ffffff",
					closingPointOutlineWidth: 2,
					closingPointWidth: 1,
					closingPointOutlineColor: "#111111",
				},
			});
			freehandMode.register(MockModeConfig("freehand"));

			expect(
				freehandMode.validateFeature({
					id: "ddfa9367-3151-48b1-a7b2-c8ed3c0222db",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.120849609, 52.348763182],
								[-0.120849609, 52.348763182],
								[-0.120849609, 52.348763182],
								[-0.197753906, 52.207606673],
								[-0.197753906, 52.072753654],
								[-0.043945312, 51.951036645],
								[0.186767578, 51.957807389],
								[0.362548828, 52.066000283],
								[0.373535156, 52.214338608],
								[0.208740234, 52.308478624],
								[-0.021972656, 52.315195264],
								[-0.120849609, 52.348763182],
							],
						],
					},
					properties: {
						mode: "freehand",
						createdAt: 1685569592712,
						updatedAt: 1685569593386,
					},
				}),
			).toEqual({
				valid: false,
			});
		});
	});
});
