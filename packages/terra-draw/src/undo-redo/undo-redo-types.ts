export interface TerraDrawUndoRedoInterface {
	undo(): boolean;
	redo(): boolean;
	canUndo(): boolean;
	canRedo(): boolean;
	undoSize(): number;
	redoSize(): number;
}

export interface TerraDrawUndoRedoOptions {
	maxStackSize?: number;
}

export const HistoryChangeCause = {
	Undo: "undo",
	Redo: "redo",
	Push: "push",
} as const;

export const StackType = {
	Mode: "mode",
	Session: "session",
} as const;

export type StackType = (typeof StackType)[keyof typeof StackType];
export type HistoryCause =
	(typeof HistoryChangeCause)[keyof typeof HistoryChangeCause];

export type HistoryChange = {
	cause: HistoryCause;
	stack: StackType;
	undoStackSize: number;
	redoStackSize: number;
};

export type HistoryEvent = {
	cause: HistoryCause;
	stack: StackType;
	undoSize: number;
	redoSize: number;
};
