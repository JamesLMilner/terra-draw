export type DrawingHistoryChangeCause = "undo" | "redo" | "push";

export type DrawingHistoryChange = {
	cause: DrawingHistoryChangeCause;
	undoStackSize: number;
	redoStackSize: number;
};

export interface TerraDrawDrawingUndoRedoInterface {
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
	emitHistoryChange(cause: DrawingHistoryChangeCause): void;
}

export class TerraDrawDrawingUndoRedo
	implements TerraDrawDrawingUndoRedoInterface
{
	private getModeState: (() => string) | undefined;
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
		getModeState: () => string;
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
		this.emitHistoryChange("undo");
		return true;
	}

	redo() {
		if (!this.canRedo() || !this.redoMode) {
			return false;
		}

		this.redoMode();
		this.emitHistoryChange("redo");
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
			this.emitHistoryChange("push");
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
			this.emitHistoryChange("push");
		}
	}

	emitHistoryChange(cause: DrawingHistoryChangeCause) {
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
