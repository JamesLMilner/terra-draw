import { GeoJSONStore } from "../store/store";

export function getMockModeConfig(mode: string) {
	return {
		mode,
		store: new GeoJSONStore(),
		setCursor: jest.fn(),
		onChange: jest.fn(),
		onSelect: jest.fn(),
		onDeselect: jest.fn(),
		project: jest.fn(),
		unproject: jest.fn(),
		setDoubleClickToZoom: jest.fn(),
		onFinish: jest.fn(),
		coordinatePrecision: 9,
	};
}
