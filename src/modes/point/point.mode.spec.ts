import { Point } from "geojson";
import { MockModeConfig } from "../../test/mock-mode-config";
import { TerraDrawPointMode } from "./point.mode";
import { MockCursorEvent } from "../../test/mock-cursor-event";

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
			);
		});

		describe("validate", () => {
			it("does not create the point if validation returns false", () => {
				const pointMode = new TerraDrawPointMode({
					validation: (feature) => {
						return (feature.geometry as Point).coordinates[0] > 45;
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
						return (feature.geometry as Point).coordinates[0] > 45;
					},
				});

				const mockConfig = MockModeConfig(pointMode.mode);

				pointMode.register(mockConfig);

				pointMode.onClick(MockCursorEvent({ lng: 50, lat: 0 }));

				expect(mockConfig.onChange).toHaveBeenCalledTimes(1);
				expect(mockConfig.onChange).toHaveBeenCalledWith(
					[expect.any(String)],
					"create",
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
		it("does nothing", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.cleanUp();
			}).not.toThrow();
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.onDrag();
			}).not.toThrow();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.onDragStart();
			}).not.toThrow();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const pointMode = new TerraDrawPointMode();

			expect(() => {
				pointMode.onDragEnd();
			}).not.toThrow();
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
			).toBe(false);
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
			).toBe(true);
		});

		it("returns false for valid point feature but validate function returns false", () => {
			const pointMode = new TerraDrawPointMode({
				validation: () => false,
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
			).toBe(false);
		});
	});
});
