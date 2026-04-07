import { TerraDrawModeState } from "../common";
import { normaliseMaxStackSize } from "./normalise-stack-size";
import {
	HistoryCause,
	HistoryChange,
	HistoryChangeCause,
	StackType,
	TerraDrawUndoRedoInterface,
	TerraDrawUndoRedoOptions,
} from "./undo-redo-types";

export interface TerraDrawModeUndoRedoInterface
	extends TerraDrawUndoRedoInterface {
	getMaxStackSize?(): number;
	register(options: {
		getModeState: () => string;
		getModeHistorySizes: () => { undoSize: number; redoSize: number };
		undoMode: () => void;
		redoMode: () => void;
		clearModeHistory: () => void;
		onHistoryChange: (historyChange: HistoryChange) => void;
	}): void;
	canUndo(): boolean;
	canRedo(): boolean;
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
	private clearModeHistory: (() => void) | undefined;
	private onHistoryChange: ((historyChange: HistoryChange) => void) | undefined;
	private readonly maxStackSize: number;

	private lastHistorySizes = {
		undoSize: 0,
		redoSize: 0,
	};

	constructor(options?: TerraDrawUndoRedoOptions) {
		this.maxStackSize = normaliseMaxStackSize(options?.maxStackSize);
	}

	getMaxStackSize() {
		return this.maxStackSize;
	}

	register(options: {
		getModeState: () => TerraDrawModeState;
		getModeHistorySizes: () => { undoSize: number; redoSize: number };
		undoMode: () => void;
		redoMode: () => void;
		clearModeHistory: () => void;
		onHistoryChange: (historyChange: HistoryChange) => void;
	}) {
		this.getModeState = options.getModeState;
		this.getModeHistorySizes = options.getModeHistorySizes;
		this.undoMode = options.undoMode;
		this.redoMode = options.redoMode;
		this.clearModeHistory = options.clearModeHistory;
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

	clearHistory() {
		if (this.clearModeHistory) {
			this.clearModeHistory();
		}

		this.lastHistorySizes = {
			undoSize: 0,
			redoSize: 0,
		};
	}

	getHistorySizes() {
		if (!this.getModeHistorySizes) {
			return { undoSize: 0, redoSize: 0 };
		}

		return this.getModeHistorySizes();
	}

	undoSize() {
		return this.getHistorySizes().undoSize;
	}

	redoSize() {
		return this.getHistorySizes().redoSize;
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
			stack: StackType.Mode,
			undoStackSize: undoSize,
			redoStackSize: redoSize,
		});
	}
}
