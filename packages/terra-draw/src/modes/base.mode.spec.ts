import { TerraDrawAdapterStyling } from "../common";
import { GeoJSONStoreFeatures } from "../store/store";
import { MockModeConfig } from "../test/mock-mode-config";
import { getDefaultStyling } from "../util/styling";
import { BehaviorConfig } from "./base.behavior";
import { TerraDrawBaseDrawMode } from "./base.mode";

class TestBaseMode extends TerraDrawBaseDrawMode<Record<string, never>> {
	registeredPointerDistance: number | undefined;

	getPointerDistance() {
		return this.pointerDistance;
	}

	start(): void {
		return;
	}

	stop(): void {
		return;
	}

	cleanUp(): void {
		return;
	}

	registerBehaviors(config: BehaviorConfig): void {
		this.registeredPointerDistance = config.pointerDistance;
	}

	styleFeature(_: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		return getDefaultStyling();
	}
}

describe("TerraDrawBaseDrawMode", () => {
	describe("pointerDistance", () => {
		it("accepts zero in constructor options", () => {
			const mode = new TestBaseMode({ pointerDistance: 0 });

			expect(mode.getPointerDistance()).toBe(0);
		});

		it("accepts zero in updateOptions", () => {
			const mode = new TestBaseMode({ pointerDistance: 10 });

			mode.updateOptions({ pointerDistance: 0 });

			expect(mode.getPointerDistance()).toBe(0);
		});

		it("passes zero to registered behavior config", () => {
			const mode = new TestBaseMode({ pointerDistance: 0 });

			mode.register(MockModeConfig(mode.mode));

			expect(mode.registeredPointerDistance).toBe(0);
		});
	});
});
