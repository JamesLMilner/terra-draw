import { Point } from "geojson";
import { MockModeConfig } from "../../test/mock-mode-config";
import { TerraDrawMarkerMode } from "./marker.mode";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { DefaultPointerEvents } from "../base.mode";
import { MockPoint } from "../../test/mock-features";
import { GeoJSONStoreFeatures, JSONObject } from "../../store/store";
import { COMMON_PROPERTIES } from "../../common";

describe("TerraDrawMarkerMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const markerMode = new TerraDrawMarkerMode();
			expect(markerMode.mode).toBe("marker");
			expect(markerMode.styles).toStrictEqual({});
			expect(markerMode.state).toBe("unregistered");
		});

		it("constructs with options", () => {
			const markerMode = new TerraDrawMarkerMode({
				cursors: {
					create: "crosshair",
					dragStart: "grabbing",
					dragEnd: "crosshair",
				},
				styles: {
					markerHeight: 32,
					markerWidth: 32,
					markerUrl: "https://example.com/marker.png",
				},
			});
			expect(markerMode.styles).toStrictEqual({
				markerHeight: 32,
				markerWidth: 32,
				markerUrl: "https://example.com/marker.png",
			});
		});

		it("constructs with custom mode name", () => {
			const markerMode = new TerraDrawMarkerMode({
				modeName: "custom-marker",
			});
			expect(markerMode.mode).toBe("custom-marker");
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const markerMode = new TerraDrawMarkerMode();
			expect(markerMode.state).toBe("unregistered");
			markerMode.register(MockModeConfig(markerMode.mode));
			expect(markerMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const markerMode = new TerraDrawMarkerMode();

			expect(() => {
				markerMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const markerMode = new TerraDrawMarkerMode();

			expect(() => {
				markerMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const markerMode = new TerraDrawMarkerMode();

			expect(() => {
				markerMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const markerMode = new TerraDrawMarkerMode();

			expect(() => {
				markerMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const markerMode = new TerraDrawMarkerMode();

			expect(() => {
				markerMode.register(MockModeConfig(markerMode.mode));
				markerMode.register(MockModeConfig(markerMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const markerMode = new TerraDrawMarkerMode();

			markerMode.register(MockModeConfig(markerMode.mode));
			markerMode.start();

			expect(markerMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const markerMode = new TerraDrawMarkerMode();

			markerMode.register(MockModeConfig(markerMode.mode));
			markerMode.start();
			markerMode.stop();

			expect(markerMode.state).toBe("stopped");
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const markerMode = new TerraDrawMarkerMode();
			markerMode.updateOptions({
				cursors: {
					create: "pointer",
				},
			});
			const mockConfig = MockModeConfig(markerMode.mode);
			markerMode.register(mockConfig);
			markerMode.start();
			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change editable", () => {
			const markerMode = new TerraDrawMarkerMode();
			markerMode.updateOptions({ editable: true });

			const mockConfig = MockModeConfig(markerMode.mode);
			markerMode.register(mockConfig);
			markerMode.start();

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			markerMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());
			markerMode.onDrag(MockCursorEvent({ lng: 0, lat: 1 }), jest.fn());
			markerMode.onDragEnd(MockCursorEvent({ lng: 0, lat: 1 }), jest.fn());

			expect(mockConfig.onChange).toHaveBeenCalledTimes(4);
			expect(mockConfig.store.copyAll()[0].geometry.coordinates).toEqual([
				0, 1,
			]);
		});

		it("does not update mode name if passed", () => {
			const markerMode = new TerraDrawMarkerMode();
			markerMode.updateOptions({ modeName: "custom-marker" } as any);

			expect(markerMode.mode).toBe("marker");
		});
	});

	describe("onClick", () => {
		it("throws an error if not registered", () => {
			const markerMode = new TerraDrawMarkerMode();
			const mockMouseEvent = MockCursorEvent({ lng: 0, lat: 0 });
			expect(() => {
				markerMode.onClick(mockMouseEvent);
			}).toThrow();
		});

		it("creates a point if registered", () => {
			const markerMode = new TerraDrawMarkerMode();

			const mockConfig = MockModeConfig(markerMode.mode);

			markerMode.register(mockConfig);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"create",
				undefined,
			);
			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);

			expect(mockConfig.store.copyAll()[0]).toEqual({
				id: expect.any(String),
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [0, 0],
				},
				properties: {
					mode: markerMode.mode,
					[COMMON_PROPERTIES.MARKER]: true,
					createdAt: expect.any(Number),
					updatedAt: expect.any(Number),
				},
			});
		});

		it("right click can delete a point if editable is true", () => {
			const markerMode = new TerraDrawMarkerMode({ editable: true });

			const mockConfig = MockModeConfig(markerMode.mode);

			markerMode.register(mockConfig);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"create",
				undefined,
			);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0, button: "right" }));

			expect(mockConfig.onChange).toHaveBeenCalledTimes(2);
			expect(mockConfig.onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"delete",
				undefined,
			);
		});

		describe("with leftClick pointer event set to false", () => {
			it("should not allow click", () => {
				const markerMode = new TerraDrawMarkerMode({
					pointerEvents: {
						...DefaultPointerEvents,
						leftClick: false,
					},
				});
				const mockConfig = MockModeConfig(markerMode.mode);

				markerMode.register(mockConfig);
				markerMode.start();

				markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				markerMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				let features = mockConfig.store.copyAll();
				expect(features.length).toBe(0);
			});
		});

		describe("validate", () => {
			it("does not create the point if validation returns false", () => {
				const markerMode = new TerraDrawMarkerMode({
					validation: (feature) => {
						return { valid: (feature.geometry as Point).coordinates[0] > 45 };
					},
				});

				const mockConfig = MockModeConfig(markerMode.mode);

				markerMode.register(mockConfig);

				markerMode.onClick(MockCursorEvent({ lng: 30, lat: 0 }));

				expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
				expect(mockConfig.onChange).not.toHaveBeenCalledWith(
					[expect.any(String)],
					"create",
				);
			});

			it("does create the point if validation returns true", () => {
				const markerMode = new TerraDrawMarkerMode({
					validation: (feature) => {
						return { valid: (feature.geometry as Point).coordinates[0] > 45 };
					},
				});

				const mockConfig = MockModeConfig(markerMode.mode);

				markerMode.register(mockConfig);

				markerMode.onClick(MockCursorEvent({ lng: 50, lat: 0 }));

				expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
				expect(mockConfig.onChange).toHaveBeenCalledWith(
					[expect.any(String)],
					"create",
					undefined,
				);
			});
		});
	});

	describe("onKeyUp", () => {
		it("does nothing", () => {
			const markerMode = new TerraDrawMarkerMode();

			expect(() => {
				markerMode.onKeyUp();
			}).not.toThrow();
		});
	});

	describe("onMouseMove", () => {
		it("does nothing", () => {
			const markerMode = new TerraDrawMarkerMode();

			expect(() => {
				markerMode.onMouseMove();
			}).not.toThrow();
		});
	});

	describe("cleanUp", () => {
		it("does not throw", () => {
			const markerMode = new TerraDrawMarkerMode();

			expect(() => {
				markerMode.cleanUp();
			}).not.toThrow();
		});
	});

	describe("onDragStart", () => {
		it("does not set cursor on drag starting if editable false", () => {
			const markerMode = new TerraDrawMarkerMode({
				editable: false,
			});

			const mockConfig = MockModeConfig("marker");

			markerMode.register(mockConfig);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			markerMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(mockConfig.setCursor).toHaveBeenCalledTimes(0);
			expect(setMapDraggability).toHaveBeenCalledTimes(0);
		});

		it("sets the cursor on drag starting when editable true", () => {
			const markerMode = new TerraDrawMarkerMode({
				editable: true,
			});

			const mockConfig = MockModeConfig("marker");

			// Trigger the codepath which ignores none point geometries
			mockConfig.store.create([
				{
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[1, 0],
								[1, 1],
								[0, 1],
								[0, 0],
							],
						],
					},
					properties: { mode: "polygon" },
				},
			]);

			mockConfig.store.create([
				{
					geometry: {
						type: "Point",
						coordinates: [0.1, 0.1],
					},
					properties: { mode: "marker" },
				},
			]);

			mockConfig.store.create([
				{
					geometry: {
						type: "Point",
						coordinates: [0.2, 0.2],
					},
					properties: { mode: "marker" },
				},
			]);

			markerMode.register(mockConfig);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			markerMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(mockConfig.setCursor).toHaveBeenCalledTimes(1);
			expect(setMapDraggability).toHaveBeenCalledWith(false);
		});
	});

	describe("onDrag", () => {
		it("does nothing if nothing currently edited when editable true", () => {
			const markerMode = new TerraDrawMarkerMode({
				editable: true,
			});
			const mockConfig = MockModeConfig("marker");

			markerMode.register(mockConfig);

			const setMapDraggability = jest.fn();
			markerMode.onDrag(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("updates the point geometry on drag when editable true", () => {
			const markerMode = new TerraDrawMarkerMode({
				editable: true,
			});

			const mockConfig = MockModeConfig("marker");

			markerMode.register(mockConfig);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			markerMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			markerMode.onDrag(
				MockCursorEvent({ lng: 0, lat: 1 }),
				setMapDraggability,
			);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(3);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"update",
				undefined,
			);

			// On finished called from onClick and is then only called after onDragEnd
			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);
		});

		it("handles the falsy validation when editable true", () => {
			let validations = 0;
			const markerMode = new TerraDrawMarkerMode({
				editable: true,
				validation: () => {
					validations++;
					return {
						valid: validations === 1,
					};
				},
			});

			const mockConfig = MockModeConfig("marker");

			markerMode.register(mockConfig);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			markerMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			markerMode.onDrag(
				MockCursorEvent({ lng: 0, lat: 1 }),
				setMapDraggability,
			);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);
		});

		it("handles the truthy validation when editable true", () => {
			const markerMode = new TerraDrawMarkerMode({
				editable: true,
				validation: () => ({ valid: true }),
			});

			const mockConfig = MockModeConfig("marker");

			markerMode.register(mockConfig);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			markerMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			markerMode.onDrag(
				MockCursorEvent({ lng: 0, lat: 1 }),
				setMapDraggability,
			);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(3);
			// On finished called from onClick and is then only called after onDragEnd
			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);
		});
	});

	describe("onDragEnd", () => {
		it("doesn't set the cursor on drag ending if nothing currently edited", () => {
			const markerMode = new TerraDrawMarkerMode({
				editable: true,
			});

			const mockConfig = MockModeConfig("marker");

			markerMode.register(mockConfig);

			const setMapDraggability = jest.fn();
			markerMode.onDragEnd(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(mockConfig.setCursor).toHaveBeenCalledTimes(0);
			expect(setMapDraggability).toHaveBeenCalledTimes(0);
		});

		it("sets the cursor on drag ending", () => {
			const markerMode = new TerraDrawMarkerMode({
				editable: true,
			});

			const mockConfig = MockModeConfig("marker");

			markerMode.register(mockConfig);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			markerMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			markerMode.onDrag(
				MockCursorEvent({ lng: 1, lat: 0 }),
				setMapDraggability,
			);

			markerMode.onDragEnd(
				MockCursorEvent({ lng: 1, lat: 0 }),
				setMapDraggability,
			);

			expect(mockConfig.setCursor).toHaveBeenCalledTimes(2);
			expect(mockConfig.setCursor).toHaveBeenNthCalledWith(1, "grabbing");
			expect(mockConfig.setCursor).toHaveBeenNthCalledWith(2, "crosshair");
			expect(setMapDraggability).toHaveBeenNthCalledWith(1, false);
			expect(setMapDraggability).toHaveBeenNthCalledWith(2, true);
		});
	});
	describe("styling", () => {
		it("gets", () => {
			const markerMode = new TerraDrawMarkerMode();
			markerMode.register(MockModeConfig(markerMode.mode));
			expect(markerMode.styles).toStrictEqual({});
		});

		it("set fails if non valid styling", () => {
			const markerMode = new TerraDrawMarkerMode();
			markerMode.register(MockModeConfig(markerMode.mode));

			expect(() => {
				(markerMode.styles as unknown) = "test";
			}).toThrow();

			expect(markerMode.styles).toStrictEqual({});
		});

		it("sets", () => {
			const markerMode = new TerraDrawMarkerMode();
			markerMode.register(MockModeConfig(markerMode.mode));

			markerMode.styles = {
				markerHeight: 30,
			};

			expect(markerMode.styles).toStrictEqual({
				markerHeight: 30,
			});
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for point", () => {
			const markerMode = new TerraDrawMarkerMode({
				styles: {
					markerHeight: 32,
					markerWidth: 32,
					markerUrl: "test.png",
				},
			});

			expect(
				markerMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [0, 0] },
					properties: { mode: "marker" },
				}),
			).toMatchObject({
				markerHeight: 32,
				markerWidth: 32,
				markerUrl: "test.png",
			});
		});

		it("returns the correct styles for point using functions", () => {
			const markerMode = new TerraDrawMarkerMode({
				styles: {
					markerHeight: () => 32,
					markerWidth: () => 32,
					markerUrl: () => "test.png",
				},
			});

			expect(
				markerMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "marker" },
				}),
			).toMatchObject({
				markerHeight: 32,
				markerWidth: 32,
				markerUrl: "test.png",
			});
		});

		it("returns the correct styles for edited point", () => {
			const markerMode = new TerraDrawMarkerMode({
				editable: true,
				styles: {
					markerHeight: 32,
					markerWidth: 32,
					markerUrl: "test.png",
				},
			});

			const mockConfig = MockModeConfig("marker");

			markerMode.register(mockConfig);

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			markerMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());

			const id = mockConfig.onChange.mock.calls[0][0][0];

			expect(
				markerMode.styleFeature({
					type: "Feature",
					id,
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "marker", edited: true },
				}),
			).toMatchObject({
				markerHeight: 32,
				markerWidth: 32,
				markerUrl: "test.png",
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid point feature", () => {
			const markerMode = new TerraDrawMarkerMode({
				styles: {
					markerHeight: 32,
					markerWidth: 32,
					markerUrl: "test.png",
				},
			});

			markerMode.register(MockModeConfig("marker"));

			expect(
				markerMode.validateFeature({
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
			).toEqual({
				reason: "Feature mode property does not match the mode being added to",
				valid: false,
			});
		});

		it("returns true for valid point feature", () => {
			const markerMode = new TerraDrawMarkerMode({
				styles: {
					markerHeight: 32,
					markerWidth: 32,
					markerUrl: "test.png",
				},
			});

			markerMode.register(MockModeConfig("marker"));

			expect(
				markerMode.validateFeature({
					id: "ed030248-d7ee-45a2-b8e8-37ad2f622509",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-2.329101563, 51.392350875],
					},
					properties: {
						mode: "marker",
						createdAt: 1685654949450,
						updatedAt: 1685654950609,
					},
				}),
			).toEqual({
				valid: true,
			});
		});

		it("returns false for valid point feature but validate function returns false", () => {
			const markerMode = new TerraDrawMarkerMode({
				validation: () => ({ valid: false }),
				styles: {
					markerHeight: 32,
					markerWidth: 32,
					markerUrl: "test.png",
				},
			});

			markerMode.register(MockModeConfig("marker"));

			expect(
				markerMode.validateFeature({
					id: "ed030248-d7ee-45a2-b8e8-37ad2f622509",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-2.329101563, 51.392350875],
					},
					properties: {
						mode: "marker",
						createdAt: 1685654949450,
						updatedAt: 1685654950609,
					},
				}),
			).toEqual({
				valid: false,
			});
		});
	});

	describe("afterFeatureUpdated", () => {
		it("does nothing if the updated feature is not currently being dragged", () => {
			const markerMode = new TerraDrawMarkerMode();

			const mockConfig = MockModeConfig(markerMode.mode);

			markerMode.register(mockConfig);
			markerMode.start();

			// Create an initial square to snap to
			const mockPoint = MockPoint();
			const [featureId] = mockConfig.store.create([
				{
					geometry: mockPoint.geometry,
					properties: mockPoint.properties as JSONObject,
				},
			]);

			// Set the onChange count to 0
			mockConfig.onChange.mockClear();

			expect(mockConfig.store.has(featureId)).toBe(true);

			mockConfig.setCursor.mockClear();

			markerMode.afterFeatureUpdated({
				...(mockPoint as GeoJSONStoreFeatures),
				id: featureId,
			});

			expect(mockConfig.setCursor).toHaveBeenCalledTimes(0);
			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("resets the editable state if feature was being dragged", () => {
			const markerMode = new TerraDrawMarkerMode();
			markerMode.updateOptions({ editable: true });

			const mockConfig = MockModeConfig(markerMode.mode);
			markerMode.register(mockConfig);
			markerMode.start();

			markerMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			markerMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());

			const point = mockConfig.store.copyAll()[0];

			mockConfig.setCursor.mockClear();

			markerMode.afterFeatureUpdated({
				...point,
				geometry: { type: "Point", coordinates: [2, 2] },
			});

			// We gp back to the create cursor when the editing (dragging) is interrupted by afterFeatureUpdated
			expect(mockConfig.setCursor).toHaveBeenCalledTimes(1);
		});
	});
});
