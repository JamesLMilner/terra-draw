import { FeatureId } from "./extend";
import { GeoJSONStoreFeatures, TerraDraw } from "./terra-draw";

export const setupUndoRedo = (
	draw: TerraDraw,
	options?: {
		onStackChange?: (undoStackSize: number, redoStackSize: number) => void;
	},
) => {
	const onStackChange =
		options?.onStackChange ||
		((_undoStackSize: number, _redoStackSize: number) => {
			/* no-op */
		});

	// Keep per-feature history and a global action stack to support undo across multiple features
	const historyById: { [key: string]: GeoJSONStoreFeatures[] } = {};
	const actionStack: FeatureId[] = [];

	// Record a snapshot after each finished operation
	// Track the per-action history index alongside the feature id
	const actionIndexStack: number[] = [];

	const ignoreProgrammaticDelete: Record<FeatureId, boolean> = {};

	// Stack of undone actions we can reapply
	const redoStack: {
		id: FeatureId;
		toIndex: number;
		snapshot?: GeoJSONStoreFeatures;
		action?: "create" | "update" | "delete" | "restore";
	}[] = [];

	draw.on("change", (ids: FeatureId[] | FeatureId, type, context) => {
		if (type !== "delete") {
			return;
		}

		let recorded = false;
		const deleted = Array.isArray(ids) ? ids : [ids];
		for (const id of deleted) {
			const key = String(id);

			// Skip deletes we initiated during undo/redo
			if (ignoreProgrammaticDelete[id]) {
				delete ignoreProgrammaticDelete[id];
				continue;
			}

			// We only care about features we have history for (i.e., user-created/editable features)
			if (!historyById[key]) {
				continue;
			}

			// Treat deletes (including clear) as actions that can be undone by re-adding the last snapshot
			const lastIndex = historyById[key].length - 1;
			if (lastIndex >= 0) {
				actionStack.push(id);
				actionIndexStack.push(lastIndex);
				recorded = true;
			}
		}

		// Any new user-driven delete should invalidate the redo history
		if (recorded) {
			redoStack.length = 0;
			onStackChange(actionStack.length, redoStack.length);
		}
	});

	draw.on("finish", (ids: FeatureId[] | FeatureId) => {
		const changed = Array.isArray(ids) ? ids : [ids];
		for (const id of changed) {
			if (!id) continue;

			const key = String(id);

			const feature = draw.getSnapshotFeature(id);
			if (!feature) continue;

			if (!historyById[key]) historyById[key] = [];
			historyById[key].push(feature);

			// Record both the id and the index in that feature's history for robust undo
			actionStack.push(id);
			actionIndexStack.push(historyById[key].length - 1);
			onStackChange(actionStack.length, redoStack.length);
		}

		// Any new finished action invalidates the redo history
		redoStack.length = 0;
	});

	const undo = () => {
		if (actionStack.length === 0) return;

		const id = actionStack.pop() as FeatureId;
		const index = actionIndexStack.pop() as number | undefined;
		onStackChange(actionStack.length, redoStack.length);
		if (index === undefined) return;

		const key = String(id);
		const stack = historyById[key];
		if (!stack || stack.length === 0) return;

		// Clamp index in case of any out-of-sync situations
		const currentIndex = Math.min(index, stack.length - 1);

		// If the feature currently does not exist (e.g., after a clear/delete), restore it
		const featureExists = draw.hasFeature(id);
		if (!featureExists) {
			const snapshotToRestore = stack[currentIndex];
			if (!snapshotToRestore) return;
			draw.addFeatures([snapshotToRestore]);

			// Allow redo to re-delete the feature; do not change undo stack size here
			redoStack.push({
				id,
				toIndex: currentIndex,
				action: "delete",
				snapshot: snapshotToRestore,
			});
			onStackChange(actionStack.length, redoStack.length);
			return;
		}

		// If there is no previous state, the action was creation -> remove the feature
		if (currentIndex <= 0) {
			// Record redo info so we can recreate the feature
			redoStack.push({ id, toIndex: 0, action: "create" });
			onStackChange(actionStack.length, redoStack.length);

			ignoreProgrammaticDelete[id] = true;
			draw.removeFeatures([id]);

			// Remove any remaining actions for this id from both stacks
			for (let i = actionStack.length - 1; i >= 0; i--) {
				if (actionStack[i] === id) {
					actionStack.splice(i, 1);
					actionIndexStack.splice(i, 1);
					onStackChange(actionStack.length, redoStack.length);
				}
			}
			return;
		}

		// Revert to the previous geometry for this action and truncate history to that point
		const nextSnapshot = stack[currentIndex]; // the state we are undoing
		const prev = stack[currentIndex - 1];

		// Save redo info before truncating the stack
		if (nextSnapshot) {
			redoStack.push({
				id,
				toIndex: currentIndex,
				snapshot: nextSnapshot,
				action: "update",
			});
			onStackChange(actionStack.length, redoStack.length);
		}

		draw.updateFeatureGeometry(id, prev.geometry);
		stack.length = currentIndex; // drop the state we just undid
	};

	const redo = () => {
		if (redoStack.length === 0) return;

		const { id, toIndex, snapshot, action } = redoStack.pop()!;
		const key = String(id);
		const stack = historyById[key] || (historyById[key] = []);

		// If the redo action is a delete, remove the feature again
		if (action === "delete") {
			ignoreProgrammaticDelete[id] = true;
			draw.removeFeatures([id]);
			// Reflect that the delete action has been reapplied by pushing back onto the undo stack
			actionStack.push(id);
			actionIndexStack.push(toIndex);
			onStackChange(actionStack.length, redoStack.length);
			return;
		}

		// If the redo action is to restore (undo a delete), re-add the snapshot
		if (action === "restore") {
			const next = snapshot || stack[toIndex];
			if (!next) return;
			draw.addFeatures([next]);
			// Reflect that the restore has been reapplied by pushing back onto the undo stack
			actionStack.push(id);
			actionIndexStack.push(toIndex);
			onStackChange(actionStack.length, redoStack.length);
			return;
		}

		if (toIndex <= 0) {
			// Redo creation - recreate the initial feature
			const initial = stack[0];
			if (!initial) return;
			draw.addFeatures([initial]);

			// Restore the action into the history stacks
			actionStack.push(id);
			actionIndexStack.push(0);
			onStackChange(actionStack.length, redoStack.length);
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

		draw.updateFeatureGeometry(id, next.geometry);

		// Restore the action into the history stacks so it can be undone again
		actionStack.push(id);
		actionIndexStack.push(toIndex);
		onStackChange(actionStack.length, redoStack.length);
	};

	return {
		undo,
		redo,
	};
};
