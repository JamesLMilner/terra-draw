import { TerraDrawKeyboardEvent } from "../common";

type UndoRedoKeyboardShortcut = {
	key: KeyboardEvent["key"];
	heldKeys: KeyboardEvent["key"][];
};

export interface TerraDrawUndoRedoKeyboardShortcutsInterface {
	isUndoKeyboardShortcut(event: TerraDrawKeyboardEvent): boolean;
	isRedoKeyboardShortcut(event: TerraDrawKeyboardEvent): boolean;
}

export const defaultUndoKeyboardShortcuts: UndoRedoKeyboardShortcut[] = [
	{ key: "z", heldKeys: ["meta"] },
	{ key: "z", heldKeys: ["control"] },
];

export const defaultRedoKeyboardShortcuts: UndoRedoKeyboardShortcut[] = [
	{ key: "z", heldKeys: ["meta", "shift"] },
	{ key: "z", heldKeys: ["control", "shift"] },
	{ key: "y", heldKeys: ["control"] },
];

export const matchesShortcut = (
	event: TerraDrawKeyboardEvent,
	shortcut: UndoRedoKeyboardShortcut,
) => {
	const normalizedKey = event.key.toLowerCase();
	const normalizedHeldKeys = new Set(
		event.heldKeys
			.map((heldKey) => heldKey.toLowerCase())
			.filter((heldKey) => heldKey !== normalizedKey),
	);

	const shortcutKey = shortcut.key.toLowerCase();
	if (shortcutKey !== normalizedKey) {
		return false;
	}

	const normalizedShortcutHeldKeys = new Set(
		shortcut.heldKeys.map((shortcutHeldKey) => shortcutHeldKey.toLowerCase()),
	);

	if (normalizedHeldKeys.size !== normalizedShortcutHeldKeys.size) {
		return false;
	}

	for (const shortcutHeldKey of normalizedShortcutHeldKeys) {
		if (!normalizedHeldKeys.has(shortcutHeldKey)) {
			return false;
		}
	}

	return true;
};

export class TerraDrawUndoRedoKeyboardShortcuts
	implements TerraDrawUndoRedoKeyboardShortcutsInterface
{
	private undoKeyboardShortcuts: UndoRedoKeyboardShortcut[];
	private redoKeyboardShortcuts: UndoRedoKeyboardShortcut[];

	constructor(options?: {
		undo?: UndoRedoKeyboardShortcut[];
		redo?: UndoRedoKeyboardShortcut[];
	}) {
		this.undoKeyboardShortcuts = options?.undo ?? defaultUndoKeyboardShortcuts;
		this.redoKeyboardShortcuts = options?.redo ?? defaultRedoKeyboardShortcuts;
	}

	isUndoKeyboardShortcut(event: TerraDrawKeyboardEvent): boolean {
		return this.undoKeyboardShortcuts.some((shortcut) =>
			matchesShortcut(event, shortcut),
		);
	}

	isRedoKeyboardShortcut(event: TerraDrawKeyboardEvent): boolean {
		return this.redoKeyboardShortcuts.some((shortcut) =>
			matchesShortcut(event, shortcut),
		);
	}
}
