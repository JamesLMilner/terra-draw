import { BehaviorConfig } from "../modes/base.behavior";
import { GeoJSONStore } from "../store/store";

export const mockBehaviorConfig = (mode: string) =>
	({
		store: new GeoJSONStore(),
		mode,
		project: jest.fn((lng, lat) => ({ x: lng, y: lat })),
		unproject: jest.fn((x, y) => ({ lng: x, lat: y })),
		pointerDistance: 40,
		coordinatePrecision: 9,
		projection: "web-mercator",
	}) as BehaviorConfig;
