export type UndoRedoHistoryEntry<Coordinates> = {
	featureCoordinates: Coordinates;
	currentCoordinate: number;
};

export type UndoStepResult<Coordinates> = {
	undoneEntry: UndoRedoHistoryEntry<Coordinates>;
	previousEntry: UndoRedoHistoryEntry<Coordinates> | undefined;
};

export class UndoRedoBehavior<Coordinates> {
	private undoHistory: UndoRedoHistoryEntry<Coordinates>[] = [];
	private redoHistory: UndoRedoHistoryEntry<Coordinates>[] = [];
	private cloneCoordinatesFunction: (coordinates: Coordinates) => Coordinates;

	constructor(
		cloneCoordinatesFunction?: (coordinates: Coordinates) => Coordinates,
	) {
		this.cloneCoordinatesFunction =
			cloneCoordinatesFunction ||
			((coordinates) => this.cloneRecursively(coordinates) as Coordinates);
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
		this.undoHistory.push(this.cloneEntry(entry));
		this.redoHistory = [];
	}

	beginUndo(): UndoStepResult<Coordinates> | undefined {
		const undoneEntry = this.undoHistory.pop();

		if (!undoneEntry) {
			return;
		}

		const clonedUndoneEntry = this.cloneEntry(undoneEntry);
		this.redoHistory.push(clonedUndoneEntry);

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
		this.undoHistory.push(this.cloneEntry(entry));
	}
}
