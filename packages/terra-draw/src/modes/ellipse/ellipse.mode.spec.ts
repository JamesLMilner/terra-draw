import { MockCursorEvent } from "../../test/mock-cursor-event";
import { MockModeConfig } from "../../test/mock-mode-config";
import { COMMON_PROPERTIES } from "../../common";
import { Polygon } from "geojson";
import { TerraDrawEllipseMode } from "./ellipse.mode";

describe("TerraDrawEllipseMode", () => {
	it("constructs with the ellipse mode name", () => {
		const ellipseMode = new TerraDrawEllipseMode();
		expect(ellipseMode.mode).toBe("ellipse");
	});

	describe("drawing", () => {
		it("creates and finishes an ellipse with separate radii", () => {
			const ellipseMode = new TerraDrawEllipseMode();
			const config = MockModeConfig(ellipseMode.mode);
			const store = config.store;

			ellipseMode.register(config);
			ellipseMode.start();
			ellipseMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			ellipseMode.onMouseMove(MockCursorEvent({ lng: 1, lat: 0.5 }));
			ellipseMode.onClick(MockCursorEvent({ lng: 1, lat: 0.5 }));

			const [feature] = store.copyAll();
			const xRadius = feature.properties.xRadiusKilometers as number;
			const yRadius = feature.properties.yRadiusKilometers as number;
			expect(feature.geometry.type).toBe("Polygon");
			expect(
				feature.properties[COMMON_PROPERTIES.CURRENTLY_DRAWING],
			).toBeUndefined();
			expect(xRadius).toBeGreaterThan(yRadius);
			const coordinates = (feature.geometry as Polygon).coordinates[0];
			expect((feature.geometry as Polygon).coordinates[0][0]).toEqual(
				coordinates[coordinates.length - 1],
			);
		});
	});
});
