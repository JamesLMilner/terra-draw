import { MockBehaviorConfig } from "../test/mock-behavior-config";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { ClickBoundingBoxBehavior } from "./click-bounding-box.behavior";

describe("ClickBoundingBoxBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			new ClickBoundingBoxBehavior(MockBehaviorConfig("test"));
		});
	});

	describe("api", () => {
		it("create", () => {
			const config = MockBehaviorConfig("test");

			const clickBoundingBoxBehavior = new ClickBoundingBoxBehavior(config);

			const bbox = clickBoundingBoxBehavior.create(
				MockCursorEvent({ lng: 1, lat: 1 }),
			);

			expect(bbox).toStrictEqual({
				geometry: {
					coordinates: [
						[
							[0.5, 0.5],
							[1.5, 0.5],
							[1.5, 1.5],
							[0.5, 1.5],
							[0.5, 0.5],
						],
					],
					type: "Polygon",
				},
				properties: {},
				type: "Feature",
			});
		});
	});
});
