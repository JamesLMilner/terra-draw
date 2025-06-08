/**
 * For this specific test suite we should only ever import from the Terra Draw
 * public API, and not from the internal library code. This is to ensure that
 * a developer can write a custom adapter exclusively from the publicly exposed base
 * classes and types of the library.
 */

import { CustomStyling } from "./modes/base.mode";
import {
	GeoJSONStoreFeatures,
	GetLngLatFromEvent,
	Project,
	SetCursor,
	TerraDraw,
	TerraDrawAdapterStyling,
	TerraDrawChanges,
	TerraDrawExtend,
	TerraDrawPointMode,
	TerraDrawStylingFunction,
	Unproject,
	BehaviorConfig,
} from "./terra-draw";

const { TerraDrawBaseAdapter, TerraDrawBaseDrawMode } = TerraDrawExtend;

describe("Terra Draw", () => {
	describe("can support a custom adapter from the public interface where the", () => {
		describe("constructor", () => {
			it("initialises correctly", () => {
				const draw = new TerraDraw({
					adapter: new TerraDrawTestAdapter({
						lib: {},
						coordinatePrecision: 9,
					}),
					modes: [new TerraDrawPointMode()],
				});

				expect(draw).toBeDefined();
			});
		});

		describe("start and stop methods", () => {
			it("work as expected", () => {
				const draw = new TerraDraw({
					adapter: new TerraDrawTestAdapter({
						lib: {},
						coordinatePrecision: 9,
					}),
					modes: [new TerraDrawPointMode()],
				});

				draw.start();

				expect(draw.enabled).toEqual(true);

				draw.stop();

				expect(draw.enabled).toEqual(false);
			});
		});
	});

	describe("can support a custom draw mode from the public interface where the", () => {
		describe("constructor", () => {
			it("initialises correctly", () => {
				const mode = new TerraDrawTestMode({
					customProperty: "custom",
				});

				expect(mode).toBeDefined();
			});
		});

		describe("start and stop methods", () => {
			it("work as expected", () => {
				const draw = new TerraDraw({
					adapter: new TerraDrawTestAdapter({
						lib: {},
						coordinatePrecision: 9,
					}),
					modes: [new TerraDrawTestMode()],
				});

				draw.start();

				expect(draw.enabled).toEqual(true);

				draw.stop();

				expect(draw.enabled).toEqual(false);
			});
		});
	});
});

/**
 * A mock implementation of a custom adapter - this is to ensure that it is possible to write
 * custom adapters for Terra Draw exclusively relying on the public API of the library.
 */
export class TerraDrawTestAdapter extends TerraDrawBaseAdapter {
	constructor(
		config: {
			lib: Record<string, unknown>;
		} & TerraDrawExtend.BaseAdapterConfig,
	) {
		super(config);
	}

	public getMapEventElement(): HTMLElement {
		return {
			addEventListener: () => {
				//
			},
			removeEventListener: () => {
				//
			},
		} as unknown as HTMLElement;
	}
	public clear(): void {
		if (this._currentModeCallbacks) {
			this._currentModeCallbacks.onClear();
		}
	}

	public project(lng: number, lat: number): ReturnType<Project> {
		return { x: lng, y: lat };
	}
	public unproject(x: number, y: number): ReturnType<Unproject> {
		return { lng: x, lat: y };
	}
	public setCursor(
		_:
			| "move"
			| "unset"
			| "grab"
			| "grabbing"
			| "crosshair"
			| "pointer"
			| "wait",
	): ReturnType<SetCursor> {
		// pass
	}
	public getLngLatFromEvent(
		_: PointerEvent | MouseEvent,
	): ReturnType<GetLngLatFromEvent> {
		return { lng: 0, lat: 0 };
	}
	public setDraggability(_: boolean): void {
		// pass
	}
	public setDoubleClickToZoom(_: boolean): void {
		// pass
	}
	public render(_1: TerraDrawChanges, _2: TerraDrawStylingFunction): void {
		// pass
	}

	public register(callbacks: TerraDrawExtend.TerraDrawCallbacks): void {
		this._currentModeCallbacks = callbacks;
	}

	public unregister(): void {
		super.unregister();
	}
}

/**
 * A mock implementation for a custom draw mode - this is to ensure that it is possible to write
 * custom draw modes for Terra Draw exclusively relying on the public API of the library.
 */

interface TerraDrawTestModeOptions<T extends CustomStyling>
	extends TerraDrawExtend.BaseModeOptions<T> {
	customProperty: string;
}

interface TestModeStyling extends CustomStyling {
	fillColor: TerraDrawExtend.HexColorStyling;
	outlineWidth: TerraDrawExtend.NumericStyling;
}

class TerraDrawTestMode extends TerraDrawBaseDrawMode<TestModeStyling> {
	private customProperty: string;

	constructor(options?: TerraDrawTestModeOptions<TestModeStyling>) {
		super(options);

		this.customProperty = options?.customProperty ?? "default";
	}

	styleFeature(_: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		return {
			polygonFillColor: "#3f97e0",
			polygonOutlineColor: "#3f97e0",
			polygonOutlineWidth: 4,
			polygonFillOpacity: 0.3,
			pointColor: "#B90E0A",
			pointOutlineColor: "#ffffff",
			pointOutlineWidth: 2,
			pointWidth: 5,
			lineStringColor: "#B90E0A",
			lineStringWidth: 4,
			zIndex: 0,
		};
	}

	registerBehaviors(_: BehaviorConfig): void {
		// pass
	}

	start(): void {
		throw new Error("Method not implemented.");
	}
	stop(): void {
		throw new Error("Method not implemented.");
	}
	cleanUp(): void {
		throw new Error("Method not implemented.");
	}
}
