import { HexColor } from "../../common";
import { mockBehaviorConfig } from "../../test/mock-behavior-config";
import { getMockModeConfig } from "../../test/mock-config";
import {
	createMockLineString,
	createMockPoint,
	createMockPolygonSquare,
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
			renderMode.register(getMockModeConfig(renderMode.mode));
			expect(renderMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.state = "started";
			}).toThrowError();
		});

		it("stopping before not registering throws error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.stop();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.start();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.start();
			}).toThrowError();
		});

		it("registering multiple times throws an error", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.register(getMockModeConfig(renderMode.mode));
				renderMode.register(getMockModeConfig(renderMode.mode));
			}).toThrowError();
		});

		it("can start correctly", () => {
			const renderMode = new TerraDrawRenderMode(options);

			renderMode.register(getMockModeConfig(renderMode.mode));
			renderMode.start();

			expect(renderMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const renderMode = new TerraDrawRenderMode(options);

			renderMode.register(getMockModeConfig(renderMode.mode));
			renderMode.start();
			renderMode.stop();

			expect(renderMode.state).toBe("stopped");
		});
	});

	describe("registerBehaviors", () => {
		it("changes the mode name when registerBehaviors called", () => {
			const renderMode = new TerraDrawRenderMode(options);
			const config = mockBehaviorConfig("test");
			renderMode.registerBehaviors(config);
			expect(renderMode.mode).toBe("test");
		});
	});

	describe("onClick", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onClick();
			}).not.toThrowError();
		});
	});

	describe("onKeyUp", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onKeyUp();
			}).not.toThrowError();
		});
	});

	describe("onKeyDown", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);
			expect(() => {
				renderMode.onKeyDown();
			}).not.toThrowError();
		});
	});

	describe("onMouseMove", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onMouseMove();
			}).not.toThrowError();
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onDrag();
			}).not.toThrowError();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onDragStart();
			}).not.toThrowError();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(options);

			expect(() => {
				renderMode.onDragEnd();
			}).not.toThrowError();
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
			renderMode.register(getMockModeConfig("arbitary"));

			expect(renderMode.validateFeature(createMockPoint())).toBe(true);
		});

		it("validates linestrings", () => {
			const renderMode = new TerraDrawRenderMode(options);
			renderMode.register(getMockModeConfig("arbitary"));

			expect(renderMode.validateFeature(createMockLineString())).toBe(true);
		});

		it("validates polygons", () => {
			const renderMode = new TerraDrawRenderMode(options);
			renderMode.register(getMockModeConfig("arbitary"));

			expect(renderMode.validateFeature(createMockPolygonSquare())).toBe(true);
		});
	});
});
