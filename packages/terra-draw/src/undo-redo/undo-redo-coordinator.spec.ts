import { TerraDrawModeUndoRedoInterface } from "./mode-undo-redo";
import { TerraDrawUndoRedoCoordinator } from "./undo-redo-coordinator";

describe("TerraDrawUndoRedoCoordinator", () => {
	let shouldPreferDrawing = true;

	beforeEach(() => {
		shouldPreferDrawing = true;
	});

	const createDrawingUndoRedo = () => {
		const drawingUndoRedo = {
			register: jest.fn(),
			canUndo: jest.fn(() => false),
			canRedo: jest.fn(() => false),
			undo: jest.fn(() => false),
			redo: jest.fn(() => false),
			undoSize: jest.fn(() => 0),
			redoSize: jest.fn(() => 0),
			getHistorySizes: jest.fn(() => ({ undoSize: 0, redoSize: 0 })),
			emitPushIfHistoryChangedFromLastSnapshot: jest.fn(),
			emitPushIfHistoryChanged: jest.fn(),
			emitHistoryChange: jest.fn(),
		};

		return drawingUndoRedo;
	};

	const createSessionUndoRedo = () => {
		const sessionUndoRedo = {
			register: jest.fn(),
			undo: jest.fn(() => true),
			redo: jest.fn(() => true),
			canUndo: jest.fn(() => false),
			canRedo: jest.fn(() => false),
			undoSize: jest.fn(() => 0),
			redoSize: jest.fn(() => 0),
		};

		return sessionUndoRedo;
	};

	it("prefers drawing undo while drawing when both stacks can undo", () => {
		const drawingUndoRedo = createDrawingUndoRedo();
		drawingUndoRedo.canUndo.mockReturnValue(true);
		drawingUndoRedo.undo.mockReturnValue(true);

		const sessionUndoRedo = createSessionUndoRedo();
		sessionUndoRedo.canUndo.mockReturnValue(true);

		const coordinator = new TerraDrawUndoRedoCoordinator({
			mode: drawingUndoRedo,
			session: sessionUndoRedo,
			shouldPreferMode: () => shouldPreferDrawing,
		});

		expect(coordinator.undo()).toBe(true);
		expect(drawingUndoRedo.undo).toHaveBeenCalledTimes(1);
		expect(sessionUndoRedo.undo).not.toHaveBeenCalled();
	});

	it("falls back to session undo when drawing cannot undo", () => {
		const drawingUndoRedo = createDrawingUndoRedo();
		drawingUndoRedo.canUndo.mockReturnValue(false);

		const sessionUndoRedo = createSessionUndoRedo();
		sessionUndoRedo.canUndo.mockReturnValue(true);

		const coordinator = new TerraDrawUndoRedoCoordinator({
			mode: drawingUndoRedo,
			session: sessionUndoRedo,
			shouldPreferMode: () => shouldPreferDrawing,
		});

		expect(coordinator.undo()).toBe(true);
		expect(sessionUndoRedo.undo).toHaveBeenCalledTimes(1);
		expect(drawingUndoRedo.undo).not.toHaveBeenCalled();
	});

	it("uses session undo outside drawing mode even when drawing can undo", () => {
		shouldPreferDrawing = false;

		const drawingUndoRedo = createDrawingUndoRedo();
		drawingUndoRedo.canUndo.mockReturnValue(true);

		const sessionUndoRedo = createSessionUndoRedo();
		sessionUndoRedo.canUndo.mockReturnValue(true);

		const coordinator = new TerraDrawUndoRedoCoordinator({
			mode: drawingUndoRedo,
			session: sessionUndoRedo,
			shouldPreferMode: () => shouldPreferDrawing,
		});

		expect(coordinator.undo()).toBe(true);
		expect(sessionUndoRedo.undo).toHaveBeenCalledTimes(1);
		expect(drawingUndoRedo.undo).not.toHaveBeenCalled();
	});

	it("prefers drawing redo while drawing when both stacks can redo", () => {
		const drawingUndoRedo = createDrawingUndoRedo();
		drawingUndoRedo.canRedo.mockReturnValue(true);
		drawingUndoRedo.redo.mockReturnValue(true);

		const sessionUndoRedo = createSessionUndoRedo();
		sessionUndoRedo.canRedo.mockReturnValue(true);

		const coordinator = new TerraDrawUndoRedoCoordinator({
			mode: drawingUndoRedo,
			session: sessionUndoRedo,
			shouldPreferMode: () => shouldPreferDrawing,
		});

		expect(coordinator.redo()).toBe(true);
		expect(drawingUndoRedo.redo).toHaveBeenCalledTimes(1);
		expect(sessionUndoRedo.redo).not.toHaveBeenCalled();
	});

	it("reports canUndo and canRedo based on arbitration policy", () => {
		const drawingUndoRedo = createDrawingUndoRedo();
		drawingUndoRedo.canUndo.mockReturnValue(false);
		drawingUndoRedo.canRedo.mockReturnValue(true);

		const sessionUndoRedo = createSessionUndoRedo();
		sessionUndoRedo.canUndo.mockReturnValue(true);
		sessionUndoRedo.canRedo.mockReturnValue(false);

		const coordinator = new TerraDrawUndoRedoCoordinator({
			mode: drawingUndoRedo,
			session: sessionUndoRedo,
			shouldPreferMode: () => shouldPreferDrawing,
		});

		expect(coordinator.canUndo()).toBe(true);
		expect(coordinator.canRedo()).toBe(true);
	});

	it("returns false when no stack can perform undo or redo", () => {
		const drawingUndoRedo = createDrawingUndoRedo();
		drawingUndoRedo.canUndo.mockReturnValue(false);
		drawingUndoRedo.canRedo.mockReturnValue(false);

		const sessionUndoRedo = createSessionUndoRedo();
		sessionUndoRedo.canUndo.mockReturnValue(false);
		sessionUndoRedo.canRedo.mockReturnValue(false);

		const coordinator = new TerraDrawUndoRedoCoordinator({
			mode: drawingUndoRedo,
			session: sessionUndoRedo,
			shouldPreferMode: () => shouldPreferDrawing,
		});

		expect(coordinator.canUndo()).toBe(false);
		expect(coordinator.canRedo()).toBe(false);
		expect(coordinator.undo()).toBe(false);
		expect(coordinator.redo()).toBe(false);
	});

	it("maps drawing history changes to normalized history events", () => {
		const onHistoryChange = jest.fn();

		const coordinator = new TerraDrawUndoRedoCoordinator({
			shouldPreferMode: () => shouldPreferDrawing,
			onHistoryChange,
		});

		coordinator.emitStackHistoryChange({
			cause: "push",
			stack: "mode",
			undoStackSize: 3,
			redoStackSize: 1,
		});

		expect(onHistoryChange).toHaveBeenCalledWith({
			cause: "push",
			stack: "mode",
			undoSize: 3,
			redoSize: 1,
		});
	});

	it("maps session history changes to normalized history events", () => {
		const onHistoryChange = jest.fn();

		const coordinator = new TerraDrawUndoRedoCoordinator({
			shouldPreferMode: () => shouldPreferDrawing,
			onHistoryChange,
		});

		coordinator.emitStackHistoryChange({
			cause: "undo",
			stack: "session",
			undoStackSize: 2,
			redoStackSize: 4,
		});

		expect(onHistoryChange).toHaveBeenCalledWith({
			cause: "undo",
			stack: "session",
			undoSize: 2,
			redoSize: 4,
		});
	});

	it("does not emit history events when emission predicate returns false", () => {
		const onHistoryChange = jest.fn();

		const coordinator = new TerraDrawUndoRedoCoordinator({
			shouldPreferMode: () => shouldPreferDrawing,
			onHistoryChange,
			shouldEmitHistoryChange: () => false,
		});

		coordinator.emitStackHistoryChange({
			cause: "redo",
			stack: "mode",
			undoStackSize: 1,
			redoStackSize: 0,
		});

		coordinator.emitStackHistoryChange({
			cause: "push",
			stack: "session",
			undoStackSize: 5,
			redoStackSize: 2,
		});

		expect(onHistoryChange).not.toHaveBeenCalled();
	});

	it("emits session push after finish when session undo/redo is present", () => {
		const drawingUndoRedo = createDrawingUndoRedo();
		const sessionUndoRedo = createSessionUndoRedo();
		sessionUndoRedo.undoSize.mockReturnValue(2);
		sessionUndoRedo.redoSize.mockReturnValue(1);

		const onHistoryChange = jest.fn();
		const coordinator = new TerraDrawUndoRedoCoordinator({
			mode: drawingUndoRedo,
			session: sessionUndoRedo,
			shouldPreferMode: () => shouldPreferDrawing,
			onHistoryChange,
		});

		coordinator.emitPushAfterFinish();

		expect(onHistoryChange).toHaveBeenCalledWith({
			cause: "push",
			stack: "session",
			undoSize: 2,
			redoSize: 1,
		});
		expect(drawingUndoRedo.emitHistoryChange).not.toHaveBeenCalled();
	});

	it("emits drawing push after finish when session undo/redo is absent", () => {
		const drawingUndoRedo = createDrawingUndoRedo();
		drawingUndoRedo.undoSize.mockReturnValue(4);
		drawingUndoRedo.redoSize.mockReturnValue(2);
		const onHistoryChange = jest.fn();

		const coordinator = new TerraDrawUndoRedoCoordinator({
			mode: drawingUndoRedo,
			shouldPreferMode: () => shouldPreferDrawing,
			onHistoryChange,
		});

		coordinator.emitPushAfterFinish();

		expect(onHistoryChange).toHaveBeenCalledWith({
			cause: "push",
			stack: "mode",
			undoSize: 4,
			redoSize: 2,
		});
		expect(drawingUndoRedo.emitHistoryChange).not.toHaveBeenCalled();
	});
});
