import {
  TerraDrawMouseEvent,
  TerraDrawKeyboardEvent,
  TerraDrawAdapterStyling,
} from "../common";
import { pointInPolygon } from "../geometry/point-in-polygon";
import { getPixelDistanceToLine } from "../geometry/get-pixel-distance-to-line";
import { LineString, Point, Polygon, Position } from "geojson";
import { TerraDrawBaseDrawMode } from "./base.mode";
import { GeoJSONStoreFeatures } from "../store/store";
import { getCoordinatesAsPoints } from "../geometry/get-coordinates-as-points";
import {
  getMidPointCoordinates,
  getMidPoints,
} from "../geometry/get-midpoints";

type TerraDrawSelectModeKeyEvents = {
  deselect: KeyboardEvent["key"];
  delete: KeyboardEvent["key"];
};

type ModeFlags = {
  feature?: {
    draggable?: boolean;
    coordinates?: {
      midpoints?: boolean;
      draggable?: boolean;
      deletable?: boolean;
    };
  };
};

export class TerraDrawSelectMode extends TerraDrawBaseDrawMode {
  mode = "select";

  private dragEventThrottle = 5;
  private dragEventCount = 0;
  private selected: string[] = [];
  private midPoints: string[] = [];
  private selectionPoints: string[] = [];
  private dragPosition: Position;
  private flags: { [mode: string]: ModeFlags };
  private keyEvents: TerraDrawSelectModeKeyEvents;

