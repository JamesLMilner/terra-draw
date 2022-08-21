import {
  TerraDrawMouseEvent,
  TerraDrawKeyboardEvent,
  TerraDrawAdapterStyling,
} from "../common";
import { pointInPolygon } from "../geometry/point-in-polygon";
import { getPixelDistance } from "../geometry/get-pixel-distance";
import { getPixelDistanceToLine } from "../geometry/get-pixel-distance-to-line";
import { Feature, Point, Polygon, Position } from "geojson";
import { TerraDrawBaseDrawMode } from "./base.mode";
import { midpoint } from "../geometry/midpoint";
import { setEmitFlags } from "typescript";
import { GeoJSONStoreFeatures } from "../store/store";

type TerraDrawSelectModeKeyEvents = {
  deselect: KeyboardEvent["key"];
  delete: KeyboardEvent["key"];
};

type TerraDrawSelectDraggable = {
  mode: string;
  coordinate: boolean;
  feature: boolean;
}[];

export class TerraDrawSelectMode extends TerraDrawBaseDrawMode {
  mode = "select";

  private selected: string[] = [];
  private midPoints: string[] = [];
  private selectionPoints: string[] = [];
  private dragPosition: Position;
  private draggableModes: TerraDrawSelectDraggable;
  private keyEvents: TerraDrawSelectModeKeyEvents;

  constructor(options?: {
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
    draggable?: TerraDrawSelectDraggable;
    keyEvents?: TerraDrawSelectModeKeyEvents;
  }) {
    super(options);

    this.draggableModes =
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
    this.deleteMidPoints();
  }

  private deleteSelected() {
    // Delete all selected features
    // from the store and clear selected
    // We don't need to set selected false
    // as we're going to delete the feature

    this.store.delete(this.selected);
    this.selected = [];
  }

  private getSelectionPoints(selectedCoords: Position[]) {
    return selectedCoords.map((coord) => ({
      geometry: { type: "Point", coordinates: coord } as Point,
      properties: { mode: this.mode, selectionPoint: true },
    }));
  }

  private createSelectionPoints(selectedCoords: Position[]) {
    this.selectionPoints = this.store.create(
      this.getSelectionPoints(selectedCoords)
    );
  }

  private deleteSelectionPoints() {
    if (this.selectionPoints.length) {
      this.store.delete(this.selectionPoints);
      this.selectionPoints = [];
    }
  }

  private insertMidPoint(midPointId: string) {
    const midPoint = this.store.getGeometryCopy(midPointId);
    const { midPointFeatureId, midPointSegment } = this.store.getPropertiesCopy(
      midPointId
    );
    const geometry = this.store.getGeometryCopy(midPointFeatureId as string);

    let coordinates: Position[];
    if (geometry.type === "Polygon") {
      coordinates = geometry.coordinates[0];
    } else if (geometry.type === "LineString") {
      coordinates = geometry.coordinates;
    }

    coordinates.splice(
      (midPointSegment as number) + 1,
      0,
      midPoint.coordinates as Position
    );

    // Update the selected features geometry to insert
    // the new midpoint
    this.store.updateGeometry([{ id: midPointFeatureId as string, geometry }]);

    // TODO: is there a way of just updating the selection points rather
    // than fully deleting / recreating?
    // Recreate the selection points

    this.store.delete([...this.midPoints, ...this.selectionPoints]);
    this.midPoints = this.store.create(
      this.getMidPoints(coordinates, midPointFeatureId as string)
    );
    this.selectionPoints = this.store.create(
      this.getSelectionPoints(coordinates)
    );
  }

  private getMidPointCoordinates(featureCoords: Position[]) {
    const midPointCoords: Position[] = [];
    for (let i = 0; i < featureCoords.length - 1; i++) {
      const mid = midpoint(featureCoords[i], featureCoords[i + 1]);
      midPointCoords.push(mid);
    }
    return midPointCoords;
  }

  private getMidPoints(selectedCoords: Position[], featureId: string) {
    return this.getMidPointCoordinates(selectedCoords).map((coord, i) => ({
      geometry: { type: "Point", coordinates: coord } as Point,
      properties: {
        mode: this.mode,
        midPoint: true,
        midPointSegment: i,
        midPointFeatureId: featureId,
      },
    }));
  }

  private createMidPoints(selectedCoords: Position[], featureId: string) {
    this.midPoints = this.store.create(
      this.getMidPoints(selectedCoords, featureId)
    );
  }

