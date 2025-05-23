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
import { RotateFeatureBehavior } from "./rotate-feature.behavior";
import { SelectionPointBehavior } from "./selection-point.behavior";

describe("RotateFeatureBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const config = MockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const coordinatePointBehavior = new CoordinatePointBehavior(config);

			new RotateFeatureBehavior(
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
		let rotateFeatureBehavior: RotateFeatureBehavior;
		let config: BehaviorConfig;

		beforeEach(() => {
			config = MockBehaviorConfig("test");
			const selectionPointBehavior = new SelectionPointBehavior(config);
			const coordinatePointBehavior = new CoordinatePointBehavior(config);

			rotateFeatureBehavior = new RotateFeatureBehavior(
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
			jest.spyOn(config.store, "getGeometryCopy");
		});

		describe("rotate", () => {
			it("non Polygon or LineStrings do an early return", () => {
				const id = createStorePoint(config);

				rotateFeatureBehavior.rotate(MockCursorEvent({ lng: 0, lat: 0 }), id);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("first event sets the initial bearing and does not update the LineString", () => {
				const id = createStoreLineString(config);

				rotateFeatureBehavior.rotate(MockCursorEvent({ lng: 0, lat: 0 }), id);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("second event rotates the LineString", () => {
				const id = createStoreLineString(config);

				rotateFeatureBehavior.rotate(MockCursorEvent({ lng: 0, lat: 0 }), id);
				rotateFeatureBehavior.rotate(MockCursorEvent({ lng: 0, lat: 0 }), id);

				// We cache the geometry in the first event
				// and then use it in the second event
				expect(config.store.getGeometryCopy).toHaveBeenCalledTimes(1);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});

			it("second event rotates the Polygon", () => {
				const id = createStorePolygon(config);

				rotateFeatureBehavior.rotate(MockCursorEvent({ lng: 0, lat: 0 }), id);
				rotateFeatureBehavior.rotate(MockCursorEvent({ lng: 0, lat: 0 }), id);

				// We cache the geometry in the first event
				// and then use it in the second event
				expect(config.store.getGeometryCopy).toHaveBeenCalledTimes(1);
				expect(config.store.updateGeometry).toHaveBeenCalledTimes(1);
			});
		});

		describe("reset", () => {
			it("resets the initial bearing so the next event will not trigger a rotate geometry update", () => {
				const id = createStoreLineString(config);

				jest.spyOn(config.store, "updateGeometry");

				rotateFeatureBehavior.rotate(MockCursorEvent({ lng: 0, lat: 0 }), id);
				rotateFeatureBehavior.reset();
				rotateFeatureBehavior.rotate(MockCursorEvent({ lng: 0, lat: 0 }), id);

				expect(config.store.updateGeometry).toHaveBeenCalledTimes(0);
			});
		});
	});
});
