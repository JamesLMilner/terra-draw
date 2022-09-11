import { mode } from "../development/webpack.config";
import { TerraDrawGoogleMapsAdapter } from "./adapters/google-maps.adapter";
import { TerraDrawLeafletAdapter } from "./adapters/leaflet.adapter";
import { TerraDrawMapboxGLAdapter } from "./adapters/mapbox-gl.adapter";
import {
  TerraDrawMode,
  TerraDrawAdapter,
  TerraDrawAdapterStyling,
} from "./common";
import { TerraDrawCircleMode } from "./modes/circle.mode";
import { TerraDrawFreehandMode } from "./modes/freehand.mode";
import { TerraDrawLineStringMode } from "./modes/linestring.mode";
import { TerraDrawPointMode } from "./modes/point.mode";
import { TerraDrawPolygonMode } from "./modes/polygon.mode";
import { TerraDrawSelectMode } from "./modes/select/select.mode";
import { TerraDrawStaticMode } from "./modes/static.mode";
import {
  GeoJSONStore,
  GeoJSONStoreFeatures,
  StoreChangeHandler,
} from "./store/store";

type ChangeListener = (ids: string[], type: string) => void;
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

  constructor(options: {
    adapter: TerraDrawAdapter;
    modes: { [mode: string]: TerraDrawMode };
    data?: GeoJSONStoreFeatures[];
  }) {
    this._adapter = options.adapter;
    this._mode = new TerraDrawStaticMode();
    this._modes = { ...options.modes, static: this._mode };
    this._eventListeners = { change: [], select: [], deselect: [] };

    if (options.data) {
      this._store = new GeoJSONStore({ data: options.data });
    } else {
      this._store = new GeoJSONStore();
    }

    const getChanged = (
      ids: string[]
    ): {
      changed: GeoJSONStoreFeatures[];
      unchanged: GeoJSONStoreFeatures[];
    } => {
      let changed: GeoJSONStoreFeatures[] = [];

      const unchanged = this._store.copyAll().filter((f) => {
        if (ids.includes(f.id as string)) {
          changed.push(f);
          return false;
        }

        return true;
      });

      return { changed, unchanged };
    };

    const onChange: StoreChangeHandler = (ids, event) => {
      this._eventListeners.change.forEach((listener) => {
        listener(ids, event);
      });

      const { changed, unchanged } = getChanged(ids);

      if (event === "create") {
        this._adapter.render(
          { created: changed, deletedIds: [], unchanged, updated: [] },
          this.getModeStyles()
        );
      } else if (event === "update") {
        this._adapter.render(
          { created: [], deletedIds: [], unchanged, updated: changed },
          this.getModeStyles()
        );
      } else if (event === "delete") {
        this._adapter.render(
          { created: [], deletedIds: ids, unchanged, updated: [] },
          this.getModeStyles()
        );
      }
    };

    const onSelect = (selectedId: string) => {
      this._eventListeners.select.forEach((listener) => {
        listener(selectedId);
      });

      const { changed, unchanged } = getChanged([selectedId]);

      this._adapter.render(
        { created: [], deletedIds: [], unchanged, updated: changed },
        this.getModeStyles()
      );
    };

    const onDeselect = (deselectedId: string) => {
      this._eventListeners.deselect.forEach((listener) => {
        listener();
      });

      const { changed, unchanged } = getChanged([deselectedId]);

      // onDeselect can be called after a delete call which means that
      // you are deselecting a feature that has been deleted. We
      // double check here to ensure that the feature still exists.
      if (changed) {
        this._adapter.render(
          { created: [], deletedIds: [], unchanged, updated: changed },
          this.getModeStyles()
        );
      }
    };

    // Register stores and callbacks
    Object.keys(this._modes).forEach((modeId) => {
      this._modes[modeId].register({
        mode: modeId,
        store: this._store,
        setCursor: this._adapter.setCursor,
        project: this._adapter.project,
        unproject: this._adapter.unproject,
        onChange: onChange,
        onSelect: onSelect,
        onDeselect: onDeselect,
      });
    });

    // If we pass in data, we want to render it on startup
    if (options.data) {
      // Remove all non mode features
      const initialRender = this._store.copyAll().filter((feature) => {
        if (
          feature.properties &&
          !Object.keys(this._modes).includes(feature.properties.mode as string)
        ) {
          this._store.delete([feature.id as string]);
          return false;
        }
        return true;
      });

      this._adapter.render(
        { created: initialRender, deletedIds: [], unchanged: [], updated: [] },
        this.getModeStyles()
      );
    }
  }

  private getModeStyles() {
    const modeStyles: { [key: string]: TerraDrawAdapterStyling } = {};
    Object.keys(this._modes).forEach((mode) => {
      modeStyles[mode] = this._modes[mode].styling;
    });
    return modeStyles;
  }

  getSnapshot() {
    return this._store.copyAll();
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
      this._mode.stop();

      // Swap the mode to the new mode
      this._mode = this._modes[mode];

      // Start the new mode
      this._mode.start();
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
      onKeyDown: (event) => {
        this._mode.onKeyDown(event);
      },
      onKeyUp: (event) => {
        this._mode.onKeyUp(event);
      },
      onDragStart: (event, setMapDraggability) => {
        this._mode.onDragStart(event, setMapDraggability);
      },
      onDrag: (event) => {
        this._mode.onDrag(event);
      },
      onDragEnd: (event, setMapDraggability) => {
        this._mode.onDragEnd(event, setMapDraggability);
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
  TerraDrawFreehandMode,
  TerraDrawGoogleMapsAdapter,
  TerraDrawMapboxGLAdapter,
  TerraDrawLeafletAdapter,
};
