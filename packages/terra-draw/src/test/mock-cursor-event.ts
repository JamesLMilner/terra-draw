import { TerraDrawMouseEvent } from "../common";

export const MockCursorEvent = ({
	lng,
	lat,
	button,
	isContextMenu,
}: {
	lng: TerraDrawMouseEvent["lng"];
	lat: TerraDrawMouseEvent["lat"];
	button?: TerraDrawMouseEvent["button"];
	isContextMenu?: TerraDrawMouseEvent["isContextMenu"];
}) =>
	({
		lng,
		lat,
		containerX: lng * 40,
		containerY: lat * 40,
		button: button ? button : ("left" as const),
		heldKeys: [],
		isContextMenu: isContextMenu ? isContextMenu : false,
	}) as TerraDrawMouseEvent;
