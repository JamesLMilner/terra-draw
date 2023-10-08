import { BehaviorConfig } from "../modes/base.behavior";
import { GeoJSONStore } from "../store/store";

export const mockBehaviorConfig = (mode: string) =>
	({
		store: new GeoJSONStore(),
		mode,
		project: jest.fn(),
		unproject: jest.fn(),
		pointerDistance: 40,
		coordinatePrecision: 9,
	}) as BehaviorConfig;
