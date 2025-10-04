import {
	Project,
	Unproject,
	SetCursor,
	GetLngLatFromEvent,
	TerraDrawChanges,
	TerraDrawStylingFunction,
	TerraDrawAdapterStyling,
} from "../common";
import {
	TerraDrawBaseAdapter,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../extend";
import {
	TerraDrawExtend,
	GeoJSONStoreFeatures,
	BehaviorConfig,
} from "../terra-draw";

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

export class TerraDrawTestMode extends TerraDrawBaseDrawMode<TestModeStyling> {
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
