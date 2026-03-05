import { FeatureId } from "../extend";
import {
	TerraDraw,
	TerraDrawAngledRectangleMode,
	TerraDrawCircleMode,
	TerraDrawFreehandLineStringMode,
	TerraDrawFreehandMode,
	TerraDrawLineStringMode,
	TerraDrawMarkerMode,
	TerraDrawPointMode,
	TerraDrawPolygonMode,
	TerraDrawRectangleMode,
	TerraDrawSectorMode,
	TerraDrawSensorMode,
} from "../terra-draw";
import { TerraDrawTestAdapter } from "../terra-draw.extensions.spec";
import { MockCursorEvent } from "../test/mock-cursor-event";
import { TerraDrawSessionUndoRedo } from "./session-undo-redo";

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

	function expectedStack(onHistoryChange: jest.Mock) {
		return (expected: { undo: number; redo: number }) => {
			const stackChange =
				onHistoryChange.mock.calls[onHistoryChange.mock.calls.length - 1][0];
			const { undoStackSize, redoStackSize } = stackChange;
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
	let onHistoryChange: jest.Mock;
	let expectFeatures: (expectedCount: number) => void;
	let expectStack: (expected: { undo: number; redo: number }) => void;
	let createPolygonFeature: (size?: number) => void;
	let manager: TerraDrawSessionUndoRedo;

	type BuiltInDrawableModeCase = {
		name: string;
		createMode: () => any;
		drawFeature: (mode: any) => void;
	};

	const builtInDrawableModeCases: BuiltInDrawableModeCase[] = [
		{
			name: "point",
			createMode: () => new TerraDrawPointMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			},
		},
		{
			name: "marker",
			createMode: () => new TerraDrawMarkerMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			},
		},
		{
			name: "linestring",
			createMode: () =>
				new TerraDrawLineStringMode({ finishOnNthCoordinate: 2 }),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
				mode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
				mode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			},
		},
		{
			name: "polygon",
			createMode: () => new TerraDrawPolygonMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
				mode.onClick(MockCursorEvent({ lng: 1, lat: 0 }));
				mode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
			},
		},
		{
			name: "circle",
			createMode: () => new TerraDrawCircleMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
				mode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
				mode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			},
		},
		{
			name: "rectangle",
			createMode: () => new TerraDrawRectangleMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
				mode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
				mode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			},
		},
		{
			name: "angled-rectangle",
			createMode: () => new TerraDrawAngledRectangleMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
				mode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
				mode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
				mode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));
				mode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));
			},
		},
		{
			name: "sector",
			createMode: () => new TerraDrawSectorMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: -0.128673315, lat: 51.500349947 }));
				mode.onMouseMove(
					MockCursorEvent({ lng: -0.092495679, lat: 51.515995286 }),
				);
				mode.onClick(MockCursorEvent({ lng: -0.092495679, lat: 51.515995286 }));
				mode.onMouseMove(
					MockCursorEvent({ lng: -0.087491348, lat: 51.490132315 }),
				);
				mode.onClick(MockCursorEvent({ lng: -0.087491348, lat: 51.490132315 }));
			},
		},
		{
			name: "sensor",
			createMode: () => new TerraDrawSensorMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
				mode.onMouseMove(MockCursorEvent({ lng: 1, lat: 1 }));
				mode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
				mode.onMouseMove(MockCursorEvent({ lng: 2, lat: 2 }));
				mode.onClick(MockCursorEvent({ lng: 3, lat: 3 }));
				mode.onMouseMove(MockCursorEvent({ lng: 1.5, lat: 1.5 }));
				mode.onClick(MockCursorEvent({ lng: 1.5, lat: 1.5 }));
			},
		},
		{
			name: "freehand",
			createMode: () => new TerraDrawFreehandMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
				mode.onMouseMove(MockCursorEvent({ lng: 0, lat: 1 }));
				mode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			},
		},
		{
			name: "freehand-linestring",
			createMode: () => new TerraDrawFreehandLineStringMode(),
			drawFeature: (mode) => {
				mode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));
				mode.onMouseMove(MockCursorEvent({ lng: 0, lat: 1 }));
				mode.onClick(MockCursorEvent({ lng: 1, lat: 1 }));
			},
		},
	];

	beforeAll(() => {
		adapter = new TerraDrawTestAdapter({
			lib: {},
			coordinatePrecision: 9,
		});
	});

	beforeEach(() => {
		onHistoryChange = jest.fn();
		const polygonMode = new TerraDrawPolygonMode();
		draw = new TerraDraw({
			adapter,
			modes: [polygonMode],
		});

		expectFeatures = expectedFeatures(draw);
		expectStack = expectedStack(onHistoryChange);

		draw.start();
		draw.setMode("polygon");

		createPolygonFeature = (size = 0.1) => {
			return drawPolygonFeature(polygonMode, size);
		};

		manager = new TerraDrawSessionUndoRedo();
		manager.register({
			draw,
			onHistoryChange,
		});
	});

	describe("onHistoryChange", () => {
		it("emits a single undo history-change event for a single undo action", () => {
			createPolygonFeature(0.1);

			onHistoryChange.mockClear();
			manager.undo();

			const undoEvents = onHistoryChange.mock.calls
				.map((call) => call[0])
				.filter((historyChange) => historyChange.cause === "undo");

			expect(undoEvents).toEqual([
				{
					cause: "undo",
					undoStackSize: 0,
					redoStackSize: 1,
				},
			]);
		});

		it("emits push with redoStackSize 0 after a new finish invalidates redo history", () => {
			// Arrange: create one action and undo it so redo history exists
			createPolygonFeature(0.1);
			manager.undo();

			expect(manager.undoSize()).toBe(0);
			expect(manager.redoSize()).toBe(1);

			// Act: perform a new finished action, which should invalidate redo
			createPolygonFeature(0.2);

			// Assert: emitted payload reflects invalidated redo at the moment of push
			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "push",
				undoStackSize: 1,
				redoStackSize: 0,
			});
			expect(manager.undoSize()).toBe(1);
			expect(manager.redoSize()).toBe(0);
		});

		it("reports cause and stack sizes for push actions", () => {
			createPolygonFeature(0.1);
			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "push",
				undoStackSize: 1,
				redoStackSize: 0,
			});

			const drawnFeatureId = draw.getSnapshot()[0].id as FeatureId;
			draw.removeFeatures([drawnFeatureId]);
			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "push",
				undoStackSize: 2,
				redoStackSize: 0,
			});
		});

		it("reports cause and stack sizes for undo and redo of a creation", () => {
			createPolygonFeature(0.1);

			manager.undo();
			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "undo",
				undoStackSize: 0,
				redoStackSize: 1,
			});

			manager.redo();
			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "redo",
				undoStackSize: 1,
				redoStackSize: 0,
			});
		});

		it("reports cause and stack sizes for undo and redo of a delete", () => {
			createPolygonFeature(0.1);
			const drawnFeatureId = draw.getSnapshot()[0].id as FeatureId;
			draw.removeFeatures([drawnFeatureId]);

			manager.undo();
			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "undo",
				undoStackSize: 1,
				redoStackSize: 1,
			});

			manager.redo();
			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "redo",
				undoStackSize: 2,
				redoStackSize: 0,
			});
		});

		it("always emits valid cause and numeric stack sizes", () => {
			createPolygonFeature(0.1);
			manager.undo();
			manager.redo();

			onHistoryChange.mock.calls.forEach((call) => {
				const historyChange = call[0];
				expect(historyChange.cause).toMatch(/undo|redo|push/);
				expect(typeof historyChange.undoStackSize).toBe("number");
				expect(typeof historyChange.redoStackSize).toBe("number");
			});
		});

		it("does not duplicate callbacks when register is called multiple times with the same draw", () => {
			manager.register({
				draw,
				onHistoryChange,
			});

			onHistoryChange.mockClear();
			createPolygonFeature(0.1);

			const pushEvents = onHistoryChange.mock.calls
				.map((call) => call[0])
				.filter((historyChange) => historyChange.cause === "push");

			expect(pushEvents).toEqual([
				{
					cause: "push",
					undoStackSize: 1,
					redoStackSize: 0,
				},
			]);
		});
	});

	describe("undo", () => {
		it("tracks initial drawn feature when id strategy starts at zero", () => {
			let currentIdentifier = 0;
			const onHistoryChange = jest.fn();
			const pointMode = new TerraDrawPointMode();

			draw = new TerraDraw({
				adapter,
				modes: [pointMode],
				idStrategy: {
					isValidId: (id) => typeof id === "number" && Number.isInteger(id),
					getId: () => currentIdentifier++,
				},
			});

			draw.start();
			draw.setMode("point");

			const numericManager = new TerraDrawSessionUndoRedo();
			numericManager.register({
				draw,
				onHistoryChange,
			});

			pointMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "push",
				undoStackSize: 1,
				redoStackSize: 0,
			});
			numericManager.undo();
			expect(draw.getSnapshot().length).toBe(0);
		});

		it("can undo one drawn polygon creation", () => {
			createPolygonFeature(0.1);

			const featuresBeforeUndo = draw.getSnapshot();

			expect(featuresBeforeUndo.length).toBe(1);

			manager.undo();

			const featuresAfterUndo = draw.getSnapshot();
			expect(featuresAfterUndo.length).toBe(0);
		});

		it("can undo two drawn polygon creation", () => {
			const manager = new TerraDrawSessionUndoRedo();
			manager.register({
				draw,
				onHistoryChange: () => {
					// no-op
				},
			});

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

	describe("undoSize", () => {
		it("undo size should be 1 before undo and 0 after undo", () => {
			createPolygonFeature(0.1);

			expect(manager.undoSize()).toBe(1);

			manager.undo();

			expect(manager.undoSize()).toBe(0);

			const featuresAfterUndo = draw.getSnapshot();
			expect(featuresAfterUndo.length).toBe(0);
		});

		it("undo size should return to 1 after undo then redo", () => {
			createPolygonFeature(0.1);

			expect(manager.undoSize()).toBe(1);
			expect(manager.redoSize()).toBe(0);

			manager.undo();
			expect(manager.undoSize()).toBe(0);
			expect(manager.redoSize()).toBe(1);

			manager.redo();
			expect(manager.undoSize()).toBe(1);
			expect(manager.redoSize()).toBe(0);
		});

		it("redo size should be 1 after undo and 0 after redo", () => {
			createPolygonFeature(0.1);

			expect(manager.redoSize()).toBe(0);

			manager.undo();

			expect(manager.redoSize()).toBe(1);

			manager.redo();

			expect(manager.redoSize()).toBe(0);
		});
	});

	describe("built-in drawable modes", () => {
		it.each(builtInDrawableModeCases)(
			"tracks session undo/redo for $name",
			({ createMode, drawFeature }) => {
				const mode = createMode();
				const modeDraw = new TerraDraw({
					adapter,
					modes: [mode as any],
				});

				const modeHistoryChange = jest.fn();
				const modeManager = new TerraDrawSessionUndoRedo();
				modeManager.register({
					draw: modeDraw,
					onHistoryChange: modeHistoryChange,
				});

				modeDraw.start();
				modeDraw.setMode(mode.mode);

				drawFeature(mode);

				const snapshotSizeAfterDraw = modeDraw.getSnapshot().length;
				const undoStackSizeAfterDraw = modeManager.undoSize();
				const redoStackSizeAfterDraw = modeManager.redoSize();

				expect(snapshotSizeAfterDraw).toBe(1);
				expect(undoStackSizeAfterDraw).toBe(1);
				expect(redoStackSizeAfterDraw).toBe(0);
				expect(modeHistoryChange).toHaveBeenLastCalledWith({
					cause: "push",
					undoStackSize: undoStackSizeAfterDraw,
					redoStackSize: redoStackSizeAfterDraw,
				});

				modeManager.undo();

				const snapshotSizeAfterUndo = modeDraw.getSnapshot().length;
				const undoStackSizeAfterUndo = modeManager.undoSize();
				const redoStackSizeAfterUndo = modeManager.redoSize();

				expect(snapshotSizeAfterUndo).toBe(0);
				expect(undoStackSizeAfterUndo).toBe(0);
				expect(redoStackSizeAfterUndo).toBe(1);
				expect(modeHistoryChange).toHaveBeenLastCalledWith({
					cause: "undo",
					undoStackSize: undoStackSizeAfterUndo,
					redoStackSize: redoStackSizeAfterUndo,
				});

				modeManager.redo();

				const snapshotSizeAfterRedo = modeDraw.getSnapshot().length;
				const undoStackSizeAfterRedo = modeManager.undoSize();
				const redoStackSizeAfterRedo = modeManager.redoSize();

				expect(snapshotSizeAfterRedo).toBe(1);
				expect(undoStackSizeAfterRedo).toBe(1);
				expect(redoStackSizeAfterRedo).toBe(redoStackSizeAfterDraw);
				expect(modeHistoryChange).toHaveBeenLastCalledWith({
					cause: "redo",
					undoStackSize: undoStackSizeAfterRedo,
					redoStackSize: redoStackSizeAfterRedo,
				});
			},
		);
	});
});
