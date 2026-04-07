import { FeatureId } from "../extend";
import { TerraDrawOnChangeContext } from "../common";
import { GeoJSONStoreFeatures, TerraDraw } from "../terra-draw";
import {
	HistoryCause,
	HistoryChange,
	HistoryChangeCause,
	StackType,
	TerraDrawUndoRedoInterface,
	TerraDrawUndoRedoOptions,
} from "./undo-redo-types";
import { normaliseMaxStackSize } from "./normalise-stack-size";

type BatchEntry = {
	id: FeatureId;
	toIndex: number;
	snapshot: GeoJSONStoreFeatures;
};

type StackEntryMetadata = {
	entries: BatchEntry[];
};

export interface TerraDrawSessionUndoRedoInterface
	extends TerraDrawUndoRedoInterface {
	register(options: {
		draw: TerraDraw;
		onHistoryChange: (historyChange: HistoryChange) => void;
	}): void;
}

type RedoStackEntry = {
	id: FeatureId;
	toIndex: number;
	snapshot?: GeoJSONStoreFeatures;
	action: "create" | "update" | "delete" | "batch-create" | "batch-delete";
	metadata?: StackEntryMetadata;
};

type UndoStackEntry = {
	id: FeatureId;
	toIndex: number;
	action: "single" | "batch-create" | "batch-delete";
	metadata?: StackEntryMetadata;
};

