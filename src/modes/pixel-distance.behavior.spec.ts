import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";

describe("PixelDistanceBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			new PixelDistanceBehavior(MockBehaviorConfig("test"));
		});
	});

	describe("api", () => {
		it("measure", () => {
			const config = MockBehaviorConfig("test");

			const pixelDistanceBehavior = new PixelDistanceBehavior(config);

			const distance = pixelDistanceBehavior.measure(
				MockCursorEvent({ lng: 0, lat: 0 }),
				[0, 1],
			);

			// The mockBehaviorConfig function returns project/unproject methods that work on 40 pixel increments
			expect(distance).toStrictEqual(40);
		});
	});
});
