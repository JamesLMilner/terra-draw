import { TerraDrawGoogleMapsAdapter } from "./adapters/google-maps.adapter";
import { TerraDrawLeafletAdapter } from "./adapters/leaflet.adapter";
import { TerraDrawMapboxGLAdapter } from "./adapters/mapbox-gl.adapter";
import {
  TerraDrawMode,
  TerraDrawAdapter,
  TerraDrawAdapterStyling,
} from "./common";
import { TerraDrawCircleMode } from "./modes/circle.mode";
import { TerraDrawLineStringMode } from "./modes/line-string.mode";
import { TerraDrawPointMode } from "./modes/point.mode";
import { TerraDrawPolygonMode } from "./modes/polygon.mode";
import { TerraDrawSelectMode } from "./modes/select.mode";
import { TerraDrawStaticMode } from "./modes/static.mode";
import { GeoJSONStore, StoreChangeHandler } from "./store/store";

type ChangeListener = (id: string, type: string) => void;
type SelectListener = (id: string) => void;
type DeselectListener = () => void;

interface TerraDrawEventListeners {
  change: ChangeListener;
  select: SelectListener;
  deselect: DeselectListener;
}

type TerraDrawEvents = keyof TerraDrawEventListeners;

class TerraDraw {
  private _modes: { [mode: string]: TerraDrawMode };
  private _mode: TerraDrawMode;
  private _adapter: TerraDrawAdapter;
  private _enabled = false;
  private _store: GeoJSONStore;
  private _eventListeners: {
    change: ChangeListener[];
    select: SelectListener[];
    deselect: DeselectListener[];
  };
  constructor(
    adapter: TerraDrawAdapter,
    modes: { [mode: string]: TerraDrawMode }
  ) {
    this._adapter = adapter;
    this._mode = new TerraDrawStaticMode();
    this._store = new GeoJSONStore();
    this._modes = { ...modes, static: this._mode };
    this._eventListeners = { change: [], select: [], deselect: [] };

    const getModeStyles = () => {
      const modeStyles: { [key: string]: TerraDrawAdapterStyling } = {};
      Object.keys(this._modes).forEach((mode) => {
        modeStyles[mode] = this._modes[mode].styling;
      });
      return modeStyles;
    };

    // Register stores and callbacks
    Object.keys(this._modes).forEach((modeId) => {
      const onChange: StoreChangeHandler = (id, event) => {
        this._eventListeners.change.forEach((listener) => {
          listener(id, event);
        });
        this._adapter.render(this._store.copyAll(), getModeStyles());
      };

      const onSelect = (selectedId: string) => {
        this._eventListeners.select.forEach((listener) => {
          listener(selectedId);
        });

        const features = this._store.copyAll();
        features.forEach((feature) => {
          if (feature.id === selectedId) {
            feature.properties.selected = true;
          }
        });
        this._adapter.render(features, getModeStyles());
      };

      const onDeselect = () => {
        this._eventListeners.deselect.forEach((listener) => {
          listener();
        });

        const features = this._store.copyAll();
        this._adapter.render(features, getModeStyles());
      };

      this._modes[modeId].register({
        store: this._store,
        project: this._adapter.project,
        onChange: onChange,
        onSelect: onSelect,
        onDeselect: onDeselect,
      });
    });
  }

  get enabled() {
    return this._enabled;
  }

  changeMode(mode: string) {
    if (this._modes[mode]) {
      // Before we swap modes we want to
      // clean up any state that has been left behind,
      // for example current drawing geometries
      // and mode state
      this._mode.cleanUp();

      // Swap the mode to the new mode
      this._mode = this._modes[mode];
    } else {
      // If the mode doesn't exist, we throw an error
      throw new Error("No mode with this name present");
    }
  }

  start() {
    this._enabled = true;
    this._adapter.register({
      onClick: (event) => {
        this._mode.onClick(event);
      },
      onMouseMove: (event) => {
        this._mode.onMouseMove(event);
      },
      onKeyPress: (event) => {
        this._mode.onKeyPress(event);
      },
    });
  }

  stop() {
    this._enabled = false;
    this._adapter.unregister();
  }

  on<T extends TerraDrawEvents>(
    event: T,
    callback: TerraDrawEventListeners[T]
  ) {
    const listeners = this._eventListeners[
      event
    ] as TerraDrawEventListeners[T][];
    if (!listeners.includes(callback)) {
      listeners.push(callback);
    }
  }

  off<T extends TerraDrawEvents>(
    event: TerraDrawEvents,
    callback: TerraDrawEventListeners[T]
  ) {
    const listeners = this._eventListeners[
      event
    ] as TerraDrawEventListeners[T][];
    if (listeners.includes(callback)) {
      listeners.splice(listeners.indexOf(callback), 1);
    }
  }
}

export {
  TerraDraw,
  TerraDrawSelectMode,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawCircleMode,
  TerraDrawGoogleMapsAdapter,
  TerraDrawMapboxGLAdapter,
  TerraDrawLeafletAdapter,
};
