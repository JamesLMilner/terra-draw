import { TerraDrawOnChangeContext } from "../common";
import { GeoJSONStore } from "../store/store";

export function MockModeConfig(mode: string) {
	return {
		mode,
		store: new GeoJSONStore<TerraDrawOnChangeContext | undefined>(),
		setCursor: jest.fn(),
		onChange: jest.fn(),
		onSelect: jest.fn(),
		onDeselect: jest.fn(),
		project: jest.fn((lng, lat) => ({ x: lng * 40, y: lat * 40 })),
		unproject: jest.fn((x, y) => ({ lng: x / 40, lat: y / 40 })),
		setDoubleClickToZoom: jest.fn(),
		onFinish: jest.fn(),
		coordinatePrecision: 9,
		projection: "web-mercator",
	};
}
