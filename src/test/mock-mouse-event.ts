import { TerraDrawMouseEvent } from "../common";

export const mockDrawEvent = (partial?: Partial<TerraDrawMouseEvent>) =>
	({
		lng: 0,
		lat: 0,
		containerX: 0,
		containerY: 0,
		button: "left",
		heldKeys: [],
		...partial,
	}) as TerraDrawMouseEvent;
