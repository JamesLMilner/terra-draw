import { TerraDrawKeyboardEvent } from "../common";

export const MockKeyboardEvent = ({
	key,
	heldKeys,
}: {
	key: TerraDrawKeyboardEvent["key"];
	heldKeys?: TerraDrawKeyboardEvent["heldKeys"];
}) =>
	({
		key,
		preventDefault: jest.fn(),
		heldKeys: heldKeys ? heldKeys : [],
	}) as TerraDrawKeyboardEvent;
