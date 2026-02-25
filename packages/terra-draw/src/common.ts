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
	pointOpacity?: number;
	pointOutlineColor: HexColor;
	pointOutlineOpacity?: number;
	pointOutlineWidth: number;
	polygonFillColor: HexColor;
	polygonFillOpacity: number;
	polygonOutlineColor: HexColor;
	polygonOutlineOpacity?: number;
	polygonOutlineWidth: number;
	lineStringWidth: number;
	lineStringColor: HexColor;
	lineStringOpacity?: number;
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

export const FinishActions = {
	Draw: "draw",
	Edit: "edit",
	DeleteCoordinate: "deleteCoordinate",
	InsertMidpoint: "insertMidpoint",
	DragCoordinate: "dragCoordinate",
	DragFeature: "dragFeature",
	DragCoordinateResize: "dragCoordinateResize",
} as const;

export type DrawInteractions =
	| "click-move"
	| "click-drag"
	| "click-move-or-drag";

export type DrawType = "click" | "drag";

export type Actions = (typeof FinishActions)[keyof typeof FinishActions];

export type OnFinishContext = { mode: string; action: Actions };

export type TerraDrawOnChangeContext =
	| {
			origin: "api";
			target?: "geometry" | "properties";
			updateType: UpdateTypes;
	  }
	| { origin: "api" }
	| { target?: "geometry" | "properties"; updateType: UpdateTypes };

export type TerraDrawGeoJSONStore = GeoJSONStore<
	TerraDrawOnChangeContext | undefined,
	FeatureId
>;

export interface TerraDrawModeRegisterConfig {
	mode: string;
	store: TerraDrawGeoJSONStore;
	setDoubleClickToZoom: (enabled: boolean) => void;
	setCursor: SetCursor;
	onChange: StoreChangeHandler<TerraDrawOnChangeContext | undefined>;
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

export type TerraDrawHandledEvents = Extract<
	keyof HTMLElementEventMap,
	| "pointerdown"
	| "pointerup"
	| "pointermove"
	| "contextmenu"
	| "keyup"
	| "keydown"
>;

export interface TerraDrawAdapter {
	project: Project;
	unproject: Unproject;
	setCursor: SetCursor;
	getLngLatFromEvent: GetLngLatFromEvent;
	setDoubleClickToZoom: (enabled: boolean) => void;
	getMapEventElement: (eventType?: TerraDrawHandledEvents) => HTMLElement;
	register(callbacks: TerraDrawCallbacks): void;
	unregister(): void;
	render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction): void;
	clear(): void;
	getCoordinatePrecision(): number;
}

const MARKER_URL_BASE =
	"https://raw.githubusercontent.com/JamesLMilner/terra-draw/refs/heads/main/assets/markers";

export const MARKER_URL_DEFAULT = `${MARKER_URL_BASE}/marker-blue.png`;

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
	MARKER: "marker",
} as const;

const GUIDANCE_POINT_PROPERTY_KEYS = [
	COMMON_PROPERTIES.EDITED,
	SELECT_PROPERTIES.SELECTION_POINT,
	SELECT_PROPERTIES.MID_POINT,
	COMMON_PROPERTIES.CLOSING_POINT,
	COMMON_PROPERTIES.SNAPPING_POINT,
	COMMON_PROPERTIES.COORDINATE_POINT,
];

export type GuidancePointProperties =
	(typeof GUIDANCE_POINT_PROPERTY_KEYS)[number];

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
