import { TerraDrawModeState } from "../common";
import { TerraDrawModeUndoRedo } from "./mode-undo-redo";

describe("TerraDrawModeUndoRedo", () => {
	let modeState: TerraDrawModeState;
	let undoStackSize: number;
	let redoStackSize: number;
	let undoMode: jest.Mock;
	let redoMode: jest.Mock;
	let clearModeHistory: jest.Mock;
	let onHistoryChange: jest.Mock;
	let drawingUndoRedo: TerraDrawModeUndoRedo;

	const registerDrawingUndoRedo = () => {
		drawingUndoRedo.register({
			getModeState: () => modeState,
			getModeHistorySizes: () => ({
				undoSize: undoStackSize,
				redoSize: redoStackSize,
			}),
			undoMode,
			redoMode,
			clearModeHistory,
			onHistoryChange,
		});
	};

	beforeEach(() => {
		modeState = "drawing";
		undoStackSize = 0;
		redoStackSize = 0;
		undoMode = jest.fn();
		redoMode = jest.fn();
		clearModeHistory = jest.fn();
		onHistoryChange = jest.fn();
		drawingUndoRedo = new TerraDrawModeUndoRedo();
	});

	describe("getMaxStackSize", () => {
		it("returns Infinity by default", () => {
			expect(drawingUndoRedo.getMaxStackSize()).toBe(Number.POSITIVE_INFINITY);
		});

		it("returns a normalized finite stack size when configured", () => {
			drawingUndoRedo = new TerraDrawModeUndoRedo({
				maxStackSize: 3.9,
			});

			expect(drawingUndoRedo.getMaxStackSize()).toBe(3);
		});
	});

	describe("getHistorySizes", () => {
		it("returns zero sizes before register", () => {
			expect(drawingUndoRedo.getHistorySizes()).toEqual({
				undoSize: 0,
				redoSize: 0,
			});
		});

		it("returns the provided mode history sizes after register", () => {
			undoStackSize = 2;
			redoStackSize = 1;
			registerDrawingUndoRedo();

			expect(drawingUndoRedo.getHistorySizes()).toEqual({
				undoSize: 2,
				redoSize: 1,
			});
		});
	});

	describe("canUndo/canRedo", () => {
		it("returns false for canUndo and canRedo when not in drawing state", () => {
			modeState = "started";
			undoStackSize = 2;
			redoStackSize = 3;
			registerDrawingUndoRedo();

			expect(drawingUndoRedo.canUndo()).toBe(false);
			expect(drawingUndoRedo.canRedo()).toBe(false);
		});

		it("returns true for canUndo when in drawing state and undo stack has entries", () => {
			undoStackSize = 1;
			registerDrawingUndoRedo();

			expect(drawingUndoRedo.canUndo()).toBe(true);
		});

		it("returns true for canRedo when in drawing state and redo stack has entries", () => {
			redoStackSize = 1;
			registerDrawingUndoRedo();

			expect(drawingUndoRedo.canRedo()).toBe(true);
		});
	});

	describe("undo", () => {
		it("returns false and does not call undoMode when undo is unavailable", () => {
			undoStackSize = 0;
			registerDrawingUndoRedo();

			expect(drawingUndoRedo.undo()).toBe(false);
			expect(undoMode).not.toHaveBeenCalled();
			expect(onHistoryChange).not.toHaveBeenCalled();
		});

		it("calls undoMode and emits an undo history event when undo is available", () => {
			undoStackSize = 2;
			redoStackSize = 0;
			registerDrawingUndoRedo();

			const didUndo = drawingUndoRedo.undo();

			expect(didUndo).toBe(true);
			expect(undoMode).toHaveBeenCalledTimes(1);
			expect(onHistoryChange).toHaveBeenCalledWith({
				cause: "undo",
				stack: "mode",
				undoStackSize: 2,
				redoStackSize: 0,
			});
		});
	});

	describe("redo", () => {
		it("returns false and does not call redoMode when redo is unavailable", () => {
			redoStackSize = 0;
			registerDrawingUndoRedo();

			expect(drawingUndoRedo.redo()).toBe(false);
			expect(redoMode).not.toHaveBeenCalled();
			expect(onHistoryChange).not.toHaveBeenCalled();
		});

		it("calls redoMode and emits a redo history event when redo is available", () => {
			undoStackSize = 1;
			redoStackSize = 3;
			registerDrawingUndoRedo();

			const didRedo = drawingUndoRedo.redo();

			expect(didRedo).toBe(true);
			expect(redoMode).toHaveBeenCalledTimes(1);
			expect(onHistoryChange).toHaveBeenCalledWith({
				cause: "redo",
				stack: "mode",
				undoStackSize: 1,
				redoStackSize: 3,
			});
		});
	});

	describe("emitPushIfHistoryChangedFromLastSnapshot", () => {
		it("does not emit in non-drawing state", () => {
			modeState = "started";
			undoStackSize = 1;
			redoStackSize = 1;
			registerDrawingUndoRedo();

			drawingUndoRedo.emitPushIfHistoryChangedFromLastSnapshot();

			expect(onHistoryChange).not.toHaveBeenCalled();
		});

		it("emits push only when history differs from the last emitted snapshot", () => {
			undoStackSize = 1;
			redoStackSize = 0;
			registerDrawingUndoRedo();

			drawingUndoRedo.emitPushIfHistoryChangedFromLastSnapshot();
			expect(onHistoryChange).toHaveBeenCalledTimes(1);
			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "push",
				stack: "mode",
				undoStackSize: 1,
				redoStackSize: 0,
			});

			drawingUndoRedo.emitPushIfHistoryChangedFromLastSnapshot();
			expect(onHistoryChange).toHaveBeenCalledTimes(1);

			undoStackSize = 2;
			drawingUndoRedo.emitPushIfHistoryChangedFromLastSnapshot();
			expect(onHistoryChange).toHaveBeenCalledTimes(2);
			expect(onHistoryChange).toHaveBeenLastCalledWith({
				cause: "push",
				stack: "mode",
				undoStackSize: 2,
				redoStackSize: 0,
			});
		});
	});

	describe("emitPushIfHistoryChanged", () => {
		it("emits push when current sizes differ from before", () => {
			undoStackSize = 2;
			redoStackSize = 1;
			registerDrawingUndoRedo();

			drawingUndoRedo.emitPushIfHistoryChanged({
				undoSize: 1,
				redoSize: 1,
			});

			expect(onHistoryChange).toHaveBeenCalledWith({
				cause: "push",
				stack: "mode",
				undoStackSize: 2,
				redoStackSize: 1,
			});
		});

		it("does not emit push when sizes are unchanged", () => {
			undoStackSize = 3;
			redoStackSize = 4;
			registerDrawingUndoRedo();

			drawingUndoRedo.emitPushIfHistoryChanged({
				undoSize: 3,
				redoSize: 4,
			});

			expect(onHistoryChange).not.toHaveBeenCalled();
		});
	});

	describe("emitHistoryChange", () => {
		it("emits a history change with current stack sizes", () => {
			undoStackSize = 7;
			redoStackSize = 2;
			registerDrawingUndoRedo();

			drawingUndoRedo.emitHistoryChange("push");

			expect(onHistoryChange).toHaveBeenCalledWith({
				cause: "push",
				stack: "mode",
				undoStackSize: 7,
				redoStackSize: 2,
			});
		});
	});

	describe("clearHistory", () => {
		it("clears mode history via registered callback", () => {
			registerDrawingUndoRedo();

			drawingUndoRedo.clearHistory();

			expect(clearModeHistory).toHaveBeenCalledTimes(1);
		});
	});
});
