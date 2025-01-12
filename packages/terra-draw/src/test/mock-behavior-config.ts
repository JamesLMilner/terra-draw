import { BehaviorConfig } from "../modes/base.behavior";
import { GeoJSONStore } from "../store/store";

export const MockBehaviorConfig = (
	mode: string,
	projection?: "web-mercator" | "globe",
) =>
	({
		store: new GeoJSONStore(),
		mode,
		project: jest.fn((lng, lat) => ({ x: lng * 40, y: lat * 40 })),
		unproject: jest.fn((x, y) => ({ lng: x / 40, lat: y / 40 })),
		pointerDistance: 40,
		coordinatePrecision: 9,
		projection: projection ? projection : "web-mercator",
	}) as BehaviorConfig;
