import { MockModeConfig } from "../../test/mock-mode-config";
import { TerraDrawStaticMode } from "./static.mode";

describe("TerraDrawStaticMode", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const staticMode = new TerraDrawStaticMode();
			expect(staticMode.mode).toBe("static");
		});
	});

	describe("register", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.register(MockModeConfig(staticMode.mode));
			}).not.toThrow();
		});
	});

	describe("start", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.start();
			}).not.toThrow();
		});
	});

	describe("stop", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.stop();
			}).not.toThrow();
		});
	});

	describe("onClick", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onClick();
			}).not.toThrow();
		});
	});

	describe("onKeyUp", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onKeyUp();
			}).not.toThrow();
		});
	});

	describe("onKeyDown", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onKeyDown();
			}).not.toThrow();
		});
	});

	describe("onMouseMove", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onMouseMove();
			}).not.toThrow();
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onDrag();
			}).not.toThrow();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onDragStart();
			}).not.toThrow();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onDragEnd();
			}).not.toThrow();
		});
	});

	describe("styleFeature", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			const styling = staticMode.styleFeature();
			expect(styling).toBeDefined();
		});
	});

	describe("cleanUp", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.cleanUp();
			}).not.toThrow();
		});
	});
});
