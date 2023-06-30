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
	const stylingOptions = {
		styles: { ...getDefaultStyling(), pointColor: "#12121" as HexColor },
	};

	describe("constructor", () => {
		it("constructs with required parameter options", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);
			expect(renderMode.mode).toBe("render");
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);
			expect(renderMode.state).toBe("unregistered");
			renderMode.register(getMockModeConfig(renderMode.mode));
			expect(renderMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.state = "started";
			}).toThrowError();
		});

		it("stopping before not registering throws error", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.stop();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.start();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.start();
			}).toThrowError();
		});

		it("registering multiple times throws an error", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.register(getMockModeConfig(renderMode.mode));
				renderMode.register(getMockModeConfig(renderMode.mode));
			}).toThrowError();
		});

		it("can start correctly", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			renderMode.register(getMockModeConfig(renderMode.mode));
			renderMode.start();

			expect(renderMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			renderMode.register(getMockModeConfig(renderMode.mode));
			renderMode.start();
			renderMode.stop();

			expect(renderMode.state).toBe("stopped");
		});
	});

	describe("registerBehaviors", () => {
		it("changes the mode name when registerBehaviors called", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);
			const config = mockBehaviorConfig("test");
			renderMode.registerBehaviors(config);
			expect(renderMode.mode).toBe("test");
		});
	});

	describe("onClick", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.onClick();
			}).not.toThrowError();
		});
	});

	describe("onKeyUp", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.onKeyUp();
			}).not.toThrowError();
		});
	});

	describe("onKeyDown", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);
			expect(() => {
				renderMode.onKeyDown();
			}).not.toThrowError();
		});
	});

	describe("onMouseMove", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.onMouseMove();
			}).not.toThrowError();
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.onDrag();
			}).not.toThrowError();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.onDragStart();
			}).not.toThrowError();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(() => {
				renderMode.onDragEnd();
			}).not.toThrowError();
		});
	});

	describe("styling", () => {
		it("gets styling correctly", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(renderMode.styleFeature().pointColor).toEqual("#12121");
		});
	});

	describe("validateFeature", () => {
		it("validates points", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(renderMode.validateFeature(createMockPoint())).toBe(true);
		});

		it("validates linestrings", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(renderMode.validateFeature(createMockLineString())).toBe(true);
		});

		it("validates polygons", () => {
			const renderMode = new TerraDrawRenderMode(stylingOptions);

			expect(renderMode.validateFeature(createMockPolygonSquare())).toBe(true);
		});
	});
});
