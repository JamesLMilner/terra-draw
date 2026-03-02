import { TerraDrawKeyboardEvent } from "../common";
import {
	matchesShortcut,
	TerraDrawUndoRedoKeyboardShortcuts,
} from "./keyboard-shortcuts";

describe("keyboard-shortcuts", () => {
	const createKeyboardEvent = (
		key: string,
		heldKeys: string[],
	): TerraDrawKeyboardEvent => ({
		key,
		heldKeys,
		preventDefault: jest.fn(),
	});

	describe("matchesShortcut", () => {
		it("matches key and held keys regardless of case and order", () => {
			const keyboardEvent = createKeyboardEvent("Z", ["Shift", "Meta"]);

			expect(
				matchesShortcut(keyboardEvent, {
					key: "z",
					heldKeys: ["meta", "shift"],
				}),
			).toBe(true);
		});

		it("ignores duplicate key entries in held keys", () => {
			const keyboardEvent = createKeyboardEvent("z", ["z", "Control"]);

			expect(
				matchesShortcut(keyboardEvent, {
					key: "z",
					heldKeys: ["control"],
				}),
			).toBe(true);
		});

		it("returns false when the key does not match", () => {
			const keyboardEvent = createKeyboardEvent("y", ["control"]);

			expect(
				matchesShortcut(keyboardEvent, {
					key: "z",
					heldKeys: ["control"],
				}),
			).toBe(false);
		});

		it("returns false when held key set differs", () => {
			const keyboardEvent = createKeyboardEvent("z", ["meta"]);

			expect(
				matchesShortcut(keyboardEvent, {
					key: "z",
					heldKeys: ["meta", "shift"],
				}),
			).toBe(false);
		});
	});

	describe("TerraDrawUndoRedoKeyboardShortcuts", () => {
		it("recognizes default undo shortcuts", () => {
			const keyboardShortcuts = new TerraDrawUndoRedoKeyboardShortcuts();

			expect(
				keyboardShortcuts.isUndoKeyboardShortcut(
					createKeyboardEvent("z", ["meta"]),
				),
			).toBe(true);
			expect(
				keyboardShortcuts.isUndoKeyboardShortcut(
					createKeyboardEvent("z", ["control"]),
				),
			).toBe(true);
			expect(
				keyboardShortcuts.isUndoKeyboardShortcut(
					createKeyboardEvent("z", ["meta", "shift"]),
				),
			).toBe(false);
		});

		it("recognizes default redo shortcuts", () => {
			const keyboardShortcuts = new TerraDrawUndoRedoKeyboardShortcuts();

			expect(
				keyboardShortcuts.isRedoKeyboardShortcut(
					createKeyboardEvent("z", ["meta", "shift"]),
				),
			).toBe(true);
			expect(
				keyboardShortcuts.isRedoKeyboardShortcut(
					createKeyboardEvent("z", ["control", "shift"]),
				),
			).toBe(true);
			expect(
				keyboardShortcuts.isRedoKeyboardShortcut(
					createKeyboardEvent("y", ["control"]),
				),
			).toBe(true);
			expect(
				keyboardShortcuts.isRedoKeyboardShortcut(
					createKeyboardEvent("z", ["control"]),
				),
			).toBe(false);
		});

		it("uses configured custom shortcuts", () => {
			const keyboardShortcuts = new TerraDrawUndoRedoKeyboardShortcuts({
				undo: [{ key: "u", heldKeys: ["alt"] }],
				redo: [{ key: "r", heldKeys: ["alt", "shift"] }],
			});

			expect(
				keyboardShortcuts.isUndoKeyboardShortcut(
					createKeyboardEvent("u", ["alt"]),
				),
			).toBe(true);
			expect(
				keyboardShortcuts.isRedoKeyboardShortcut(
					createKeyboardEvent("r", ["alt", "shift"]),
				),
			).toBe(true);

			expect(
				keyboardShortcuts.isUndoKeyboardShortcut(
					createKeyboardEvent("z", ["meta"]),
				),
			).toBe(false);
			expect(
				keyboardShortcuts.isRedoKeyboardShortcut(
					createKeyboardEvent("y", ["control"]),
				),
			).toBe(false);
		});
	});
});
