import { TerraDrawMouseEvent } from "../common";

export const MockCursorEvent = ({
	lng,
	lat,
	button,
}: {
	lng: TerraDrawMouseEvent["lng"];
	lat: TerraDrawMouseEvent["lat"];
	button?: TerraDrawMouseEvent["button"];
}) =>
	({
		lng,
		lat,
		containerX: lng * 40,
		containerY: lat * 40,
		button: button ? button : ("left" as const),
		heldKeys: [],
	}) as TerraDrawMouseEvent;
