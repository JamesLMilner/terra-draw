import { Project } from "../common";
import { mockBehaviorConfig } from "../test/mock-behavior-config";
import { mockDrawEvent } from "../test/mock-mouse-event";
import { PixelDistanceBehavior } from "./pixel-distance.behavior";

describe("PixelDistanceBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			new PixelDistanceBehavior(mockBehaviorConfig("test"));
		});
	});

	describe("api", () => {
		it("measure", () => {
			const config = mockBehaviorConfig("test");

			// Mock the unproject to return a valid set
			// of bbox coordinates
			(config.project as jest.Mock<ReturnType<Project>>).mockImplementationOnce(
				() => ({
					x: 0,
					y: 1,
				}),
			);

			const pxielDistanceBehavior = new PixelDistanceBehavior(config);

			const distance = pxielDistanceBehavior.measure(mockDrawEvent(), [0, 1]);

			expect(distance).toStrictEqual(1);
		});
	});
});
