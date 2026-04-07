import { TerraDrawModeUndoRedoInterface } from "./mode-undo-redo";
import { TerraDrawSessionUndoRedoInterface } from "./session-undo-redo";
import {
	HistoryChange,
	HistoryChangeCause,
	HistoryEvent,
	StackType,
} from "./undo-redo-types";

type TerraDrawUndoRedoCoordinatorOptions = {
	modeLevel?: TerraDrawModeUndoRedoInterface;
	sessionLevel?: TerraDrawSessionUndoRedoInterface;
	shouldPreferMode: () => boolean;
	onHistoryChange?: (historyChange: HistoryEvent) => void;
	shouldEmitHistoryChange?: () => boolean;
};

export class TerraDrawUndoRedoCoordinator {
	private modeLevel?: TerraDrawModeUndoRedoInterface;
	private sessionLevel?: TerraDrawSessionUndoRedoInterface;
	private shouldPreferMode: () => boolean;
	private onHistoryChange?: (historyChange: HistoryEvent) => void;
	private shouldEmitHistoryChange: () => boolean;

	constructor(options: TerraDrawUndoRedoCoordinatorOptions) {
		this.modeLevel = options.modeLevel;
		this.sessionLevel = options.sessionLevel;
		this.shouldPreferMode = options.shouldPreferMode;
		this.onHistoryChange = options.onHistoryChange;
		this.shouldEmitHistoryChange =
			options.shouldEmitHistoryChange ?? (() => true);
	}

	emitStackHistoryChange(change: HistoryChange) {
		if (!this.shouldEmitHistoryChange()) {
			return;
		}

		if (this.onHistoryChange) {
			this.onHistoryChange({
				cause: change.cause,
				stack: change.stack,
				undoSize: change.undoStackSize,
				redoSize: change.redoStackSize,
			});
		}
	}

	private hasSessionUndo() {
		return Boolean(this.sessionLevel && this.sessionLevel.canUndo());
	}

	private hasSessionRedo() {
		return Boolean(this.sessionLevel && this.sessionLevel.canRedo());
	}

	private activeStackForUndo(): StackType | undefined {
		if (this.shouldPreferMode() && this.modeLevel?.canUndo()) {
			return StackType.Mode;
		}

		if (this.hasSessionUndo()) {
			return StackType.Session;
		}

		if (this.modeLevel?.canUndo()) {
			return StackType.Mode;
		}

		return undefined;
	}

	private activeStackForRedo(): StackType | undefined {
		if (this.shouldPreferMode() && this.modeLevel?.canRedo()) {
			return StackType.Mode;
		}

		if (this.hasSessionRedo()) {
			return StackType.Session;
		}

		if (this.modeLevel?.canRedo()) {
			return StackType.Mode;
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

		if (stack === StackType.Mode) {
			return this.modeLevel ? this.modeLevel.undo() : false;
		}

		if (this.sessionLevel && this.sessionLevel.canUndo()) {
			return this.sessionLevel.undo();
		}

		return false;
	}

	redo() {
		const stack = this.activeStackForRedo();
		if (!stack) {
			return false;
		}

		if (stack === StackType.Mode) {
			return this.modeLevel ? this.modeLevel.redo() : false;
		}

		if (this.sessionLevel && this.sessionLevel.canRedo()) {
			return this.sessionLevel.redo();
		}

		return false;
	}

	clearHistory() {
		if (this.modeLevel) {
			this.modeLevel.clearHistory();
		}

		if (this.sessionLevel) {
			this.sessionLevel.clearHistory();
		}
	}

	emitPushAfterFinish() {
		if (this.sessionLevel) {
			this.emitStackHistoryChange({
				cause: HistoryChangeCause.Push,
				undoStackSize: this.sessionLevel.undoSize(),
				redoStackSize: this.sessionLevel.redoSize(),
				stack: StackType.Session,
			});
			return;
		}

		if (this.modeLevel) {
			this.emitStackHistoryChange({
				cause: HistoryChangeCause.Push,
				undoStackSize: this.modeLevel.undoSize(),
				redoStackSize: this.modeLevel.redoSize(),
				stack: StackType.Mode,
			});
		}
	}
}
