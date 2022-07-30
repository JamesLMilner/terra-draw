import {
  TerraDrawMouseEvent,
  TerraDrawMode,
  TerraDrawModeRegisterConfig,
  TerraDrawKeyboardEvent,
  TerraDrawAdapterStyling,
} from "../common";
import { GeoJSONStore } from "../store/store";
import { pointInPolygon } from "../geometry/point-in-polygon";
import { getPixelDistance } from "../geometry/get-pixel-distance";
import { getPixelDistanceToLine } from "../geometry/get-pixel-distance-to-line";
import { getDefaultStyling } from "../util/styling";
import { Point, Position } from "geojson";

type TerraDrawSelectModeKeyEvents = {
  deselect: KeyboardEvent["key"];
  delete: KeyboardEvent["key"];
};

export class TerraDrawSelectMode implements TerraDrawMode {
  mode = "select";
  private store: GeoJSONStore;
  private project: TerraDrawModeRegisterConfig["project"];
  private selected: string[] = [];
  private pointerDistance: number;
  private selectionPoints: string[] = [];
  private dragStart: [number, number];
  private draggable: string[];
  private keyEvents: TerraDrawSelectModeKeyEvents;

  constructor(options?: {
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
    draggable?: string[];
    keyEvents?: TerraDrawSelectModeKeyEvents;
  }) {
    this.pointerDistance = (options && options.pointerDistance) || 40;

    this.styling =
      options && options.styling
        ? { ...getDefaultStyling(), ...options.styling }
        : getDefaultStyling();

    this.draggable =
      options && options.draggable ? options.draggable.slice() : [];

    this.keyEvents =
      options && options.keyEvents
        ? options.keyEvents
        : { deselect: "Escape", delete: "Delete" };
  }

  private deselect() {
    this.store.updateProperty(
      this.selected.map((id) => ({ id, property: "selected", value: false }))
    );

    this.onDeselect(this.selected[0]);
    this.selected = [];
    this.deleteSelectionPoints();
  }

  private deleteSelected() {
    // Delete all selected features
    // from the store and clear selected
    // We don't need to set selected false
    // as we're going to delete the feature

    this.store.delete(this.selected);
    this.selected = [];
  }

  private createSelectionPoints(selectedCoords: [number, number][]) {
    this.selectionPoints = this.store.create(
      selectedCoords.map((coord) => ({
        geometry: { type: "Point", coordinates: coord },
        properties: { mode: this.mode, selectionPoint: true },
      }))
    );

    console.log(this.selectionPoints);
  }

  private deleteSelectionPoints() {
    if (this.selectionPoints.length) {
      // Reset selection points - make it silent so we don't
      // trigger delete events for all the selection points
      this.store.delete(this.selectionPoints);
      this.selectionPoints = [];
    }
  }

  styling: TerraDrawAdapterStyling;

  onClick(event: TerraDrawMouseEvent) {
    const features = this.store.copyAll();

    let clickedFeatureId: string;
    let clickedFeatureDistance = Infinity;

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const geometry = feature.geometry;

      // Ignore selection points
      if (feature.properties.selectionPoint) {
        continue;
      }

      if (geometry.type === "Point") {
        const { x, y } = this.project(
          geometry.coordinates[0],
          geometry.coordinates[1]
        );
        const distance = getPixelDistance(
          { x, y },
          { x: event.containerX, y: event.containerY }
        );
        if (
          distance < this.pointerDistance &&
          distance < clickedFeatureDistance
        ) {
          clickedFeatureDistance = distance;
          clickedFeatureId = feature.id as string;
        }
      } else if (geometry.type === "LineString") {
        for (let i = 0; i < geometry.coordinates.length - 1; i++) {
          const coord = geometry.coordinates[i];
          const nextCoord = geometry.coordinates[i + 1];
          const distanceToLine = getPixelDistanceToLine(
            { x: event.containerX, y: event.containerY },
            this.project(coord[0], coord[1]),
            this.project(nextCoord[0], nextCoord[1])
          );

          if (
            distanceToLine < this.pointerDistance &&
            distanceToLine < clickedFeatureDistance
          ) {
            clickedFeatureDistance = distanceToLine;
            clickedFeatureId = feature.id as string;
          }
        }
      } else if (geometry.type === "Polygon") {
        const clickInsidePolygon = pointInPolygon(
          [event.lng, event.lat],
          geometry.coordinates as [number, number][][]
        );

        if (clickInsidePolygon) {
          clickedFeatureDistance = 0;
          clickedFeatureId = feature.id as string;
        }
      }
    }

