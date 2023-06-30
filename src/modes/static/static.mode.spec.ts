import { getMockModeConfig } from "../../test/mock-config";
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
				staticMode.register(getMockModeConfig(staticMode.mode));
			}).not.toThrowError();
		});
	});

	describe("start", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.start();
			}).not.toThrowError();
		});
	});

	describe("stop", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.stop();
			}).not.toThrowError();
		});
	});

	describe("onClick", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onClick();
			}).not.toThrowError();
		});
	});

	describe("onKeyUp", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onKeyUp();
			}).not.toThrowError();
		});
	});

	describe("onKeyDown", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onKeyDown();
			}).not.toThrowError();
		});
	});

	describe("onMouseMove", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onMouseMove();
			}).not.toThrowError();
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onDrag();
			}).not.toThrowError();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onDragStart();
			}).not.toThrowError();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const staticMode = new TerraDrawStaticMode();

			expect(() => {
				staticMode.onDragEnd();
			}).not.toThrowError();
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
			}).not.toThrowError();
		});
	});
});
