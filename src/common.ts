import { StoreChangeHandler, GeoJSONStore } from "./store/store";
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
  onDeselect: () => void;
  project: (lng: number, lat: number) => { x: number; y: number };
}

export interface TerraDrawMode {
  mode: string;
  styling: TerraDrawAdapterStyling;
  cleanUp: () => void;
  onKeyPress: (event: TerraDrawKeyboardEvent) => void;
  onMouseMove: (event: TerraDrawMouseEvent) => void;
  onClick: (event: TerraDrawMouseEvent) => void;
  register: (config: TerraDrawModeRegisterConfig) => void;
}

export interface TerraDrawCallbacks {
  onKeyPress: (event: TerraDrawKeyboardEvent) => void;
  onClick: (event: TerraDrawMouseEvent) => void;
  onMouseMove: (event: TerraDrawMouseEvent) => void;
}

export interface TerraDrawAdapter {
  project: (lng: number, lat: number) => { x: number; y: number };
  register(callbacks: TerraDrawCallbacks): void;
  unregister(): void;
  render(
    features: Feature[],
    styling: { [mode: string]: TerraDrawAdapterStyling }
  ): void;
}
