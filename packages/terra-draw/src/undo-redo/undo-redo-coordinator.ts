import { TerraDrawModeUndoRedoInterface } from "./mode-undo-redo";
import { TerraDrawSessionUndoRedoInterface } from "./session-undo-redo";
import {
	HistoryChange,
	HistoryChangeCause,
	HistoryEvent,
	StackType,
} from "./undo-redo-types";

type TerraDrawUndoRedoCoordinatorOptions = {
	mode?: TerraDrawModeUndoRedoInterface;
	session?: TerraDrawSessionUndoRedoInterface;
	shouldPreferMode: () => boolean;
	onHistoryChange?: (historyChange: HistoryEvent) => void;
	shouldEmitHistoryChange?: () => boolean;
};

export class TerraDrawUndoRedoCoordinator {
	private mode?: TerraDrawModeUndoRedoInterface;
	private session?: TerraDrawSessionUndoRedoInterface;
	private shouldPreferMode: () => boolean;
	private onHistoryChange?: (historyChange: HistoryEvent) => void;
	private shouldEmitHistoryChange: () => boolean;

	constructor(options: TerraDrawUndoRedoCoordinatorOptions) {
		this.mode = options.mode;
		this.session = options.session;
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
		return Boolean(this.session && this.session.canUndo());
	}

	private hasSessionRedo() {
		return Boolean(this.session && this.session.canRedo());
	}

	private activeStackForUndo(): StackType | undefined {
		if (this.shouldPreferMode() && this.mode?.canUndo()) {
			return StackType.Mode;
		}

		if (this.hasSessionUndo()) {
			return StackType.Session;
		}

		if (this.mode?.canUndo()) {
			return StackType.Mode;
		}

		return undefined;
	}

	private activeStackForRedo(): StackType | undefined {
		if (this.shouldPreferMode() && this.mode?.canRedo()) {
			return StackType.Mode;
		}

		if (this.hasSessionRedo()) {
			return StackType.Session;
		}

		if (this.mode?.canRedo()) {
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
			return this.mode ? this.mode.undo() : false;
		}

		if (this.session && this.session.canUndo()) {
			return this.session.undo();
		}

		return false;
	}

	redo() {
		const stack = this.activeStackForRedo();
		if (!stack) {
			return false;
		}

		if (stack === StackType.Mode) {
			return this.mode ? this.mode.redo() : false;
		}

		if (this.session && this.session.canRedo()) {
			return this.session.redo();
		}

		return false;
	}

	emitPushAfterFinish() {
		if (this.session) {
			this.emitStackHistoryChange({
				cause: HistoryChangeCause.Push,
				undoStackSize: this.session.undoSize(),
				redoStackSize: this.session.redoSize(),
				stack: StackType.Session,
			});
			return;
		}

		if (this.mode) {
			this.emitStackHistoryChange({
				cause: HistoryChangeCause.Push,
				undoStackSize: this.mode.undoSize(),
				redoStackSize: this.mode.redoSize(),
				stack: StackType.Mode,
			});
		}
	}
}

export function normaliseMaxStackSize(maxStackSize?: number) {
	if (maxStackSize === undefined || !Number.isFinite(maxStackSize)) {
		return Number.POSITIVE_INFINITY;
	}

	return Math.max(0, Math.floor(maxStackSize));
}
