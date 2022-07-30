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
  selectedPointColor: string;
}

export interface TerraDrawMouseEvent {
  lng: number;
  lat: number;
  containerX: number;
  containerY: number;
}

export interface TerraDrawKeyboardEvent {
  key: string;
}

export interface TerraDrawModeRegisterConfig {
  store: GeoJSONStore;
  onChange: StoreChangeHandler;
  onSelect: (selectedId: string) => void;
  onDeselect: (deselectedId: string) => void;
  project: (lng: number, lat: number) => { x: number; y: number };
}

export interface TerraDrawMode {
  mode: string;
  styling: TerraDrawAdapterStyling;
  cleanUp: () => void;
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
  register: (config: TerraDrawModeRegisterConfig) => void;
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
  project: (lng: number, lat: number) => { x: number; y: number };
  register(callbacks: TerraDrawCallbacks): void;
  unregister(): void;
  render(
    changes: TerraDrawChanges,
    // features: GeoJSONStoreFeatures[],
    styling: { [mode: string]: TerraDrawAdapterStyling }
  ): void;
}
