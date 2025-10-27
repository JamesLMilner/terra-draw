/**
 * @jest-environment jsdom
 */

import { setupUndoRedo, TerraDraw, TerraDrawPolygonMode } from "./terra-draw";
import { TerraDrawTestAdapter } from "./terra-draw.extensions.spec";
import { MockCursorEvent } from "./test/mock-cursor-event";

describe("Undo/Redo", () => {
	let adapter: TerraDrawTestAdapter;

	beforeAll(() => {
		adapter = new TerraDrawTestAdapter({
			lib: {},
			coordinatePrecision: 9,
		});
	});

	describe("undo", () => {
		it("can undo one drawn polygon creation", () => {
			const polygonMode = new TerraDrawPolygonMode();
			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});
			draw.start();

			draw.setMode("polygon");

			const manager = setupUndoRedo(draw);

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0.1, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0.1, lat: 0.1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const featuresBeforeUndo = draw.getSnapshot();

			expect(featuresBeforeUndo.length).toBe(1);

			manager.undo();

			const featuresAfterUndo = draw.getSnapshot();
			expect(featuresAfterUndo.length).toBe(0);
		});

		it("can undo two drawn polygon creation", () => {
			const polygonMode = new TerraDrawPolygonMode();
			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});
			draw.start();

			draw.setMode("polygon");

			const manager = setupUndoRedo(draw);

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0.1, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0.1, lat: 0.1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const features = draw.getSnapshot();
			expect(features.length).toBe(1);

			polygonMode.onClick(MockCursorEvent({ lng: 0.1, lat: 0.1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0.1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0.1, lat: 0.1 }));
			const featuresBeforeUndo = draw.getSnapshot();

			expect(featuresBeforeUndo.length).toBe(2);

			manager.undo();

			const featuresAfterUndo = draw.getSnapshot();
			expect(featuresAfterUndo.length).toBe(1);

			manager.undo();

			const featuresAfterSecondUndo = draw.getSnapshot();
			expect(featuresAfterSecondUndo.length).toBe(0);
		});

		it("can undo a clear call", () => {
			const polygonMode = new TerraDrawPolygonMode();
			const draw = new TerraDraw({
				adapter,
				modes: [polygonMode],
			});
			draw.start();

			draw.setMode("polygon");

			const manager = setupUndoRedo(draw);

			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0.1, lat: 0 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0.1, lat: 0.1 }));
			polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			const featuresBeforeClear = draw.getSnapshot();

			expect(featuresBeforeClear.length).toBe(1);

			draw.clear();

			const featuresAfterClear = draw.getSnapshot();
			expect(featuresAfterClear.length).toBe(0);

			manager.undo();

			const featuresAfterUndo = draw.getSnapshot();
			expect(featuresAfterUndo.length).toBe(1);
		});
	});
});
