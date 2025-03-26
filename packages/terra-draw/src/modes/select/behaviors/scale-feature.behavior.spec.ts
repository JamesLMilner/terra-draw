import {
	createStorePoint,
	createStoreLineString,
	createStorePolygon,
} from "../../../test/create-store-features";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MockCursorEvent } from "../../../test/mock-cursor-event";
import { BehaviorConfig } from "../../base.behavior";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import { ScaleFeatureBehavior } from "./scale-feature.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("ScaleFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const coordinatePointBehavior = new CoordinatePointBehavior(config);
			new ScaleFeatureBehavior(
				config,
				selectionPointBehavior,
				new MidPointBehavior(
					config,
					selectionPointBehavior,
					coordinatePointBehavior,
				),
				coordinatePointBehavior,
			);
		});
	});

	describe("api", () => {
		let scaleFeatureBehavior: ScaleFeatureBehavior;
		let config: BehaviorConfig;

		beforeEach(() => {
			config = MockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const coordinatePointBehavior = new CoordinatePointBehavior(config);

			scaleFeatureBehavior = new ScaleFeatureBehavior(
				config,
				selectionPointBehavior,
				new MidPointBehavior(
					config,
					selectionPointBehavior,
					coordinatePointBehavior,
				),
				coordinatePointBehavior,
			);

			jest.spyOn(config.store, "updateGeometry");
		});

		describe("scale", () => {
			it("non Polygon or LineStrings do an early return", () => {
				const id = createStorePoint(config);

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("first event sets the initial bearing and does not update the LineString", () => {
				const id = createStoreLineString(config);

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("second event scales the LineString", () => {
				const id = createStoreLineString(config);

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);
				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});

			it("second event scales the Polygon", () => {
				const id = createStorePolygon(config);

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);
				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});
		});

		describe("reset", () => {
			it("resets the initial bearing so the next event will not trigger a scale geometry update", () => {
				const id = createStoreLineString(config);

				jest.spyOn(config.store, "updateGeometry");

				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);
				scaleFeatureBehavior.reset();
				scaleFeatureBehavior.scale(MockCursorEvent({ lng: 0, lat: 0 }), id);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});
		});
	});
});
