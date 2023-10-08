export const getMockPointerEvent = () =>
	({
		bubbles: true,
		cancelable: true,
		clientX: 0,
		clientY: 0,
		button: 0,
		buttons: 1,
		pointerId: 1,
		pointerType: "mouse",
		isPrimary: true,
	}) as PointerEvent;
