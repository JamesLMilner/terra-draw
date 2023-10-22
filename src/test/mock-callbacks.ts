import { TerraDrawCallbacks } from "../common";

export const createMockCallbacks = (
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
	...overrides,
});
