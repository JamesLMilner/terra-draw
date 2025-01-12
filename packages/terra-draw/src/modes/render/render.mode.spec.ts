import { HexColor } from "../../common";
import { MockBehaviorConfig } from "../../test/mock-behavior-config";
import { MockModeConfig } from "../../test/mock-mode-config";
import {
	MockLineString,
	MockPoint,
	MockPolygonSquare,
} from "../../test/mock-features";
import { getDefaultStyling } from "../../util/styling";
import { TerraDrawRenderMode } from "./render.mode";

describe("TerraDrawRenderMode", () => {
	const options = {
		modeName: "arbitary",
		styles: { ...getDefaultStyling(), pointColor: "#12121" as HexColor },
	};

	describe("constructor", () => {
		it("constructs with required parameter options", () => {
			const renderMode = new TerraDrawRenderMode(options);
			expect(renderMode.mode).toBe("arbitary");
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const renderMode = new TerraDrawRenderMode(options);
			expect(renderMode.state).toBe("unregistered");
			renderMode.register(MockModeConfig(renderMode.mode));
			expect(renderMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.register(MockModeConfig(renderMode.mode));
				renderMode.register(MockModeConfig(renderMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const renderMode = new TerraDrawRenderMode(options);

			renderMode.register(MockModeConfig(renderMode.mode));
			renderMode.start();

			expect(renderMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const renderMode = new TerraDrawRenderMode(options);

			renderMode.register(MockModeConfig(renderMode.mode));
			renderMode.start();
			renderMode.stop();

			expect(renderMode.state).toBe("stopped");
		});
	});

	describe("registerBehaviors", () => {
		it("changes the mode name when registerBehaviors called", () => {
			const renderMode = new TerraDrawRenderMode(options);
			const config = MockBehaviorConfig("test");
			renderMode.registerBehaviors(config);
			expect(renderMode.mode).toBe("test");
		});
	});

	describe("onClick", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onClick();
			}).not.toThrow();
		});
	});

	describe("onKeyUp", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onKeyUp();
			}).not.toThrow();
		});
	});

	describe("onKeyDown", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);
			expect(() => {
				renderMode.onKeyDown();
			}).not.toThrow();
		});
	});

	describe("onMouseMove", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onMouseMove();
			}).not.toThrow();
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onDrag();
			}).not.toThrow();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onDragStart();
			}).not.toThrow();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onDragEnd();
			}).not.toThrow();
		});
	});

	describe("styling", () => {
		it("gets styling correctly", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(
				renderMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "polygon" },
				}).pointColor,
			).toEqual("#12121");
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const renderMode = new TerraDrawRenderMode({
				modeName: "arbitary",
				styles: {
					polygonFillColor: "#ffffff",
					polygonFillOpacity: 0.2,
					polygonOutlineColor: "#111111",
					polygonOutlineWidth: 3,
				},
			});

			expect(
				renderMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "render" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 3,
				polygonFillOpacity: 0.2,
			});
		});

		it("returns the correct styles for polygon using function", () => {
			const renderMode = new TerraDrawRenderMode({
				modeName: "arbitary",
				styles: {
					polygonFillColor: () => "#ffffff",
					polygonFillOpacity: () => 0.2,
					polygonOutlineColor: () => "#111111",
					polygonOutlineWidth: () => 3,
				},
			});

			expect(
				renderMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "render" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 3,
				polygonFillOpacity: 0.2,
			});
		});
	});

	describe("validateFeature", () => {
		it("validates points", () => {
			const renderMode = new TerraDrawRenderMode(options);
			renderMode.register(MockModeConfig("arbitary"));

			expect(renderMode.validateFeature(MockPoint())).toEqual({ valid: true });
		});

		it("validates linestrings", () => {
			const renderMode = new TerraDrawRenderMode(options);
			renderMode.register(MockModeConfig("arbitary"));

			expect(renderMode.validateFeature(MockLineString())).toEqual({
				valid: true,
			});
		});

		it("validates polygons", () => {
			const renderMode = new TerraDrawRenderMode(options);
			renderMode.register(MockModeConfig("arbitary"));

			expect(renderMode.validateFeature(MockPolygonSquare())).toEqual({
				valid: true,
			});
		});
	});
});
