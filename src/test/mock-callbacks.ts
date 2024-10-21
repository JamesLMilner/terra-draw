import { TerraDrawCallbacks } from "../common";

export const MockCallbacks = (
	overrides?: Partial<TerraDrawCallbacks>,
): TerraDrawCallbacks => ({
	getState: jest.fn(),
	onKeyUp: jest.fn(),
	onKeyDown: jest.fn(),
	onClick: jest.fn(),
	onMouseMove: jest.fn(),
	onDragStart: jest.fn(),
	onDrag: jest.fn(),
	onDragEnd: jest.fn(),
	onClear: jest.fn(),
	onReady: jest.fn(),
	...overrides,
});
