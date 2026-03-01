import { penDrawTouchNavigateFilter } from "./base.adapter";

describe("penDrawTouchNavigateFilter", () => {
	it("returns 'draw' for pen pointer type", () => {
		const event = { pointerType: "pen" } as PointerEvent;
		expect(penDrawTouchNavigateFilter(event)).toBe("draw");
	});

	it("returns 'navigate' for touch pointer type", () => {
		const event = { pointerType: "touch" } as PointerEvent;
		expect(penDrawTouchNavigateFilter(event)).toBe("navigate");
	});

	it("returns 'navigate' for mouse pointer type", () => {
		const event = { pointerType: "mouse" } as PointerEvent;
		expect(penDrawTouchNavigateFilter(event)).toBe("navigate");
	});
});
