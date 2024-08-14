import { GeoJSONStore } from "../store/store";

export function getMockModeConfig(mode: string) {
	return {
		mode,
		store: new GeoJSONStore(),
		setCursor: jest.fn(),
		onChange: jest.fn(),
		onSelect: jest.fn(),
		onDeselect: jest.fn(),
		project: jest.fn((lng, lat) => ({ x: lng, y: lat })),
		unproject: jest.fn((x, y) => ({ lng: x, lat: y })),
		setDoubleClickToZoom: jest.fn(),
		onFinish: jest.fn(),
		coordinatePrecision: 9,
		projection: "web-mercator",
	};
}