  private deleteMidPoints() {
    if (this.midPoints.length) {
      this.store.delete(this.midPoints);
      this.midPoints = [];
    }
  }

  private dragFeature(event: TerraDrawMouseEvent) {
    const selectedId = this.selected[0];

    const geometry = this.store.getGeometryCopy(selectedId);
    const mouseCoord = [event.lng, event.lat];

    // Update the geometry of the dragged feature
    if (geometry.type === "Polygon" || geometry.type === "LineString") {
      let updatedCoords: Position[];
      let upToCoord: number;
      if (geometry.type === "Polygon") {
        updatedCoords = geometry.coordinates[0];
        upToCoord = updatedCoords.length - 1;
      } else if (geometry.type === "LineString") {
        updatedCoords = geometry.coordinates;
        upToCoord = updatedCoords.length;
      }

      for (let i = 0; i < upToCoord; i++) {
        const coordinate = updatedCoords[i];
        const delta = [
          this.dragPosition[0] - mouseCoord[0],
          this.dragPosition[1] - mouseCoord[1],
        ];
        updatedCoords[i] = [coordinate[0] - delta[0], coordinate[1] - delta[1]];
      }

      // Set final coordinate identical to first
      // We only want to do this for polygons!
      if (geometry.type === "Polygon") {
        updatedCoords[updatedCoords.length - 1] = [
          updatedCoords[0][0],
          updatedCoords[0][1],
        ];
      }

      const updatedMidPoints = this.getMidPointCoordinates(updatedCoords).map(
        (updatedMidPointCoord, i) => ({
          id: this.midPoints[i] as string,
          geometry: {
            type: "Point",
            coordinates: updatedMidPointCoord,
          } as Point,
        })
      );

      const updatedSelectionPoints = this.selectionPoints.map((id, i) => {
        return {
          id,
          geometry: {
            type: "Point",
            coordinates: updatedCoords[i],
          } as Point,
        };
      });

      // Issue the update to the selected feature
      this.store.updateGeometry([
        { id: this.selected[0], geometry },
        ...updatedSelectionPoints,
        ...updatedMidPoints,
      ]);

      // Update mid point positions
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

  private dragCoordinate(event: TerraDrawMouseEvent) {
    const selectedId = this.selected[0];

    const geometry = this.store.getGeometryCopy(selectedId);

    // We don't want to handle dragging
    // points here
    if (geometry.type === "Point") {
      return false;
    }

    let updatedCoords: Position[];
    if (geometry.type === "LineString") {
      updatedCoords = geometry.coordinates;
    } else if (geometry.type === "Polygon") {
      updatedCoords = geometry.coordinates[0];
    }

    if (!updatedCoords) {
      false;
    }

    for (let i = 0; i < updatedCoords.length; i++) {
      const coord = updatedCoords[i];
      const distance = this.distanceBetweenTwoCoords(coord, event);

      if (distance < this.pointerDistance) {
        const updatedCoord = [event.lng, event.lat];

        const isPolygonFirstOrLastCoord =
          (geometry.type === "Polygon" && i === 0) ||
          i === updatedCoords.length - 1;

        // For Polygons we want the first
        // and last coordinates to match
        if (isPolygonFirstOrLastCoord) {
          updatedCoords[0] = updatedCoord;
          updatedCoords[updatedCoords.length - 1] = updatedCoord;
        } else {
          updatedCoords[i] = updatedCoord;
        }

        const updatedSelectionPoints = isPolygonFirstOrLastCoord
          ? [
              {
                id: this.selectionPoints[0] as string,
                geometry: {
                  type: "Point",
                  coordinates: updatedCoord,
                } as Point,
              },
              {
                id: this.selectionPoints[updatedCoords.length - 1] as string,
                geometry: {
                  type: "Point",
                  coordinates: updatedCoord,
                } as Point,
              },
            ]
          : [
              {
                id: this.selectionPoints[i] as string,
                geometry: {
                  type: "Point",
                  coordinates: updatedCoord,
                } as Point,
              },
            ];

        const updatedMidPoints = this.getMidPointCoordinates(updatedCoords).map(
          (updatedMidPointCoord, i) => ({
            id: this.midPoints[i] as string,
            geometry: {
              type: "Point",
              coordinates: updatedMidPointCoord,
            } as Point,
          })
        );

        this.store.updateGeometry([
          // Update feature
          {
            id: selectedId as string,
            geometry: geometry,
          },

          // Update selection and mid points
          ...updatedSelectionPoints,
          ...updatedMidPoints,
        ]);

        return true;
      }
    }
  }

  start() {
    this.setStarted();
  }
  stop() {
    this.setStopped();
    this.cleanUp();
  }

  onClick(event: TerraDrawMouseEvent) {
    let clickedFeature: GeoJSONStoreFeatures;
    let clickedFeatureDistance = Infinity;

    const bbox = this.createClickBoundingBox(event);
    const features = this.store.search(bbox);

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const geometry = feature.geometry;

      // Ignore selection and mid points
      if (feature.properties.selectionPoint) {
        continue;
      }

      if (geometry.type === "Point") {
        const distance = this.distanceBetweenTwoCoords(
          geometry.coordinates,
          event
        );
        if (
          distance < this.pointerDistance &&
          distance < clickedFeatureDistance
        ) {
          clickedFeatureDistance = distance;
          clickedFeature = feature;
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
            clickedFeature = feature;
          }
        }
      } else if (geometry.type === "Polygon") {
        const clickInsidePolygon = pointInPolygon(
          [event.lng, event.lat],
          geometry.coordinates
        );

        if (clickInsidePolygon) {
          clickedFeatureDistance = 0;
          clickedFeature = feature;
        }
      }
    }

    if (clickedFeature) {
      const previouslySelectedId = this.selected[0];

      if (
        clickedFeature.properties.midPoint &&
        clickedFeature.properties.midPointFeatureId
      ) {
        this.insertMidPoint(clickedFeature.id as string);
        return;
      }

      // If we have something currently selected
      if (previouslySelectedId) {
        // If it maches the current selected feature id, do nothing
        if (previouslySelectedId === clickedFeature.id) {
          return;
        } else {
          // If it's a different feature set selected
          // to false on previously selected feature
          this.store.updateProperty([
            { id: previouslySelectedId, property: "selected", value: false },
          ]);

          // And remove the selection points
          this.deleteSelectionPoints();
          this.deleteMidPoints();

          // Ensure onDeselect event is sent
          this.onDeselect(previouslySelectedId);
        }
      }

      // TODO: Handle multi select?
      this.selected = [clickedFeature.id as string];
      this.store.updateProperty([
        { id: clickedFeature.id as string, property: "selected", value: true },
      ]);
      this.onSelect(clickedFeature.id as string);

      const { type, coordinates } = this.store.getGeometryCopy(
        clickedFeature.id as string
      );

      let selectedCoords: Position[];
      if (type === "LineString") {
        selectedCoords = coordinates;
      } else if (type === "Polygon") {
        selectedCoords = coordinates[0];
      }

      if (selectedCoords) {
        this.createSelectionPoints(selectedCoords);
        this.createMidPoints(selectedCoords, clickedFeature.id as string);
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
      this.deleteMidPoints();
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
    if (!this.selected.length) {
      return;
    }

    // If the selected feature is not draggable
    // don't do anything
    const properties = this.store.getPropertiesCopy(this.selected[0]);
    const featureIsDraggable = this.draggableModes
      .map((draggable) => draggable.mode)
      .includes(properties.mode as string);

    if (!featureIsDraggable) {
      return;
    }

    this.setCursor("grabbing");
    this.dragPosition = [event.lng, event.lat];
    setMapDraggability(false);
  }

  onDrag(event: TerraDrawMouseEvent) {
    const selectedId = this.selected[0];

    // If nothing selected, do nothing
    if (!selectedId) {
      return;
    }

    const properties = this.store.getPropertiesCopy(selectedId);
    const draggable = this.draggableModes.find(
      (draggableMode) => draggableMode.mode === properties.mode
    );

    // If mode is not draggable, return
    if (!draggable) {
      return;
    }

    // Check if coordinate is draggable and is dragged
    if (draggable.coordinate) {
      const coordinateWasDragged = this.dragCoordinate(event);

      if (coordinateWasDragged) {
        return;
      }
    }

    // Check if feature is draggable and is dragged
    if (draggable.feature) {
      this.dragFeature(event);
      this.dragPosition = [event.lng, event.lat];
    }
  }
  onDragEnd(
    _: TerraDrawMouseEvent,
    setMapDraggability: (enabled: boolean) => void
  ) {
    this.setCursor("grab");
    this.dragPosition = undefined;
    setMapDraggability(true);
  }
  onMouseMove() {}
}
