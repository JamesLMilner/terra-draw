import {
  StoreChangeHandler,
  GeoJSONStore,
  GeoJSONStoreFeatures,
} from "./store/store";
import { Feature } from "geojson";

export interface TerraDrawAdapterStyling {
  pointColor: string;
  pointWidth: number;
  pointOutlineColor: string;
  polygonFillColor: string;
  polygonFillOpacity: number;
  polygonOutlineColor: string;
  polygonOutlineWidth: number;
  lineStringWidth: number;
  lineStringColor: string;
  selectedColor: string;
  selectionPointWidth: number;
  selectedPointOutlineColor: string;
  midPointColor: string;
  midPointWidth: number;
  midPointOutlineColor: string;
}

export interface TerraDrawMouseEvent {
  lng: number;
  lat: number;
  containerX: number;
  containerY: number;
  button: "left" | "right" | "pointer";
}

export interface TerraDrawKeyboardEvent {
  key: string;
}

type SetCursor = (cursor: "unset" | "grab" | "grabbing" | "crosshair") => void;

type Project = (lng: number, lat: number) => { x: number; y: number };
type Unproject = (x: number, y: number) => { lat: number; lng: number };

export interface TerraDrawModeRegisterConfig {
  store: GeoJSONStore;
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
  styling: TerraDrawAdapterStyling;
  state: TerraDrawModeState;

  start: () => void;
  stop: () => void;
  register: (config: TerraDrawModeRegisterConfig) => void;

  // cleanUp: () => void;
  onKeyPress: (event: TerraDrawKeyboardEvent) => void;
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
  onKeyPress: (event: TerraDrawKeyboardEvent) => void;
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

export interface TerraDrawAdapter {
  project: Project;
  unproject: Unproject;
  setCursor: SetCursor;
  getMapContainer: () => HTMLElement;
  register(callbacks: TerraDrawCallbacks): void;
  unregister(): void;
  render(
    changes: TerraDrawChanges,
    // features: GeoJSONStoreFeatures[],
    styling: { [mode: string]: TerraDrawAdapterStyling }
  ): void;
}
