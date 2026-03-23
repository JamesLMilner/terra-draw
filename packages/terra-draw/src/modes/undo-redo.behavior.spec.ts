import { UndoRedoBehavior } from "./undo-redo.behavior";

describe("UndoRedoBehavior", () => {
	it("limits undo history to maxStackSize", () => {
		const behavior = new UndoRedoBehavior<number[]>({
			maxStackSize: 2,
		});

		behavior.recordSnapshot({
			featureCoordinates: [0],
			currentCoordinate: 0,
		});
		behavior.recordSnapshot({
			featureCoordinates: [1],
			currentCoordinate: 1,
		});
		behavior.recordSnapshot({
			featureCoordinates: [2],
			currentCoordinate: 2,
		});

		expect(behavior.undoSize()).toBe(2);
		expect(behavior.redoSize()).toBe(0);

		const firstUndoResult = behavior.beginUndo();
		expect(firstUndoResult?.undoneEntry.currentCoordinate).toBe(2);

		const secondUndoResult = behavior.beginUndo();
		expect(secondUndoResult?.undoneEntry.currentCoordinate).toBe(1);

		expect(behavior.beginUndo()).toBeUndefined();
	});

	it("limits redo history to maxStackSize", () => {
		const behavior = new UndoRedoBehavior<number[]>({
			maxStackSize: 2,
		});

		behavior.recordSnapshot({
			featureCoordinates: [0],
			currentCoordinate: 0,
		});
		behavior.recordSnapshot({
			featureCoordinates: [1],
			currentCoordinate: 1,
		});
		behavior.recordSnapshot({
			featureCoordinates: [2],
			currentCoordinate: 2,
		});

		behavior.beginUndo();
		behavior.beginUndo();
		behavior.beginUndo();

		expect(behavior.redoSize()).toBe(2);
		expect(behavior.takeRedo()?.currentCoordinate).toBe(1);
		expect(behavior.takeRedo()?.currentCoordinate).toBe(2);
		expect(behavior.takeRedo()).toBeUndefined();
	});

	it("supports updating maxStackSize after construction", () => {
		const behavior = new UndoRedoBehavior<number[]>();

		behavior.recordSnapshot({
			featureCoordinates: [0],
			currentCoordinate: 0,
		});
		behavior.recordSnapshot({
			featureCoordinates: [1],
			currentCoordinate: 1,
		});
		behavior.recordSnapshot({
			featureCoordinates: [2],
			currentCoordinate: 2,
		});

		behavior.setMaxStackSize(1);

		expect(behavior.undoSize()).toBe(1);
		expect(behavior.beginUndo()?.undoneEntry.currentCoordinate).toBe(2);
		expect(behavior.beginUndo()).toBeUndefined();
	});
});