    if (clickedFeatureId) {
      const previouslySelectedId = this.selected[0];

      // If we have something currently selected
      if (previouslySelectedId) {
        // If it maches the current selected feature id, do nothing
        if (previouslySelectedId === clickedFeatureId) {
          return;
        } else {
          // If it's a different feature set selected
          // to false on previously selected feature
          this.store.updateProperty([
            { id: previouslySelectedId, property: "selected", value: false },
          ]);

          // And remove the selection points
          this.deleteSelectionPoints();
        }
      }

      // TODO: Handle multi select?
      this.selected = [clickedFeatureId];
      this.store.updateProperty([
        { id: clickedFeatureId, property: "selected", value: true },
      ]);
      this.onSelect(clickedFeatureId);

      const { type, coordinates } = this.store.getGeometryCopy(
        clickedFeatureId
      );

      let selectedCoords: Position[];
      if (type === "LineString") {
        selectedCoords = coordinates;
      } else if (type === "Polygon") {
        selectedCoords = coordinates[0];
      }

      if (selectedCoords) {
        this.createSelectionPoints(selectedCoords as [number, number][]);
      }
    } else if (this.selected.length) {
      this.deselect();
    }
  }
  onKeyPress(event: TerraDrawKeyboardEvent) {
    if (event.key === this.keyEvents.delete) {
      if (!this.selected.length) {
        return;
      }

      // We are technically deselecting
      // because the selected feature is deleted
      // and will no longer exist or be selected
      const previouslySelected = this.selected[0];
      this.onDeselect(previouslySelected);

      // Delete all selected features
      this.deleteSelected();

      // Remove all selection points
      this.deleteSelectionPoints();
    } else if (event.key === this.keyEvents.deselect) {
      this.cleanUp();
    }
  }
  cleanUp() {
    if (this.selected.length) {
      this.deselect();
    }
  }
  onDragStart(
    event: TerraDrawMouseEvent,
    setMapDraggability: (enabled: boolean) => void
  ) {
    // We only need to stop the map dragging if
    // we actually have something selected
    if (this.selected.length) {
      this.dragStart = [event.lng, event.lat];
      setMapDraggability(false);
    }
  }
  onDrag(event: TerraDrawMouseEvent) {
    const selectedId = this.selected[0];

    if (selectedId) {
      const properties = this.store.getPropertiesCopy(selectedId);

      if (!this.draggable.includes(properties.mode)) {
        return;
      }
      const geometry = this.store.getGeometryCopy(selectedId);
      const mouseCoord = [event.lng, event.lat] as [number, number];

      if (geometry.type === "Polygon" || geometry.type === "LineString") {
        let coords: Position[];
        let upToCoord: number;
        if (geometry.type === "Polygon") {
          coords = geometry.coordinates[0];
          upToCoord = coords.length - 1;
        } else if (geometry.type === "LineString") {
          coords = geometry.coordinates;
          upToCoord = coords.length;
        }

        for (let i = 0; i < upToCoord; i++) {
          const coordinate = coords[i];
          const delta = [
            this.dragStart[0] - mouseCoord[0],
            this.dragStart[1] - mouseCoord[1],
          ];
          coords[i] = [coordinate[0] - delta[0], coordinate[1] - delta[1]];
        }

        // Set final coordinate identical to first
        // We only want to do this for polygons!
        if (geometry.type === "Polygon") {
          coords[coords.length - 1] = [coords[0][0], coords[0][1]];
        }

        this.store.updateGeometry([{ id: this.selected[0], geometry }]);

        this.selectionPoints.forEach((id, i) => {
          const pointGeometry = this.store.getGeometryCopy<Point>(id);
          pointGeometry.coordinates[0] = coords[i][0];
          pointGeometry.coordinates[1] = coords[i][1];
          this.store.updateGeometry([{ id, geometry: pointGeometry }]);
        });
      } else if (geometry.type === "Point") {
        // For mouse points we can simply move it
        // to the dragged position
        this.store.updateGeometry([
          {
            id: selectedId,
            geometry: {
              type: "Point",
              coordinates: mouseCoord,
            },
          },
        ]);
      }
    }
    this.dragStart = [event.lng, event.lat];
  }
  onDragEnd(
    _: TerraDrawMouseEvent,
    setMapDraggability: (enabled: boolean) => void
  ) {
    this.dragStart = undefined;
    setMapDraggability(false);
  }
  onMouseMove() {}
  register(config: TerraDrawModeRegisterConfig) {
    this.store = config.store;
    this.store.registerOnChange(config.onChange);
    this.project = config.project;
    this.onSelect = config.onSelect;
    this.onDeselect = config.onDeselect;
  }
  onDeselect(deselectedId: string) {}
  onSelect(selectedId: string) {}
}
