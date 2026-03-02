import { FeatureId } from "../extend";
import { GeoJSONStoreFeatures, TerraDraw } from "../terra-draw";

export type HistoryChangeCause = "undo" | "redo" | "push";

export type HistoryChange = {
	cause: HistoryChangeCause;
	undoStackSize: number;
	redoStackSize: number;
};

export interface TerraDrawSessionUndoRedoInterface {
	register(options: {
		draw: TerraDraw;
		onHistoryChange: (historyChange: HistoryChange) => void;
	}): void;
	undo(): void;
	redo(): void;
	undoSize(): number;
	redoSize(): number;
}

type RedoStackEntry = {
	id: FeatureId;
	toIndex: number;
	snapshot?: GeoJSONStoreFeatures;
	action?: "create" | "update" | "delete";
};

type UndoStackEntry = {
	id: FeatureId;
	toIndex: number;
};

export class TerraDrawSessionUndoRedo
	implements TerraDrawSessionUndoRedoInterface
{
	private draw: TerraDraw | undefined;
	private onHistoryChange: ((historyChange: HistoryChange) => void) | undefined;

	private historyById: { [key: string]: GeoJSONStoreFeatures[] } = {};
	private undoStack: UndoStackEntry[] = [];
	private ignoreProgrammaticDelete: Record<FeatureId, boolean> = {};
	private redoStack: RedoStackEntry[] = [];

	register(options: {
		draw: TerraDraw;
		onHistoryChange: (historyChange: HistoryChange) => void;
	}) {
		if (this.draw === options.draw) {
			this.onHistoryChange = options.onHistoryChange;
			return;
		}

		if (this.draw) {
			this.draw.off("change", this.handleChange);
			this.draw.off("finish", this.handleFinish);
		}

		this.draw = options.draw;
		this.draw.on("change", this.handleChange);
		this.draw.on("finish", this.handleFinish);
		this.onHistoryChange = options.onHistoryChange;
	}

	private emitStackChange = (cause: HistoryChangeCause) => {
		this.onHistoryChange &&
			this.onHistoryChange({
				cause,
				undoStackSize: this.undoStack.length,
				redoStackSize: this.redoStack.length,
			});
	};

	private handleChange = (ids: FeatureId[], type: string) => {
		if (!this.draw || this.draw.getModeState() === "drawing") {
			return;
		}

		if (type !== "delete") {
			return;
		}

		let recorded = false;
		const deleted = Array.isArray(ids) ? ids : [ids];
		for (const id of deleted) {
			const key = String(id);

			// Skip deletes we initiated during undo/redo
			if (this.ignoreProgrammaticDelete[id]) {
				delete this.ignoreProgrammaticDelete[id];
				continue;
			}

			// We only care about features we have history for (i.e., user-created/editable features)
			if (!this.historyById[key]) {
				continue;
			}

			// Treat deletes (including clear) as actions that can be undone by re-adding the last snapshot
			const lastIndex = this.historyById[key].length - 1;
			if (lastIndex >= 0) {
				this.undoStack.push({
					id,
					toIndex: lastIndex,
				});
				recorded = true;
			}
		}

		// Any new user-driven delete should invalidate the redo history
		if (recorded) {
			this.redoStack.length = 0;
			this.emitStackChange("push");
		}
	};

	private handleFinish = (ids: FeatureId[] | FeatureId) => {
		if (!this.draw) {
			return;
		}

		const changed = Array.isArray(ids) ? ids : [ids];
		let recordedFinishAction = false;
		for (const id of changed) {
			if (id === undefined || id === null) continue;

			const key = String(id);

			const feature = this.draw.getSnapshotFeature(id);
			if (!feature) continue;

			if (!this.historyById[key]) this.historyById[key] = [];
			this.historyById[key].push(feature);

			if (!recordedFinishAction) {
				// Any new finished action invalidates the redo history
				this.redoStack.length = 0;
				recordedFinishAction = true;
			}

			// Record both the id and the index in that feature's history for robust undo
			this.undoStack.push({
				id,
				toIndex: this.historyById[key].length - 1,
			});
			this.emitStackChange("push");
		}
	};

	undo() {
		if (!this.draw || this.draw.getModeState() === "drawing") {
			return;
		}

		if (this.undoStack.length === 0) return;

		const undoStackEntry = this.undoStack.pop();
		if (!undoStackEntry) {
			this.emitStackChange("undo");
			return;
		}

		const id = undoStackEntry.id;
		const index = undoStackEntry.toIndex;

		const key = String(id);
		const stack = this.historyById[key];
		if (!stack || stack.length === 0) {
			this.emitStackChange("undo");
			return;
		}

		// Clamp index in case of any out-of-sync situations
		const currentIndex = Math.min(index, stack.length - 1);

		// If the feature currently does not exist (e.g., after a clear/delete), restore it
		const featureExists = this.draw.hasFeature(id);
		if (!featureExists) {
			const snapshotToRestore = stack[currentIndex];
			if (!snapshotToRestore) {
				this.emitStackChange("undo");
				return;
			}
			this.draw.addFeatures([snapshotToRestore]);

			// Allow redo to re-delete the feature; do not change undo stack size here
			this.redoStack.push({
				id,
				toIndex: currentIndex,
				action: "delete",
				snapshot: snapshotToRestore,
			});
			this.emitStackChange("undo");
			return;
		}

		// If there is no previous state, the action was creation -> remove the feature
		if (currentIndex <= 0) {
			// Record redo info so we can recreate the feature
			this.redoStack.push({ id, toIndex: 0, action: "create" });

			this.ignoreProgrammaticDelete[id] = true;
			this.draw.removeFeatures([id]);

			// Remove any remaining actions for this id from the undo stack
			this.undoStack = this.undoStack.filter(
				(undoAction) => undoAction.id !== id,
			);
			this.emitStackChange("undo");
			return;
		}

		// Revert to the previous geometry for this action and truncate history to that point
		const nextSnapshot = stack[currentIndex]; // the state we are undoing
		const prev = stack[currentIndex - 1];

		// Save redo info before truncating the stack
		if (nextSnapshot) {
			this.redoStack.push({
				id,
				toIndex: currentIndex,
				snapshot: nextSnapshot,
				action: "update",
			});
		}

		this.draw.updateFeatureGeometry(id, prev.geometry);
		stack.length = currentIndex; // drop the state we just undid
		this.emitStackChange("undo");
	}

	redo() {
		if (!this.draw || this.draw.getModeState() === "drawing") {
			return;
		}

		if (this.redoStack.length === 0) return;

		const { id, toIndex, snapshot, action } = this.redoStack.pop()!;
		const key = String(id);
		const stack = this.historyById[key] || (this.historyById[key] = []);

		// If the redo action is a delete, remove the feature again
		if (action === "delete") {
			this.ignoreProgrammaticDelete[id] = true;
			this.draw.removeFeatures([id]);
			// Reflect that the delete action has been reapplied by pushing back onto the undo stack
			this.undoStack.push({ id, toIndex });
			this.emitStackChange("redo");
			return;
		}

		if (toIndex <= 0) {
			// Redo creation - recreate the initial feature
			const initial = stack[0];
			if (!initial) return;
			this.draw.addFeatures([initial]);

			// Restore the action into the history stacks
			this.undoStack.push({ id, toIndex: 0 });
			this.emitStackChange("redo");
			return;
		}

		// Redo an update - reapply the geometry and restore the snapshot in history
		const next = snapshot || stack[toIndex];
		if (!next) return;

		// Ensure the history includes the redone snapshot at the correct index
		if (stack.length === toIndex) {
			stack.push(next);
		} else if (stack.length < toIndex) {
			stack[toIndex] = next;
			stack.length = toIndex + 1;
		} else {
			stack[toIndex] = next;
			stack.length = toIndex + 1;
		}

		this.draw.updateFeatureGeometry(id, next.geometry);

		// Restore the action into the history stacks so it can be undone again
		this.undoStack.push({ id, toIndex });
		this.emitStackChange("redo");
	}

	undoSize() {
		return this.undoStack.length;
	}

	redoSize() {
		return this.redoStack.length;
	}
}
