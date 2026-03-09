import { TerraDrawDrawingUndoRedoInterface } from "./drawing-undo-redo";
import { TerraDrawSessionUndoRedoInterface } from "./session-undo-redo";

type StackType = "drawing" | "session";
type HistoryCause = "undo" | "redo" | "push";

type UndoRedoHistoryChange = {
	cause: HistoryCause;
	stack: StackType;
	undoSize: number;
	redoSize: number;
};

type TerraDrawUndoRedoCoordinatorOptions = {
	drawing?: TerraDrawDrawingUndoRedoInterface;
	session?: TerraDrawSessionUndoRedoInterface;
	shouldPreferDrawing: () => boolean;
	onHistoryChange?: (historyChange: UndoRedoHistoryChange) => void;
	shouldEmitHistoryChange?: () => boolean;
};

export class TerraDrawUndoRedoCoordinator {
	private drawing?: TerraDrawDrawingUndoRedoInterface;
	private session?: TerraDrawSessionUndoRedoInterface;
	private shouldPreferDrawing: () => boolean;
	private onHistoryChange?: (historyChange: UndoRedoHistoryChange) => void;
	private shouldEmitHistoryChange: () => boolean;

	constructor(options: TerraDrawUndoRedoCoordinatorOptions) {
		this.drawing = options.drawing;
		this.session = options.session;
		this.shouldPreferDrawing = options.shouldPreferDrawing;
		this.onHistoryChange = options.onHistoryChange;
		this.shouldEmitHistoryChange =
			options.shouldEmitHistoryChange ?? (() => true);
	}

	private emitHistoryChange(change: UndoRedoHistoryChange) {
		if (!this.shouldEmitHistoryChange()) {
			return;
		}

		if (this.onHistoryChange) {
			this.onHistoryChange(change);
		}
	}

	emitDrawingHistoryChange(change: {
		cause: HistoryCause;
		undoStackSize: number;
		redoStackSize: number;
	}) {
		this.emitHistoryChange({
			cause: change.cause,
			stack: "drawing",
			undoSize: change.undoStackSize,
			redoSize: change.redoStackSize,
		});
	}

	emitSessionHistoryChange(change: {
		cause: HistoryCause;
		undoStackSize: number;
		redoStackSize: number;
	}) {
		this.emitHistoryChange({
			cause: change.cause,
			stack: "session",
			undoSize: change.undoStackSize,
			redoSize: change.redoStackSize,
		});
	}

	private hasSessionUndo() {
		return Boolean(this.session && this.session.undoSize() > 0);
	}

	private hasSessionRedo() {
		return Boolean(this.session && this.session.redoSize() > 0);
	}

	private activeStackForUndo(): StackType | undefined {
		if (this.shouldPreferDrawing() && this.drawing?.canUndo()) {
			return "drawing";
		}

		if (this.hasSessionUndo()) {
			return "session";
		}

		if (this.drawing?.canUndo()) {
			return "drawing";
		}

		return undefined;
	}

	private activeStackForRedo(): StackType | undefined {
		if (this.shouldPreferDrawing() && this.drawing?.canRedo()) {
			return "drawing";
		}

		if (this.hasSessionRedo()) {
			return "session";
		}

		if (this.drawing?.canRedo()) {
			return "drawing";
		}

		return undefined;
	}

	canUndo() {
		return this.activeStackForUndo() !== undefined;
	}

	canRedo() {
		return this.activeStackForRedo() !== undefined;
	}

	undo() {
		const stack = this.activeStackForUndo();
		if (!stack) {
			return false;
		}

		if (stack === "drawing") {
			return this.drawing ? this.drawing.undo() : false;
		}

		if (this.session && this.session.undoSize() > 0) {
			this.session.undo();
			return true;
		}

		return false;
	}

	redo() {
		const stack = this.activeStackForRedo();
		if (!stack) {
			return false;
		}

		if (stack === "drawing") {
			return this.drawing ? this.drawing.redo() : false;
		}

		if (this.session && this.session.redoSize() > 0) {
			this.session.redo();
			return true;
		}

		return false;
	}

	emitPushAfterFinish() {
		if (this.session) {
			this.emitSessionHistoryChange({
				cause: "push",
				undoStackSize: this.session.undoSize(),
				redoStackSize: this.session.redoSize(),
			});
			return;
		}

		if (this.drawing) {
			this.drawing.emitHistoryChange("push");
		}
	}
}