  constructor(options?: {
    styling?: Partial<TerraDrawAdapterStyling>;
    pointerDistance?: number;
    flags?: { [mode: string]: ModeFlags };
    keyEvents?: TerraDrawSelectModeKeyEvents;
    dragEventThrottle?: number;
  }) {
    super(options);

    this.flags = options && options.flags ? options.flags : {};

    this.keyEvents =
      options && options.keyEvents
        ? options.keyEvents
        : { deselect: "Escape", delete: "Delete" };

    this.dragEventThrottle =
      (options &&
        options.dragEventThrottle !== undefined &&
        options.dragEventThrottle) ||
      5;
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

  private createSelectionPoints(
    selectedCoords: Position[],
    type: Polygon["type"] | LineString["type"],
    featureId: string
  ) {
    this.selectionPoints = this.store.create(
      getCoordinatesAsPoints(selectedCoords, type, (i) => ({
        mode: this.mode,
        selectionPoint: true,
        selectionPointFeatureId: featureId,
        index: i,
      }))
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
    const geometry = this.store.getGeometryCopy<Polygon | LineString>(
      midPointFeatureId as string
    );

    // Update the coordinates to include inserted midpoint
    const updatedCoordinates =
      geometry.type === "Polygon"
        ? geometry.coordinates[0]
        : geometry.coordinates;

    updatedCoordinates.splice(
      (midPointSegment as number) + 1,
      0,
      midPoint.coordinates as Position
    );

    // Update geometry coordinates depending
    // on if a polygon or linestring
    geometry.coordinates =
      geometry.type === "Polygon" ? [updatedCoordinates] : updatedCoordinates;

    // Update the selected features geometry to insert
    // the new midpoint
    this.store.updateGeometry([{ id: midPointFeatureId as string, geometry }]);

    // TODO: is there a way of just updating the selection points rather
    // than fully deleting / recreating?
    // Recreate the selection points

    this.store.delete([...this.midPoints, ...this.selectionPoints]);

    // We don't need to check if flags are correct
    // because selection points are prerequiste for midpoints
    this.createMidPoints(updatedCoordinates, midPointFeatureId as string);
    this.createSelectionPoints(
      updatedCoordinates,
      geometry.type,
      midPointFeatureId as string
    );
  }

  private createMidPoints(selectedCoords: Position[], featureId: string) {
    this.midPoints = this.store.create(
      getMidPoints(
        selectedCoords,
        (i) => ({
          mode: this.mode,
          midPoint: true,
          midPointSegment: i,
          midPointFeatureId: featureId,
        }),
        this.coordinatePrecision
      )
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

    const { clickedFeature } = this.getFeaturesAtMouseEvent(event);

    // If the cursor is not over the selected
    // feature then we don't want to drag
    if (!clickedFeature || clickedFeature.id !== selectedId) {
      return;
    }

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

      const updatedMidPoints = this.midPoints.length
        ? getMidPointCoordinates(updatedCoords, this.coordinatePrecision).map(
            (updatedMidPointCoord, i) => ({
              id: this.midPoints[i] as string,
              geometry: {
                type: "Point",
                coordinates: updatedMidPointCoord,
              } as Point,
            })
          )
        : [];

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

  private dragCoordinate(event: TerraDrawMouseEvent): boolean {
    const selectedId = this.selected[0];

    const geometry = this.store.getGeometryCopy(selectedId);

    let geomCoordinates: Position[];

    if (geometry.type === "Point") {
      // We don't want to handle dragging
      // points here
      return false;
    } else if (geometry.type === "LineString") {
      geomCoordinates = geometry.coordinates;
    } else if (geometry.type === "Polygon") {
      geomCoordinates = geometry.coordinates[0];
    }

    const closestCoordinate = {
      dist: Infinity,
      index: -1,
      isFirstOrLastPolygonCoord: false,
    };

    // Look through the selected features coordinates
    // and try to find a coordinate that is draggable
    for (let i = 0; i < geomCoordinates.length; i++) {
      const coord = geomCoordinates[i];
      const distance = this.distanceBetweenTwoCoords(coord, event);

      if (
        distance < this.pointerDistance &&
        distance < closestCoordinate.dist
      ) {
        // We don't create a point for the final
        // polygon coord, so we must set it to the first
        // coordinate instead
        const isFirstOrLastPolygonCoord =
          geometry.type === "Polygon" &&
          (i === geomCoordinates.length - 1 || i === 0);

        closestCoordinate.dist = distance;
        closestCoordinate.index = isFirstOrLastPolygonCoord ? 0 : i;
        closestCoordinate.isFirstOrLastPolygonCoord = isFirstOrLastPolygonCoord;
      }
    }

    // No coordinate was within the pointer distance
    if (closestCoordinate.index === -1) {
      return false;
    }

    // Store the updated coord
    const updatedCoordinate = [event.lng, event.lat];

    // We want to update the actual Polygon/LineString itself -
    // for Polygons we want the first and last coordinates to match
    if (closestCoordinate.isFirstOrLastPolygonCoord) {
      const lastCoordIndex = geomCoordinates.length - 1;
      geomCoordinates[0] = updatedCoordinate;
      geomCoordinates[lastCoordIndex] = updatedCoordinate;
    } else {
      geomCoordinates[closestCoordinate.index] = updatedCoordinate;
    }

    const updatedSelectionPoints = [
      {
        id: this.selectionPoints[closestCoordinate.index] as string,
        geometry: {
          type: "Point",
          coordinates: updatedCoordinate,
        } as Point,
      },
    ];

    const updatedMidPoints = this.midPoints.length
      ? getMidPointCoordinates(geomCoordinates, this.coordinatePrecision).map(
          (updatedMidPointCoord, i) => ({
            id: this.midPoints[i] as string,
            geometry: {
              type: "Point",
              coordinates: updatedMidPointCoord,
            } as Point,
          })
        )
      : [];

    // Apply all the updates
    this.store.updateGeometry([
      // Update feature
      {
        id: selectedId,
        geometry: geometry,
      },
      // Update selection and mid points
      ...updatedSelectionPoints,
      ...updatedMidPoints,
    ]);

    return true;
  }

  private getFeaturesAtMouseEvent(event: TerraDrawMouseEvent) {
    let clickedFeature: GeoJSONStoreFeatures | undefined = undefined;
    let clickedFeatureDistance = Infinity;
    let clickedMidPoint: GeoJSONStoreFeatures | undefined = undefined;
    let clickedMidPointDistance = Infinity;

    const anyFeaturesSelected = this.selected.length;

    const bbox = this.createClickBoundingBox(event);
    const features = this.store.search(bbox);

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const geometry = feature.geometry;

      if (geometry.type === "Point") {
        // Ignore selection points always, and ignore mid points
        // when nothing is selected
        const isSelectionPoint = feature.properties.selectionPoint;
        const isNonSelectedMidPoint =
          !anyFeaturesSelected && feature.properties.midPoint;

        if (isSelectionPoint || isNonSelectedMidPoint) {
          continue;
        }

        const distance = this.distanceBetweenTwoCoords(
          geometry.coordinates,
          event
        );

        // We want to catch both clicked
        // features but also any midpoints
        // in the clicked area
        if (
          feature.properties.midPoint &&
          distance < this.pointerDistance &&
          distance < clickedMidPointDistance
        ) {
          clickedMidPointDistance = distance;
          clickedMidPoint = feature;
        } else if (
          !feature.properties.midPoint &&
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

    return { clickedFeature, clickedMidPoint };
  }

  private onRightClick(event: TerraDrawMouseEvent) {
    if (!this.selectionPoints) {
      return;
    }

    let clickedSelectionPointProps: {
      selectionPointFeatureId: string;
      index: number;
    };

    let clickedFeatureDistance = Infinity;

    this.selectionPoints.forEach((id: string) => {
      const geometry = this.store.getGeometryCopy<Point>(id);
      const distance = this.distanceBetweenTwoCoords(
        geometry.coordinates,
        event
      );
      if (
        distance < this.pointerDistance &&
        distance < clickedFeatureDistance
      ) {
        clickedFeatureDistance = distance;
        clickedSelectionPointProps = this.store.getPropertiesCopy(id) as {
          selectionPointFeatureId: string;
          index: number;
        };
      }
    });

    if (!clickedSelectionPointProps) {
      return;
    }

    const featureId = clickedSelectionPointProps.selectionPointFeatureId;
    const coordinateIndex = clickedSelectionPointProps.index;

    // We allow for preventing deleting coordinates via flags
    const properties = this.store.getPropertiesCopy(featureId);
    const modeFlags = this.flags[properties.mode as string];

    if (
      !modeFlags ||
      !modeFlags.feature ||
      !modeFlags.feature.coordinates ||
      !modeFlags.feature.coordinates.deletable
    ) {
      return;
    }

    const geometry = this.store.getGeometryCopy(featureId);

    let coordinates;
    if (geometry.type === "Polygon") {
      coordinates = geometry.coordinates[0];

      // Prevent creating an invalid polygon
      if (coordinates.length <= 4) {
        return;
      }
    } else if (geometry.type === "LineString") {
      coordinates = geometry.coordinates;

      // Prevent creating an invalid linestring
      if (coordinates.length <= 3) {
        return;
      }
    }

    if (
      (geometry.type === "Polygon" && coordinateIndex === 0) ||
      coordinateIndex === coordinates.length - 1
    ) {
      // Deleting the final coordinate in a polygon breaks it
      // because GeoJSON expects a duplicate, so we need to fix
      // it by adding the new first coordinate to the end
      coordinates.shift();
      coordinates.pop();
      coordinates.push([coordinates[0][0], coordinates[0][1]]);
    } else {
      // Remove coordinate from array
      coordinates.splice(coordinateIndex, 1);
    }

    this.store.delete([...this.midPoints, ...this.selectionPoints]);
    this.store.updateGeometry([
      {
        id: featureId,
        geometry,
      },
    ]);

    this.createSelectionPoints(
      coordinates,
      geometry.type as "Polygon" | "LineString",
      featureId
    );

    if (
      modeFlags &&
      modeFlags.feature &&
      modeFlags.feature.coordinates &&
      modeFlags.feature.coordinates.midpoints
    ) {
      this.createMidPoints(coordinates, featureId);
    }
  }

  private onLeftClick(event: TerraDrawMouseEvent) {
    const { clickedFeature, clickedMidPoint } = this.getFeaturesAtMouseEvent(
      event
    );

    if (this.selected.length && clickedMidPoint) {
      // TODO: We probably want to make sure the midpoint
      // is visible?

      this.insertMidPoint(clickedMidPoint.id as string);
      return;
    }

    if (clickedFeature) {
      const { mode } = this.store.getPropertiesCopy(
        clickedFeature.id as string
      );

      const previouslySelectedId = this.selected[0];

      // If we have something currently selected
      if (previouslySelectedId) {
        // If it maches the current selected feature id, do nothing
        if (previouslySelectedId === clickedFeature.id) {
          return;
        } else {
          // If it's a different feature set selected
          // to false on previously selected feature
          this.deselect();
        }
      }

      // This will be undefined for points
      const modeFlags = this.flags[mode as string];

      // If feature is not selectable then return
      if (!modeFlags || !modeFlags.feature) {
        return;
      }

      // Select feature
      this.selected = [clickedFeature.id as string];
      this.store.updateProperty([
        { id: clickedFeature.id as string, property: "selected", value: true },
      ]);
      this.onSelect(clickedFeature.id as string);

      // Get the clicked feature
      const { type, coordinates } = this.store.getGeometryCopy(
        clickedFeature.id as string
      );

      let selectedCoords: Position[];
      if (type === "LineString") {
        selectedCoords = coordinates;
      } else if (type === "Polygon") {
        selectedCoords = coordinates[0];
      }

      if (selectedCoords && modeFlags && modeFlags.feature.coordinates) {
        this.createSelectionPoints(
          selectedCoords,
          type,
          clickedFeature.id as string
        );

        if (modeFlags.feature.coordinates.midpoints) {
          this.createMidPoints(selectedCoords, clickedFeature.id as string);
        }
      }
    } else if (this.selected.length) {
      this.deselect();
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
    if (event.button === "right") {
      this.onRightClick(event);
      return;
    } else if (event.button === "left") {
      this.onLeftClick(event);
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
    const modeFlags = this.flags[properties.mode as string];
    const draggable =
      modeFlags &&
      modeFlags.feature &&
      (modeFlags.feature.draggable ||
        (modeFlags.feature.coordinates &&
          modeFlags.feature.coordinates.draggable));

    if (!draggable) {
      return;
    }

    this.dragEventCount = 0;
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
    const modeFlags = this.flags[properties.mode as string];

    // Ensure drag count is incremented
    this.dragEventCount++;

    // Return if we haven't hit the drag throttle limit
    // (i.e. we only want to drag every nth event)
    if (this.dragEventCount % this.dragEventThrottle === 0) {
      return;
    }

    // Check if coordinate is draggable and is dragged
    if (
      modeFlags &&
      modeFlags.feature &&
      modeFlags.feature.coordinates &&
      modeFlags.feature.coordinates.draggable
    ) {
      const coordinateWasDragged = this.dragCoordinate(event);

      if (coordinateWasDragged) {
        return;
      }
    }

    // Check if feature is draggable and is dragged
    if (modeFlags && modeFlags.feature && modeFlags.feature.draggable) {
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

  onMouseMove(event: TerraDrawMouseEvent) {
    if (!this.selected.length || this.dragPosition) {
      return;
    }

    let nearbySelectionPoint = false;
    this.midPoints.forEach((id: string) => {
      if (nearbySelectionPoint) {
        return;
      }
      const geometry = this.store.getGeometryCopy<Point>(id);
      const distance = this.distanceBetweenTwoCoords(
        geometry.coordinates,
        event
      );
      if (distance < this.pointerDistance) {
        nearbySelectionPoint = true;
      }
    });

    // TODO: Is there a cleaner way to handle prioritising
    // dragging selection points?
    this.selectionPoints.forEach((id: string) => {
      const geometry = this.store.getGeometryCopy<Point>(id);
      const distance = this.distanceBetweenTwoCoords(
        geometry.coordinates,
        event
      );
      if (distance < this.pointerDistance) {
        nearbySelectionPoint = false;
      }
    });
    if (nearbySelectionPoint) {
      this.setCursor("crosshair");
    } else {
      this.setCursor("unset");
    }
  }
}
