import { TerraDrawModeState } from "../common";
import {
	HistoryCause,
	HistoryChangeCause,
	StackType,
} from "./undo-redo-coordinator";

type DrawingHistoryChange = {
	cause: HistoryCause;
	undoStackSize: number;
	redoStackSize: number;
};

export interface TerraDrawModeUndoRedoInterface {
	register(options: {
		getModeState: () => string;
		getModeHistorySizes: () => { undoSize: number; redoSize: number };
		undoMode: () => void;
		redoMode: () => void;
		onHistoryChange: (historyChange: DrawingHistoryChange) => void;
	}): void;
	canUndo(): boolean;
	canRedo(): boolean;
	undo(): boolean;
	redo(): boolean;
	getHistorySizes(): { undoSize: number; redoSize: number };
	emitPushIfHistoryChangedFromLastSnapshot(): void;
	emitPushIfHistoryChanged(before: {
		undoSize: number;
		redoSize: number;
	}): void;
	emitHistoryChange(cause: HistoryCause): void;
}

export class TerraDrawModeUndoRedo implements TerraDrawModeUndoRedoInterface {
	private getModeState: (() => TerraDrawModeState) | undefined;
	private getModeHistorySizes:
		| (() => { undoSize: number; redoSize: number })
		| undefined;
	private undoMode: (() => void) | undefined;
	private redoMode: (() => void) | undefined;
	private onHistoryChange:
		| ((historyChange: DrawingHistoryChange) => void)
		| undefined;

	private lastHistorySizes = {
		undoSize: 0,
		redoSize: 0,
	};

	register(options: {
		getModeState: () => TerraDrawModeState;
		getModeHistorySizes: () => { undoSize: number; redoSize: number };
		undoMode: () => void;
		redoMode: () => void;
		onHistoryChange: (historyChange: DrawingHistoryChange) => void;
	}) {
		this.getModeState = options.getModeState;
		this.getModeHistorySizes = options.getModeHistorySizes;
		this.undoMode = options.undoMode;
		this.redoMode = options.redoMode;
		this.onHistoryChange = options.onHistoryChange;
	}

	private inDrawingState() {
		return this.getModeState ? this.getModeState() === "drawing" : false;
	}

	canUndo() {
		if (!this.inDrawingState()) {
			return false;
		}

		const { undoSize } = this.getHistorySizes();
		return undoSize > 0;
	}

	canRedo() {
		if (!this.inDrawingState()) {
			return false;
		}

		const { redoSize } = this.getHistorySizes();
		return redoSize > 0;
	}

	undo() {
		if (!this.canUndo() || !this.undoMode) {
			return false;
		}

		this.undoMode();
		this.emitHistoryChange(HistoryChangeCause.Undo);
		return true;
	}

	redo() {
		if (!this.canRedo() || !this.redoMode) {
			return false;
		}

		this.redoMode();
		this.emitHistoryChange(HistoryChangeCause.Redo);
		return true;
	}

	getHistorySizes() {
		if (!this.getModeHistorySizes) {
			return { undoSize: 0, redoSize: 0 };
		}

		return this.getModeHistorySizes();
	}

	emitPushIfHistoryChangedFromLastSnapshot() {
		if (!this.inDrawingState()) {
			return;
		}

		const currentHistorySizes = this.getHistorySizes();
		if (
			currentHistorySizes.undoSize !== this.lastHistorySizes.undoSize ||
			currentHistorySizes.redoSize !== this.lastHistorySizes.redoSize
		) {
			this.emitHistoryChange(HistoryChangeCause.Push);
		}
	}

	emitPushIfHistoryChanged(before: { undoSize: number; redoSize: number }) {
		if (!this.inDrawingState()) {
			return;
		}

		const after = this.getHistorySizes();
		if (
			after.undoSize !== before.undoSize ||
			after.redoSize !== before.redoSize
		) {
			this.emitHistoryChange(HistoryChangeCause.Push);
		}
	}

	emitHistoryChange(cause: HistoryCause) {
		if (!this.onHistoryChange) {
			return;
		}

		const { undoSize, redoSize } = this.getHistorySizes();
		this.lastHistorySizes = {
			undoSize,
			redoSize,
		};

		this.onHistoryChange({
			cause,
			undoStackSize: undoSize,
			redoStackSize: redoSize,
		});
	}
}