export class TerraDrawSessionUndoRedo
	implements TerraDrawSessionUndoRedoInterface
{
	private draw: TerraDraw | undefined;
	private onHistoryChange: ((historyChange: HistoryChange) => void) | undefined;
	private readonly maxStackSize: number;

	private historyById: { [key: string]: GeoJSONStoreFeatures[] } = {};
	private undoStack: UndoStackEntry[] = [];
	private ignoreProgrammaticCreate: Record<FeatureId, boolean> = {};
	private ignoreProgrammaticDelete: Record<FeatureId, boolean> = {};
	private deletedFeatureIds: Record<FeatureId, boolean> = {};
	private redoStack: RedoStackEntry[] = [];

	constructor(options?: TerraDrawUndoRedoOptions) {
		this.maxStackSize = normaliseMaxStackSize(options?.maxStackSize);
	}

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

	private emitStackChange = (cause: HistoryCause) => {
		this.onHistoryChange &&
			this.onHistoryChange({
				cause,
				stack: StackType.Session,
				undoStackSize: this.undoStack.length,
				redoStackSize: this.redoStack.length,
			});
	};

	private pushUndoStackEntry(entry: UndoStackEntry) {
		if (this.maxStackSize === 0) {
			return;
		}

		this.undoStack.push(entry);
		if (this.undoStack.length > this.maxStackSize) {
			this.undoStack.shift();
		}
	}

	private pushRedoStackEntry(entry: RedoStackEntry) {
		if (this.maxStackSize === 0) {
			return;
		}

		this.redoStack.push(entry);
		if (this.redoStack.length > this.maxStackSize) {
			this.redoStack.shift();
		}
	}

	private handleChange = (
		ids: FeatureId[],
		type: string,
		context?: TerraDrawOnChangeContext,
	) => {
		if (!this.draw || this.isDrawing()) {
			return;
		}

		if (this.maxStackSize === 0) {
			return;
		}

		if (type !== "delete" && type !== "create") {
			return;
		}

		if (type === "create") {
			const isApiOrigin =
				context !== undefined &&
				"origin" in context &&
				context.origin === "api";

			if (!isApiOrigin) {
				return;
			}

			let recordedCreate = false;
			const created = Array.isArray(ids) ? ids : [ids];
			const creationsForBatch: {
				id: FeatureId;
				toIndex: number;
				snapshot: GeoJSONStoreFeatures;
			}[] = [];

			for (const id of created) {
				if (this.ignoreProgrammaticCreate[id]) {
					delete this.ignoreProgrammaticCreate[id];
					delete this.deletedFeatureIds[id];
					continue;
				}

				const key = String(id);
				const feature = this.draw.getSnapshotFeature(id);
				if (!feature) {
					continue;
				}

				if (this.deletedFeatureIds[id]) {
					this.historyById[key] = [];
					delete this.deletedFeatureIds[id];
				}

				if (!this.historyById[key]) {
					this.historyById[key] = [];
				}

				this.historyById[key].push(feature);
				const toIndex = this.historyById[key].length - 1;
				creationsForBatch.push({
					id,
					toIndex,
					snapshot: feature,
				});
				recordedCreate = true;
			}

			if (creationsForBatch.length > 1) {
				this.pushUndoStackEntry({
					id: creationsForBatch[0].id,
					toIndex: creationsForBatch[0].toIndex,
					action: "batch-create",
					metadata: { entries: creationsForBatch },
				});
			} else if (creationsForBatch.length === 1) {
				const creation = creationsForBatch[0];
				this.pushUndoStackEntry({
					id: creation.id,
					toIndex: creation.toIndex,
					action: "single",
				});
			}

			if (recordedCreate) {
				this.redoStack.length = 0;
				this.emitStackChange(HistoryChangeCause.Push);
			}

			return;
		}

		let recorded = false;
		const deleted = Array.isArray(ids) ? ids : [ids];
		const deletionsForBatch: {
			id: FeatureId;
			toIndex: number;
			snapshot: GeoJSONStoreFeatures;
		}[] = [];
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
				const snapshot = this.historyById[key][lastIndex];
				if (!snapshot) {
					continue;
				}

				deletionsForBatch.push({
					id,
					toIndex: lastIndex,
					snapshot,
				});
				this.deletedFeatureIds[id] = true;
				recorded = true;
			}
		}

		if (deletionsForBatch.length > 1) {
			this.pushUndoStackEntry({
				id: deletionsForBatch[0].id,
				toIndex: deletionsForBatch[0].toIndex,
				action: "batch-delete",
				metadata: { entries: deletionsForBatch },
			});
		} else if (deletionsForBatch.length === 1) {
			const deletion = deletionsForBatch[0];
			this.pushUndoStackEntry({
				id: deletion.id,
				toIndex: deletion.toIndex,
				action: "single",
			});
		}

		// Any new user-driven delete should invalidate the redo history
		if (recorded) {
			this.redoStack.length = 0;
			this.emitStackChange(HistoryChangeCause.Push);
		}
	};

	private handleFinish = (ids: FeatureId[] | FeatureId) => {
		if (!this.draw) {
			return;
		}

		if (this.maxStackSize === 0) {
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
			this.pushUndoStackEntry({
				id,
				toIndex: this.historyById[key].length - 1,
				action: "single",
			});
			this.emitStackChange(HistoryChangeCause.Push);
		}
	};

	private isDrawing() {
		return this.draw ? this.draw.getModeState() === "drawing" : false;
	}

	canUndo() {
		if (!this.draw || this.isDrawing()) {
			return false;
		}

		return this.undoStack.length > 0;
	}

	canRedo() {
		if (!this.draw || this.isDrawing()) {
			return false;
		}

		return this.redoStack.length > 0;
	}

	undo(): boolean {
		if (!this.canUndo()) {
			return false;
		}

		if (!this.draw) {
			return false;
		}

		const undoStackEntry = this.undoStack.pop();
		if (!undoStackEntry) {
			this.emitStackChange(HistoryChangeCause.Undo);
			return false;
		}

		if (undoStackEntry.action === "batch-create") {
			const entriesToDelete = undoStackEntry.metadata?.entries || [];
			if (entriesToDelete.length === 0) {
				this.emitStackChange(HistoryChangeCause.Undo);
				return false;
			}

			const idsToDelete = entriesToDelete.map((entry) => entry.id);
			idsToDelete.forEach((featureId) => {
				this.ignoreProgrammaticDelete[featureId] = true;
				this.deletedFeatureIds[featureId] = true;
			});

			this.draw.removeFeatures(idsToDelete);
			this.pushRedoStackEntry({
				id: entriesToDelete[0].id,
				toIndex: entriesToDelete[0].toIndex,
				action: "batch-create",
				metadata: { entries: entriesToDelete },
			});
			this.emitStackChange(HistoryChangeCause.Undo);
			return true;
		}

		if (undoStackEntry.action === "batch-delete") {
			const entriesToRestore = undoStackEntry.metadata?.entries || [];
			if (entriesToRestore.length === 0) {
				this.emitStackChange(HistoryChangeCause.Undo);
				return false;
			}

			const snapshotsToRestore = entriesToRestore
				.map((entry) => entry.snapshot)
				.filter((snapshot) => snapshot !== undefined);

			if (snapshotsToRestore.length > 0) {
				entriesToRestore.forEach((entry) => {
					this.ignoreProgrammaticCreate[entry.id] = true;
					delete this.deletedFeatureIds[entry.id];
				});
				this.draw.addFeatures(snapshotsToRestore);
			}

			this.pushRedoStackEntry({
				id: entriesToRestore[0].id,
				toIndex: entriesToRestore[0].toIndex,
				action: "batch-delete",
				metadata: { entries: entriesToRestore },
			});
			this.emitStackChange(HistoryChangeCause.Undo);
			return true;
		}

		const id = undoStackEntry.id;
		const index = undoStackEntry.toIndex;

		const key = String(id);
		const stack = this.historyById[key];
		if (!stack || stack.length === 0) {
			this.emitStackChange(HistoryChangeCause.Undo);
			return false;
		}

		// Clamp index in case of any out-of-sync situations
		const currentIndex = Math.min(index, stack.length - 1);

		// If the feature currently does not exist (e.g., after a clear/delete), restore it
		const featureExists = this.draw.hasFeature(id);
		if (!featureExists) {
			const snapshotToRestore = stack[currentIndex];
			if (!snapshotToRestore) {
				this.emitStackChange(HistoryChangeCause.Undo);
				return false;
			}
			this.ignoreProgrammaticCreate[id] = true;
			delete this.deletedFeatureIds[id];
			this.draw.addFeatures([snapshotToRestore]);

			// Allow redo to re-delete the feature; do not change undo stack size here
			this.pushRedoStackEntry({
				id,
				toIndex: currentIndex,
				action: "delete",
				snapshot: snapshotToRestore,
			});
			this.emitStackChange(HistoryChangeCause.Undo);
			return true;
		}

		// If there is no previous state, the action was creation -> remove the feature
		if (currentIndex <= 0) {
			// Record redo info so we can recreate the feature
			this.pushRedoStackEntry({ id, toIndex: 0, action: "create" });

			this.ignoreProgrammaticDelete[id] = true;
			this.deletedFeatureIds[id] = true;
			this.draw.removeFeatures([id]);

			// Remove any remaining actions for this id from the undo stack
			this.undoStack = this.undoStack.filter(
				(undoAction) => undoAction.id !== id,
			);
			this.emitStackChange(HistoryChangeCause.Undo);
			return true;
		}

		// Revert to the previous geometry for this action and truncate history to that point
		const nextSnapshot = stack[currentIndex]; // the state we are undoing
		const prev = stack[currentIndex - 1];

		// Save redo info before truncating the stack
		if (nextSnapshot) {
			this.pushRedoStackEntry({
				id,
				toIndex: currentIndex,
				snapshot: nextSnapshot,
				action: "update",
			});
		}

		this.draw.updateFeatureGeometry(id, prev.geometry);
		stack.length = currentIndex; // drop the state we just undid
		this.emitStackChange(HistoryChangeCause.Undo);
		return true;
	}

	redo(): boolean {
		if (!this.canRedo()) {
			return false;
		}

		if (!this.draw) {
			return false;
		}

		const poppedRedoStackEntry = this.redoStack.pop()!;
		const { id, toIndex, snapshot, action, metadata } = poppedRedoStackEntry;

		if (action === "batch-create") {
			const entriesToCreate = metadata?.entries || [];
			if (entriesToCreate.length === 0) {
				this.emitStackChange(HistoryChangeCause.Redo);
				return false;
			}

			const snapshotsToCreate = entriesToCreate
				.map((entry) => entry.snapshot)
				.filter((restoredSnapshot) => restoredSnapshot !== undefined);

			if (snapshotsToCreate.length > 0) {
				entriesToCreate.forEach((entry) => {
					this.ignoreProgrammaticCreate[entry.id] = true;
				});
				this.draw.addFeatures(snapshotsToCreate);
			}

			this.pushUndoStackEntry({
				id: entriesToCreate[0].id,
				toIndex: entriesToCreate[0].toIndex,
				action: "batch-create",
				metadata: { entries: entriesToCreate },
			});
			this.emitStackChange(HistoryChangeCause.Redo);
			return true;
		}

		if (action === "batch-delete") {
			const entriesToDelete = metadata?.entries || [];
			if (entriesToDelete.length === 0) {
				this.emitStackChange(HistoryChangeCause.Redo);
				return false;
			}

			const idsToDelete = entriesToDelete.map((entry) => entry.id);

			idsToDelete.forEach((featureId) => {
				this.ignoreProgrammaticDelete[featureId] = true;
				this.deletedFeatureIds[featureId] = true;
			});

			this.draw.removeFeatures(idsToDelete);
			this.pushUndoStackEntry({
				id: entriesToDelete[0].id,
				toIndex: entriesToDelete[0].toIndex,
				action: "batch-delete",
				metadata: { entries: entriesToDelete },
			});
			this.emitStackChange(HistoryChangeCause.Redo);
			return true;
		}

		const key = String(id);
		const stack = this.historyById[key] || (this.historyById[key] = []);

		// If the redo action is a delete, remove the feature again
		if (action === "delete") {
			this.ignoreProgrammaticDelete[id] = true;
			this.deletedFeatureIds[id] = true;
			this.draw.removeFeatures([id]);
			// Reflect that the delete action has been reapplied by pushing back onto the undo stack
			this.pushUndoStackEntry({ id, toIndex, action: "single" });
			this.emitStackChange(HistoryChangeCause.Redo);
			return true;
		}

		if (toIndex <= 0) {
			// Redo creation - recreate the initial feature
			const initial = stack[0];
			if (!initial) {
				return false;
			}
			this.ignoreProgrammaticCreate[id] = true;
			this.draw.addFeatures([initial]);

			// Restore the action into the history stacks
			this.pushUndoStackEntry({ id, toIndex: 0, action: "single" });
			this.emitStackChange(HistoryChangeCause.Redo);
			return true;
		}

		// Redo an update - reapply the geometry and restore the snapshot in history
		const next = snapshot || stack[toIndex];
		if (!next) {
			return false;
		}

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
		this.pushUndoStackEntry({ id, toIndex, action: "single" });
		this.emitStackChange(HistoryChangeCause.Redo);
		return true;
	}

	clearHistory() {
		this.historyById = {};
		this.undoStack = [];
		this.ignoreProgrammaticCreate = {};
		this.ignoreProgrammaticDelete = {};
		this.deletedFeatureIds = {};
		this.redoStack = [];
	}

	undoSize() {
		return this.undoStack.length;
	}

	redoSize() {
		return this.redoStack.length;
	}
}
