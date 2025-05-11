import { Point } from "geojson";
import { MockModeConfig } from "../../test/mock-mode-config";
import { TerraDrawPointMode } from "./point.mode";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { DefaultPointerEvents } from "../base.mode";

describe("TerraDrawPointMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const pointMode = new TerraDrawPointMode();
			expect(pointMode.mode).toBe("point");
			expect(pointMode.styles).toStrictEqual({});
			expect(pointMode.state).toBe("unregistered");
		});

		it("constructs with options", () => {
			const pointMode = new TerraDrawPointMode({
				cursors: {
					create: "crosshair",
					dragStart: "grabbing",
					dragEnd: "crosshair",
				},
				styles: { pointOutlineColor: "#ffffff" },
			});
			expect(pointMode.styles).toStrictEqual({
				pointOutlineColor: "#ffffff",
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const pointMode = new TerraDrawPointMode();
			expect(pointMode.state).toBe("unregistered");
			pointMode.register(MockModeConfig(pointMode.mode));
			expect(pointMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.register(MockModeConfig(pointMode.mode));
				pointMode.register(MockModeConfig(pointMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const pointMode = new TerraDrawPointMode();

			pointMode.register(MockModeConfig(pointMode.mode));
			pointMode.start();

			expect(pointMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const pointMode = new TerraDrawPointMode();

			pointMode.register(MockModeConfig(pointMode.mode));
			pointMode.start();
			pointMode.stop();

			expect(pointMode.state).toBe("stopped");
		});
	});

	describe("updateOptions", () => {
		it("can change cursors", () => {
			const pointMode = new TerraDrawPointMode();
			pointMode.updateOptions({
				cursors: {
					create: "pointer",
				},
			});
			const mockConfig = MockModeConfig(pointMode.mode);
			pointMode.register(mockConfig);
			pointMode.start();
			expect(mockConfig.setCursor).toHaveBeenCalledWith("pointer");
		});

		it("can change editable", () => {
			const pointMode = new TerraDrawPointMode();
			pointMode.updateOptions({ editable: true });

			const mockConfig = MockModeConfig(pointMode.mode);
			pointMode.register(mockConfig);
			pointMode.start();

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			pointMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());
			pointMode.onDrag(MockCursorEvent({ lng: 0, lat: 1 }), jest.fn());
			pointMode.onDragEnd(MockCursorEvent({ lng: 0, lat: 1 }), jest.fn());

			expect(mockConfig.onChange).toHaveBeenCalledTimes(4);
			expect(mockConfig.store.copyAll()[0].geometry.coordinates).toEqual([
				0, 1,
			]);
		});
	});

	describe("onClick", () => {
		it("throws an error if not registered", () => {
			const pointMode = new TerraDrawPointMode();
			const mockMouseEvent = MockCursorEvent({ lng: 0, lat: 0 });
			expect(() => {
				pointMode.onClick(mockMouseEvent);
			}).toThrow();
		});

		it("creates a point if registered", () => {
			const pointMode = new TerraDrawPointMode();

			const mockConfig = MockModeConfig(pointMode.mode);

			pointMode.register(mockConfig);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"create",
				undefined,
			);
		});

		it("right click can delete a point if editable is true", () => {
			const pointMode = new TerraDrawPointMode({ editable: true });

			const mockConfig = MockModeConfig(pointMode.mode);

			pointMode.register(mockConfig);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"create",
				undefined,
			);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0, button: "right" }));

			expect(mockConfig.onChange).toHaveBeenCalledTimes(2);
			expect(mockConfig.onChange).toHaveBeenCalledWith(
				[expect.any(String)],
				"delete",
				undefined,
			);
		});

		describe("with leftClick pointer event set to false", () => {
			it("should not allow click", () => {
				const pointMode = new TerraDrawPointMode({
					pointerEvents: {
						...DefaultPointerEvents,
						leftClick: false,
					},
				});
				const mockConfig = MockModeConfig(pointMode.mode);

				pointMode.register(mockConfig);
				pointMode.start();

				pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				pointMode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));

				let features = mockConfig.store.copyAll();
				expect(features.length).toBe(0);
			});
		});

		describe("validate", () => {
			it("does not create the point if validation returns false", () => {
				const pointMode = new TerraDrawPointMode({
					validation: (feature) => {
						return { valid: (feature.geometry as Point).coordinates[0] > 45 };
					},
				});

				const mockConfig = MockModeConfig(pointMode.mode);

				pointMode.register(mockConfig);

				pointMode.onClick(MockCursorEvent({ lng: 30, lat: 0 }));

				expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
				expect(mockConfig.onChange).not.toHaveBeenCalledWith(
					[expect.any(String)],
					"create",
				);
			});

			it("does create the point if validation returns true", () => {
				const pointMode = new TerraDrawPointMode({
					validation: (feature) => {
						return { valid: (feature.geometry as Point).coordinates[0] > 45 };
					},
				});

				const mockConfig = MockModeConfig(pointMode.mode);

				pointMode.register(mockConfig);

				pointMode.onClick(MockCursorEvent({ lng: 50, lat: 0 }));

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
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.onKeyUp();
			}).not.toThrow();
		});
	});

	describe("onMouseMove", () => {
		it("does nothing", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.onMouseMove();
			}).not.toThrow();
		});
	});

	describe("cleanUp", () => {
		it("does not throw", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.cleanUp();
			}).not.toThrow();
		});
	});

	describe("onDragStart", () => {
		it("does not set cursor on drag starting if editable false", () => {
			const pointMode = new TerraDrawPointMode({
				editable: false,
			});

			const mockConfig = MockModeConfig("point");

			pointMode.register(mockConfig);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			pointMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(mockConfig.setCursor).toHaveBeenCalledTimes(0);
			expect(setMapDraggability).toHaveBeenCalledTimes(0);
		});

		it("sets the cursor on drag starting when editable true", () => {
			const pointMode = new TerraDrawPointMode({
				editable: true,
			});

			const mockConfig = MockModeConfig("point");

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
					properties: { mode: "point" },
				},
			]);

			mockConfig.store.create([
				{
					geometry: {
						type: "Point",
						coordinates: [0.2, 0.2],
					},
					properties: { mode: "point" },
				},
			]);

			pointMode.register(mockConfig);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			pointMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(mockConfig.setCursor).toHaveBeenCalledTimes(1);
			expect(setMapDraggability).toHaveBeenCalledWith(false);
		});
	});

	describe("onDrag", () => {
		it("does nothing if nothing currently edited when editable true", () => {
			const pointMode = new TerraDrawPointMode({
				editable: true,
			});
			const mockConfig = MockModeConfig("point");

			pointMode.register(mockConfig);

			const setMapDraggability = jest.fn();
			pointMode.onDrag(MockCursorEvent({ lng: 0, lat: 0 }), setMapDraggability);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("updates the point geometry on drag when editable true", () => {
			const pointMode = new TerraDrawPointMode({
				editable: true,
			});

			const mockConfig = MockModeConfig("point");

			pointMode.register(mockConfig);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			pointMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			pointMode.onDrag(MockCursorEvent({ lng: 0, lat: 1 }), setMapDraggability);

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
			const pointMode = new TerraDrawPointMode({
				editable: true,
				validation: () => {
					validations++;
					return {
						valid: validations === 1,
					};
				},
			});

			const mockConfig = MockModeConfig("point");

			pointMode.register(mockConfig);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			pointMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			pointMode.onDrag(MockCursorEvent({ lng: 0, lat: 1 }), setMapDraggability);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);
		});

		it("handles the truthy validation when editable true", () => {
			const pointMode = new TerraDrawPointMode({
				editable: true,
				validation: () => ({ valid: true }),
			});

			const mockConfig = MockModeConfig("point");

			pointMode.register(mockConfig);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			pointMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			pointMode.onDrag(MockCursorEvent({ lng: 0, lat: 1 }), setMapDraggability);

			expect(mockConfig.onChange).toHaveBeenCalledTimes(3);
			// On finished called from onClick and is then only called after onDragEnd
			expect(mockConfig.onFinish).toHaveBeenCalledTimes(1);
		});
	});

	describe("onDragEnd", () => {
		it("doesn't set the cursor on drag ending if nothing currently edited", () => {
			const pointMode = new TerraDrawPointMode({
				editable: true,
			});

			const mockConfig = MockModeConfig("point");

			pointMode.register(mockConfig);

			const setMapDraggability = jest.fn();
			pointMode.onDragEnd(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(mockConfig.setCursor).toHaveBeenCalledTimes(0);
			expect(setMapDraggability).toHaveBeenCalledTimes(0);
		});

		it("sets the cursor on drag ending", () => {
			const pointMode = new TerraDrawPointMode({
				editable: true,
			});

			const mockConfig = MockModeConfig("point");

			pointMode.register(mockConfig);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const setMapDraggability = jest.fn();
			pointMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			pointMode.onDrag(MockCursorEvent({ lng: 1, lat: 0 }), setMapDraggability);

			pointMode.onDragEnd(
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
			const pointMode = new TerraDrawPointMode();
			pointMode.register(MockModeConfig(pointMode.mode));
			expect(pointMode.styles).toStrictEqual({});
		});

		it("set fails if non valid styling", () => {
			const pointMode = new TerraDrawPointMode();
			pointMode.register(MockModeConfig(pointMode.mode));

			expect(() => {
				(pointMode.styles as unknown) = "test";
			}).toThrow();

			expect(pointMode.styles).toStrictEqual({});
		});

		it("sets", () => {
			const pointMode = new TerraDrawPointMode();
			pointMode.register(MockModeConfig(pointMode.mode));

			pointMode.styles = {
				pointColor: "#ffffff",
			};

			expect(pointMode.styles).toStrictEqual({
				pointColor: "#ffffff",
			});
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for point", () => {
			const pointMode = new TerraDrawPointMode({
				styles: {
					pointColor: "#ffffff",
					pointWidth: 4,
					pointOutlineColor: "#111111",
					pointOutlineWidth: 2,
				},
			});

			expect(
				pointMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "point" },
				}),
			).toMatchObject({
				pointColor: "#ffffff",
				pointWidth: 4,
				pointOutlineColor: "#111111",
				pointOutlineWidth: 2,
			});
		});

		it("returns the correct styles for point using functions", () => {
			const pointMode = new TerraDrawPointMode({
				styles: {
					pointColor: () => "#ffffff",
					pointWidth: () => 4,
					pointOutlineColor: () => "#111111",
					pointOutlineWidth: () => 2,
				},
			});

			expect(
				pointMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "point" },
				}),
			).toMatchObject({
				pointColor: "#ffffff",
				pointWidth: 4,
				pointOutlineColor: "#111111",
				pointOutlineWidth: 2,
			});
		});

		it("returns the correct styles for edited point", () => {
			const pointMode = new TerraDrawPointMode({
				editable: true,
				styles: {
					editedPointColor: "#222222",
					editedPointWidth: 3,
					editedPointOutlineColor: "#555555",
					editedPointOutlineWidth: 3,
				},
			});

			const mockConfig = MockModeConfig("point");

			pointMode.register(mockConfig);

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			pointMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());

			const id = mockConfig.onChange.mock.calls[0][0][0];

			expect(
				pointMode.styleFeature({
					type: "Feature",
					id,
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "point", edited: true },
				}),
			).toMatchObject({
				pointColor: "#222222",
				pointWidth: 3,
				pointOutlineColor: "#555555",
				pointOutlineWidth: 3,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid point feature", () => {
			const pointMode = new TerraDrawPointMode({
				styles: {
					pointColor: "#ffffff",
				},
			});

			pointMode.register(MockModeConfig("point"));

			expect(
				pointMode.validateFeature({
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
			const pointMode = new TerraDrawPointMode({
				styles: {
					pointColor: "#ffffff",
				},
			});

			pointMode.register(MockModeConfig("point"));

			expect(
				pointMode.validateFeature({
					id: "ed030248-d7ee-45a2-b8e8-37ad2f622509",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-2.329101563, 51.392350875],
					},
					properties: {
						mode: "point",
						createdAt: 1685654949450,
						updatedAt: 1685654950609,
					},
				}),
			).toEqual({
				valid: true,
			});
		});

		it("returns false for valid point feature but validate function returns false", () => {
			const pointMode = new TerraDrawPointMode({
				validation: () => ({ valid: false }),
				styles: {
					pointColor: "#ffffff",
				},
			});

			pointMode.register(MockModeConfig("point"));

			expect(
				pointMode.validateFeature({
					id: "ed030248-d7ee-45a2-b8e8-37ad2f622509",
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [-2.329101563, 51.392350875],
					},
					properties: {
						mode: "point",
						createdAt: 1685654949450,
						updatedAt: 1685654950609,
					},
				}),
			).toEqual({
				valid: false,
			});
		});
	});
});
