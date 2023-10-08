import {
	createStorePoint,
	createStoreLineString,
	createStorePolygon,
} from "../../../test/create-store-features";
import { mockBehaviorConfig } from "../../../test/mock-behavior-config";
import { mockDrawEvent } from "../../../test/mock-mouse-event";
import { BehaviorConfig } from "../../base.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { ScaleFeatureBehavior } from "./scale-feature.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("ScaleFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = mockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			new ScaleFeatureBehavior(
				config,
				selectionPointBehavior,
				new MidPointBehavior(config, selectionPointBehavior),
			);
		});
	});

	describe("api", () => {
		let scaleFeatureBehavior: ScaleFeatureBehavior;
		let config: BehaviorConfig;

		beforeEach(() => {
			config = mockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			scaleFeatureBehavior = new ScaleFeatureBehavior(
				config,
				selectionPointBehavior,
				new MidPointBehavior(config, selectionPointBehavior),
			);

			jest.spyOn(config.store, "updateGeometry");
		});

		describe("scale", () => {
			it("non Polygon or LineStrings do an early return", () => {
				const id = createStorePoint(config);

				scaleFeatureBehavior.scale(mockDrawEvent(), id);

				expect(config.store.updateGeometry).toBeCalledTimes(0);
			});

			it("first event sets the initial bearing and does not update the LineString", () => {
				const id = createStoreLineString(config);

				scaleFeatureBehavior.scale(mockDrawEvent(), id);

				expect(config.store.updateGeometry).toBeCalledTimes(0);
			});

			it("second event scales the LineString", () => {
				const id = createStoreLineString(config);

				scaleFeatureBehavior.scale(mockDrawEvent(), id);
				scaleFeatureBehavior.scale(mockDrawEvent(), id);
				expect(config.store.updateGeometry).toBeCalledTimes(1);
			});

			it("second event scales the Polygon", () => {
				const id = createStorePolygon(config);

				scaleFeatureBehavior.scale(mockDrawEvent(), id);
				scaleFeatureBehavior.scale(mockDrawEvent(), id);
				expect(config.store.updateGeometry).toBeCalledTimes(1);
			});
		});

		describe("reset", () => {
			it("resets the initial bearing so the next event will not trigger a scale geometry update", () => {
				const id = createStoreLineString(config);

				jest.spyOn(config.store, "updateGeometry");

				scaleFeatureBehavior.scale(mockDrawEvent(), id);
				scaleFeatureBehavior.reset();
				scaleFeatureBehavior.scale(mockDrawEvent(), id);

				expect(config.store.updateGeometry).toBeCalledTimes(0);
			});
		});
	});
});
