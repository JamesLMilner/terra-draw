/**
 * @jest-environment jsdom
 */

import { FeatureId } from "./extend";
import { setupUndoRedo, TerraDraw, TerraDrawPolygonMode } from "./terra-draw";
import { TerraDrawTestAdapter } from "./terra-draw.extensions.spec";
import { MockCursorEvent } from "./test/mock-cursor-event";

describe("Undo/Redo", () => {
	const drawPolygonFeature = (
		polygonMode: TerraDrawPolygonMode,
		size = 0.1,
	) => {
		polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
		polygonMode.onClick(MockCursorEvent({ lng: size, lat: 0 }));
		polygonMode.onClick(MockCursorEvent({ lng: size, lat: size }));
		polygonMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
	};

	function expectedStack(onStackChange: jest.Mock) {
		return (expected: { undo: number; redo: number }) => {
			const stackChange =
				onStackChange.mock.calls[onStackChange.mock.calls.length - 1];
			const [undoStackSize, redoStackSize] = stackChange;
			expect(undoStackSize).toBe(expected.undo);
			expect(redoStackSize).toBe(expected.redo);
		};
	}

	function expectedFeatures(draw: TerraDraw) {
		return (expectedCount: number) => {
			const features = draw.getSnapshot();
			expect(features.length).toBe(expectedCount);
		};
	}

	let adapter: TerraDrawTestAdapter;
	let draw: TerraDraw;
	let expectFeatures: (expectedCount: number) => void;
	let expectStack: (expected: { undo: number; redo: number }) => void;
	let createPolygonFeature: (size?: number) => void;
	let manager: ReturnType<typeof setupUndoRedo>;

	beforeAll(() => {
		adapter = new TerraDrawTestAdapter({
			lib: {},
			coordinatePrecision: 9,
		});
	});

	beforeEach(() => {
		const onStackChange = jest.fn();
		const polygonMode = new TerraDrawPolygonMode();
		draw = new TerraDraw({
			adapter,
			modes: [polygonMode],
		});

		expectFeatures = expectedFeatures(draw);
		expectStack = expectedStack(onStackChange);

		draw.start();
		draw.setMode("polygon");

		createPolygonFeature = (size = 0.1) => {
			return drawPolygonFeature(polygonMode, size);
		};

		manager = setupUndoRedo(draw, {
			onStackChange,
		});
	});

	describe("undo", () => {
		it("can undo one drawn polygon creation", () => {
			createPolygonFeature(0.1);

			const featuresBeforeUndo = draw.getSnapshot();

			expect(featuresBeforeUndo.length).toBe(1);

			manager.undo();

			const featuresAfterUndo = draw.getSnapshot();
			expect(featuresAfterUndo.length).toBe(0);
		});

		it("can undo two drawn polygon creation", () => {
			const manager = setupUndoRedo(draw);

			createPolygonFeature(0.1);
			expectFeatures(1);

			createPolygonFeature(0.2);
			expectFeatures(2);

			manager.undo();
			expectFeatures(1);

			manager.undo();
			expectFeatures(0);
		});

		it("can undo a clear call", () => {
			createPolygonFeature(0.1);
			expectFeatures(1);

			draw.clear();
			expectFeatures(0);

			manager.undo();
			expectFeatures(1);
		});
	});

	describe("redo", () => {
		it("can undo and redo a removeFeatures call", () => {
			createPolygonFeature(0.1);

			expectFeatures(1);
			expectStack({ undo: 1, redo: 0 });

			const drawnFeatureId = draw.getSnapshot()[0].id as FeatureId;
			draw.removeFeatures([drawnFeatureId]);

			expectFeatures(0);
			expectStack({ undo: 2, redo: 0 });

			// Undo the delete
			manager.undo();

			expectFeatures(1);
			expectStack({ undo: 1, redo: 1 });

			// Redo the delete
			manager.redo();

			expectFeatures(0);
			expectStack({ undo: 2, redo: 0 });
		});

		it("can undo and redo a clear call", () => {
			createPolygonFeature(0.1);

			expectFeatures(1);
			expectStack({ undo: 1, redo: 0 });

			draw.clear();

			expectFeatures(0);
			expectStack({ undo: 2, redo: 0 });

			// Undo the clear
			manager.undo();

			expectFeatures(1);
			expectStack({ undo: 1, redo: 1 });

			// Redo the clear
			manager.redo();

			expectFeatures(0);
			expectStack({ undo: 2, redo: 0 });
		});
	});
});
