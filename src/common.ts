import {
    StoreChangeHandler,
    GeoJSONStore,
    GeoJSONStoreFeatures,
} from "./store/store";

export type HexColor = `#${string}`

export interface TerraDrawAdapterStyling {
    pointColor: HexColor;
    pointWidth: number;
    pointOutlineColor: HexColor;
    pointOutlineWidth: number,
    polygonFillColor: HexColor;
    polygonFillOpacity: number;
    polygonOutlineColor: HexColor;
    polygonOutlineWidth: number;
    lineStringWidth: number;
    lineStringColor: HexColor;
    zIndex: number
}

export interface TerraDrawMouseEvent {
    lng: number;
    lat: number;
    containerX: number;
    containerY: number;
    button: "left" | "right" | "pointer";
    heldKeys: string[];
}

export interface TerraDrawKeyboardEvent {
    key: string;
}

type SetCursor = (cursor: "unset" | "grab" | "grabbing" | "crosshair" | "pointer") => void;

export type Project = (lng: number, lat: number) => { x: number; y: number };
export type Unproject = (x: number, y: number) => { lat: number; lng: number };

export interface TerraDrawModeRegisterConfig {
    mode: string;
    store: GeoJSONStore;
    setDoubleClickToZoom: (enabled: boolean) => void;
    setCursor: SetCursor;
    onChange: StoreChangeHandler;
    onSelect: (selectedId: string) => void;
    onDeselect: (deselectedId: string) => void;
    project: Project;
    unproject: Unproject;
}

export type TerraDrawModeState =
    | "unregistered"
    | "registered"
    | "started"
    | "stopped";

export interface TerraDrawMode {
    mode: string;
    styleFeature: (feature: GeoJSONStoreFeatures) => TerraDrawAdapterStyling;
    styles: any;
    state: TerraDrawModeState;
    start: () => void;
    stop: () => void;
    register: (config: TerraDrawModeRegisterConfig) => void;

    // cleanUp: () => void;
    onKeyDown: (event: TerraDrawKeyboardEvent) => void;
    onKeyUp: (event: TerraDrawKeyboardEvent) => void;
    onMouseMove: (event: TerraDrawMouseEvent) => void;
    onClick: (event: TerraDrawMouseEvent) => void;
    onDragStart: (
        event: TerraDrawMouseEvent,
        setMapDraggability: (enabled: boolean) => void
    ) => void;
    onDrag: (event: TerraDrawMouseEvent) => void;
    onDragEnd: (
        event: TerraDrawMouseEvent,
        setMapDraggability: (enabled: boolean) => void
    ) => void;
}

export interface TerraDrawCallbacks {
    onKeyUp: (event: TerraDrawKeyboardEvent) => void;
    onKeyDown: (event: TerraDrawKeyboardEvent) => void;
    onClick: (event: TerraDrawMouseEvent) => void;
    onMouseMove: (event: TerraDrawMouseEvent) => void;
    onDragStart: (
        event: TerraDrawMouseEvent,
        setMapDraggability: (enabled: boolean) => void
    ) => void;
    onDrag: (event: TerraDrawMouseEvent) => void;
    onDragEnd: (
        event: TerraDrawMouseEvent,
        setMapDraggability: (enabled: boolean) => void
    ) => void;
}

export interface TerraDrawChanges {
    created: GeoJSONStoreFeatures[];
    updated: GeoJSONStoreFeatures[];
    unchanged: GeoJSONStoreFeatures[];
    deletedIds: string[];
}

type TerraDrawStylingFunction = { [mode: string]: (feature: GeoJSONStoreFeatures) => TerraDrawAdapterStyling }

export interface TerraDrawAdapter {
    project: Project;
    unproject: Unproject;
    setCursor: SetCursor;
    setDoubleClickToZoom: (enabled: boolean) => void;
    getMapContainer: () => HTMLElement;
    register(callbacks: TerraDrawCallbacks): void;
    unregister(): void;
    render(
        changes: TerraDrawChanges,
        styling: TerraDrawStylingFunction
    ): void;
}

export const SELECT_PROPERTIES = {
    SELECTED: "selected",
    MID_POINT: "midPoint",
    SELECTION_POINT: "selectionPoint",
} as const;

export const POLYGON_PROPERTIES = {
    CLOSING_POINT: 'closingPoint'
};
