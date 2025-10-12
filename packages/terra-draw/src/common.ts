import { LineString, Polygon, Position } from "geojson";
import {
	StoreChangeHandler,
	GeoJSONStore,
	GeoJSONStoreFeatures,
	FeatureId,
} from "./store/store";

export type HexColor = `#${string}`;

export type HexColorStyling =
	| HexColor
	| ((feature: GeoJSONStoreFeatures) => HexColor);

export type NumericStyling =
	| number
	| ((feature: GeoJSONStoreFeatures) => number);

export type UrlStyling = string | ((feature: GeoJSONStoreFeatures) => string);

export interface TerraDrawAdapterStyling {
	pointColor: HexColor;
	pointWidth: number;
	pointOutlineColor: HexColor;
	pointOutlineWidth: number;
	polygonFillColor: HexColor;
	polygonFillOpacity: number;
	polygonOutlineColor: HexColor;
	polygonOutlineWidth: number;
	lineStringWidth: number;
	lineStringColor: HexColor;
	zIndex: number;
	markerUrl?: string;
	markerHeight?: number;
	markerWidth?: number;
}

export type CartesianPoint = { x: number; y: number };

// Neither buttons nor touch/pen contact changed since last event	-1
// Mouse move with no buttons pressed, Pen moved while hovering with no buttons pressed	—
// Left Mouse, Touch Contact, Pen contact	0
// Middle Mouse	1
// Right Mouse, Pen barrel button	2
export interface TerraDrawMouseEvent {
	lng: number;
	lat: number;
	containerX: number;
	containerY: number;
	button: "neither" | "left" | "middle" | "right";
	heldKeys: string[];
	isContextMenu: boolean;
}

export interface TerraDrawKeyboardEvent {
	key: string;
	heldKeys: string[];
	preventDefault: () => void;
}

export type Cursor = Parameters<SetCursor>[0];

export type SetCursor = (
	cursor:
		| "unset"
		| "grab"
		| "grabbing"
		| "crosshair"
		| "pointer"
		| "wait"
		| "move",
) => void;

export type Project = (lng: number, lat: number) => CartesianPoint;
export type Unproject = (x: number, y: number) => { lat: number; lng: number };
export type GetLngLatFromEvent = (event: PointerEvent | MouseEvent) => {
	lng: number;
	lat: number;
} | null;

export type Projection = "web-mercator" | "globe";

export type OnFinishContext = { mode: string; action: string };

export type OnChangeContext = { origin: "api" };

export type TerraDrawGeoJSONStore = GeoJSONStore<
	OnChangeContext | undefined,
	FeatureId
>;

export interface TerraDrawModeRegisterConfig {
	mode: string;
	store: TerraDrawGeoJSONStore;
	setDoubleClickToZoom: (enabled: boolean) => void;
	setCursor: SetCursor;
	onChange: StoreChangeHandler<OnChangeContext | undefined>;
	onSelect: (selectedId: string) => void;
	onDeselect: (deselectedId: string) => void;
	onFinish: (finishedId: string, context: OnFinishContext) => void;
	project: Project;
	unproject: Unproject;
	coordinatePrecision: number;
}

export enum UpdateTypes {
	Commit = "commit",
	Provisional = "provisional",
	Finish = "finish",
}

type ValidationContext = Pick<
	TerraDrawModeRegisterConfig,
	"project" | "unproject" | "coordinatePrecision"
> & {
	updateType: UpdateTypes;
};

export type Validation = (
	feature: GeoJSONStoreFeatures,
	context: ValidationContext,
) => {
	valid: boolean;
	reason?: string;
};

export interface Snapping {
	toLine?: boolean;
	toCoordinate?: boolean;
	toCustom?: (
		event: TerraDrawMouseEvent,
		context: {
			currentId?: FeatureId;
			currentCoordinate?: number;
			getCurrentGeometrySnapshot: () => (Polygon | LineString) | null;
			project: Project;
			unproject: Unproject;
		},
	) => Position | undefined;
}

export type TerraDrawModeState =
	| "unregistered"
	| "registered"
	| "started"
	| "drawing"
	| "selecting"
	| "stopped";

export interface TerraDrawCallbacks {
	getState: () => TerraDrawModeState;
	onKeyUp: (event: TerraDrawKeyboardEvent) => void;
	onKeyDown: (event: TerraDrawKeyboardEvent) => void;
	onClick: (event: TerraDrawMouseEvent) => void;
	onMouseMove: (event: TerraDrawMouseEvent) => void;
	onDragStart: (
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) => void;
	onDrag: (
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) => void;
	onDragEnd: (
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) => void;
	onClear: () => void;
	onReady?(): void;
}

export interface TerraDrawChanges {
	created: GeoJSONStoreFeatures[];
	updated: GeoJSONStoreFeatures[];
	unchanged: GeoJSONStoreFeatures[];
	deletedIds: FeatureId[];
}

export type TerraDrawStylingFunction = {
	[mode: string]: (feature: GeoJSONStoreFeatures) => TerraDrawAdapterStyling;
};

export interface TerraDrawAdapter {
	project: Project;
	unproject: Unproject;
	setCursor: SetCursor;
	getLngLatFromEvent: GetLngLatFromEvent;
	setDoubleClickToZoom: (enabled: boolean) => void;
	getMapEventElement: () => HTMLElement;
	register(callbacks: TerraDrawCallbacks): void;
	unregister(): void;
	render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction): void;
	clear(): void;
	getCoordinatePrecision(): number;
}

export const SELECT_PROPERTIES = {
	SELECTED: "selected",
	MID_POINT: "midPoint",
	SELECTION_POINT_FEATURE_ID: "selectionPointFeatureId",
	SELECTION_POINT: "selectionPoint",
} as const;

export const COMMON_PROPERTIES = {
	MODE: "mode",
	CURRENTLY_DRAWING: "currentlyDrawing",
	EDITED: "edited",
	CLOSING_POINT: "closingPoint",
	SNAPPING_POINT: "snappingPoint",
	COORDINATE_POINT: "coordinatePoint",
	COORDINATE_POINT_FEATURE_ID: "coordinatePointFeatureId",
	COORDINATE_POINT_IDS: "coordinatePointIds",
	PROVISIONAL_COORDINATE_COUNT: "provisionalCoordinateCount",
	COMMITTED_COORDINATE_COUNT: "committedCoordinateCount",
} as const;

/**
 * Lower z-index represents layers that are lower in the stack
 * and higher z-index represents layers that are higher in the stack
 * i.e. a layer with z-index 10 will be rendered below a layer with z-index 20
 */
export const Z_INDEX = {
	LAYER_ONE: 10,
	LAYER_TWO: 20,
	LAYER_THREE: 30,
	LAYER_FOUR: 40,
	LAYER_FIVE: 50,
} as const;
