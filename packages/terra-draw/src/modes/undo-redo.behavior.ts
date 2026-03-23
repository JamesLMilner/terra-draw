type UndoRedoHistoryEntry<Coordinates> = {
	featureCoordinates: Coordinates;
	currentCoordinate: number;
};

type UndoStepResult<Coordinates> = {
	undoneEntry: UndoRedoHistoryEntry<Coordinates>;
	previousEntry: UndoRedoHistoryEntry<Coordinates> | undefined;
};

type UndoRedoBehaviorOptions = {
	maxStackSize?: number;
};

export class UndoRedoBehavior<Coordinates> {
	private undoHistory: UndoRedoHistoryEntry<Coordinates>[] = [];
	private redoHistory: UndoRedoHistoryEntry<Coordinates>[] = [];
	private cloneCoordinatesFunction: (coordinates: Coordinates) => Coordinates;
	private maxStackSize: number;

	constructor(options?: UndoRedoBehaviorOptions) {
		this.cloneCoordinatesFunction = (coordinates) =>
			this.cloneRecursively(coordinates) as Coordinates;

		const configuredMaxStackSize = options?.maxStackSize;
		if (
			configuredMaxStackSize === undefined ||
			!Number.isFinite(configuredMaxStackSize)
		) {
			this.maxStackSize = Number.POSITIVE_INFINITY;
		} else {
			this.maxStackSize = Math.max(0, Math.floor(configuredMaxStackSize));
		}
	}

	setMaxStackSize(maxStackSize: number) {
		if (!Number.isFinite(maxStackSize)) {
			this.maxStackSize = Number.POSITIVE_INFINITY;
			return;
		}

		this.maxStackSize = Math.max(0, Math.floor(maxStackSize));
		this.trimHistoryToMax(this.undoHistory);
		this.trimHistoryToMax(this.redoHistory);
	}

	private trimHistoryToMax(history: UndoRedoHistoryEntry<Coordinates>[]) {
		if (!Number.isFinite(this.maxStackSize)) {
			return;
		}

		while (history.length > this.maxStackSize) {
			history.shift();
		}
	}

	private pushUndoEntry(entry: UndoRedoHistoryEntry<Coordinates>) {
		if (this.maxStackSize === 0) {
			return;
		}

		this.undoHistory.push(entry);
		this.trimHistoryToMax(this.undoHistory);
	}

	private pushRedoEntry(entry: UndoRedoHistoryEntry<Coordinates>) {
		if (this.maxStackSize === 0) {
			return;
		}

		this.redoHistory.push(entry);
		this.trimHistoryToMax(this.redoHistory);
	}

	private cloneRecursively(value: unknown): unknown {
		if (Array.isArray(value)) {
			return value.map((childValue) => this.cloneRecursively(childValue));
		}

		if (value !== null && typeof value === "object") {
			return { ...value };
		}

		return value;
	}

	public cloneCoordinates(coordinates: Coordinates): Coordinates {
		return this.cloneCoordinatesFunction(coordinates);
	}

	private cloneEntry(
		entry: UndoRedoHistoryEntry<Coordinates>,
	): UndoRedoHistoryEntry<Coordinates> {
		return {
			featureCoordinates: this.cloneCoordinates(entry.featureCoordinates),
			currentCoordinate: entry.currentCoordinate,
		};
	}

	clear() {
		this.undoHistory = [];
		this.redoHistory = [];
	}

	undoSize() {
		return this.undoHistory.length;
	}

	redoSize() {
		return this.redoHistory.length;
	}

	recordSnapshot(entry: UndoRedoHistoryEntry<Coordinates>) {
		this.pushUndoEntry(this.cloneEntry(entry));
		this.redoHistory = [];
	}

	beginUndo(): UndoStepResult<Coordinates> | undefined {
		const undoneEntry = this.undoHistory.pop();

		if (!undoneEntry) {
			return;
		}

		const clonedUndoneEntry = this.cloneEntry(undoneEntry);
		this.pushRedoEntry(clonedUndoneEntry);

		const previousEntry = this.undoHistory[this.undoHistory.length - 1];

		return {
			undoneEntry: clonedUndoneEntry,
			previousEntry: previousEntry ? this.cloneEntry(previousEntry) : undefined,
		};
	}

	takeRedo(): UndoRedoHistoryEntry<Coordinates> | undefined {
		const redoneEntry = this.redoHistory.pop();

		if (!redoneEntry) {
			return;
		}

		return this.cloneEntry(redoneEntry);
	}

	commitRedo(entry: UndoRedoHistoryEntry<Coordinates>) {
		this.pushUndoEntry(this.cloneEntry(entry));
	}
}
