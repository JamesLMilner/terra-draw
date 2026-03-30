import {
	CartesianPoint,
	SELECT_PROPERTIES,
	TerraDrawMouseEvent,
	UpdateTypes,
} from "../../../common";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { Feature, LineString, Polygon, Position, Point } from "geojson";
import { SelectionPointBehavior } from "./selection-point.behavior";
import { MidPointBehavior } from "./midpoint.behavior";
import {
	transformRotate,
	transformRotateWebMercator,
} from "../../../geometry/transform/rotate";
import { centroid } from "../../../geometry/centroid";
import { rhumbBearing } from "../../../geometry/measure/rhumb-bearing";
import { limitPrecision } from "../../../geometry/limit-decimal-precision";
import { FeatureId, GeoJSONStoreFeatures } from "../../../store/store";
import { webMercatorCentroid } from "../../../geometry/web-mercator-centroid";
import { lngLatToWebMercatorXY } from "../../../geometry/project/web-mercator";
import { webMercatorBearing } from "../../../geometry/measure/bearing";
import { CoordinatePointBehavior } from "./coordinate-point.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import {
	MutateFeatureBehavior,
	Mutations,
	UpdateGeometry,
} from "../../mutate-feature.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";

const DRAG_HANDLE_OFFSET_PX = 60;
const DRAG_HANDLE_THRESHOLD_PX = 15;

export class RotateFeatureBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly selectionPoints: SelectionPointBehavior,
		private readonly midPoints: MidPointBehavior,
		private readonly coordinatePoints: CoordinatePointBehavior,
		private readonly readFeature: ReadFeatureBehavior,
		private readonly mutateFeature: MutateFeatureBehavior,
		private readonly pixelDistance: PixelDistanceBehavior,
	) {
		super(config);
	}

	private lastBearing: number | undefined;
	private selectedGeometry: Polygon | LineString | undefined;
	private selectedGeometryCentroid: Position | undefined;
	private selectedGeometryWebMercatorCentroid: CartesianPoint | undefined;
	private dragHandleId!: FeatureId | undefined;
	private dragHandleInitialPosition?: Position;

	reset() {
		this.lastBearing = undefined;
		this.selectedGeometry = undefined;
		this.selectedGeometryWebMercatorCentroid = undefined;
		this.selectedGeometryCentroid = undefined;
		this.destroyDragHandle();
	}

	public getNearestRotateHandle(event: TerraDrawMouseEvent) {
		if (!this.dragHandleId) return;

		const distancePixles = this.pixelDistance.measure(
			event,
			this.readFeature.getGeometry<Point>(this.dragHandleId).coordinates,
		);

		if (distancePixles <= DRAG_HANDLE_THRESHOLD_PX) {
			return this.dragHandleId;
		}

		return;
	}

	public createDragHandle({
		featureId,
		featureCoordinates,
	}: {
		featureId: FeatureId;
		featureCoordinates: Position[] | Position[][];
	}) {
		const dragHandlePosition = this.calculateHandlePosition({
			featureCoordinates,
		});

		const id = this.mutateFeature.createGuidancePoint({
			coordinate: dragHandlePosition,
			type: "rotationPoint",
			additionalProperties: {
				[SELECT_PROPERTIES.ROTATION_POINT]: featureId,
			},
		});

		this.dragHandleId = id;
		this.dragHandleInitialPosition = dragHandlePosition;

		return id;
	}

	public updateDragHandleInPlace({
		featureCoordinates,
	}: {
		featureCoordinates: Position[] | Position[][];
	}) {
		if (!this.dragHandleId || !this.dragHandleInitialPosition) return;

		const dragHandlePosition = this.calculateHandlePosition({
			featureCoordinates,
		});

		this.mutateFeature.updatePoint({
			featureId: this.dragHandleId,
			coordinateMutations: {
				coordinates: dragHandlePosition,
				type: Mutations.Replace,
			},
			context: {
				updateType: UpdateTypes.Commit,
			},
		});
	}

	public destroyDragHandle() {
		this.mutateFeature.deleteFeatureIfPresent(this.dragHandleId);
		this.dragHandleId = undefined;
	}

	public stopDragging({
		featureCoordinates,
	}: {
		featureCoordinates: Position[] | Position[][];
	}) {
		this.updateDragHandleInPlace({ featureCoordinates });
		this.lastBearing = 0;
	}

	public isDragging() {
		return !!this.dragHandleId;
	}

	private calculateHandlePosition({
		featureCoordinates,
	}: {
		featureCoordinates: Position[] | Position[][];
	}): Position {
		const [minX, _, maxX, maxY] = bbox(featureCoordinates);
		const lng = minX + (maxX - minX) / 2;
		const lat = maxY;
		const referencePointPixelSpace = this.project(lng, lat);
		const handlePositionPixelSpace = {
			...referencePointPixelSpace,
			y: referencePointPixelSpace.y - DRAG_HANDLE_OFFSET_PX,
		};
		const handlePositionWorldSpace = this.unproject(
			handlePositionPixelSpace.x,
			handlePositionPixelSpace.y,
		);
		return [handlePositionWorldSpace.lng, handlePositionWorldSpace.lat];
	}

	rotate(event: TerraDrawMouseEvent, selectedId: FeatureId) {
		if (!this.selectedGeometry) {
			this.selectedGeometry = this.readFeature.getGeometry<
				LineString | Polygon
			>(selectedId);
		}

		let dragHandleGeom: Point | undefined;
		const geometry = this.selectedGeometry;

		if (this.dragHandleId) {
			dragHandleGeom = this.readFeature.getGeometry<Point>(this.dragHandleId);
		}

		// Update the geometry of the dragged feature
		if (geometry.type !== "Polygon" && geometry.type !== "LineString") {
			return;
		}

		const mouseCoord = [event.lng, event.lat];

		let bearing: number;
		let updateDragHandleFeature: Feature<Point> | undefined;
		const updatedFeature = { type: "Feature", geometry, properties: {} } as
			| Feature<Polygon>
			| Feature<LineString>;

		if (dragHandleGeom) {
			updateDragHandleFeature = {
				type: "Feature",
				geometry: dragHandleGeom,
				properties: {},
			} as Feature<Point>;
		}

		if (this.config.projection === "web-mercator") {
			// Cache the centroid of the selected geometry
			// to avoid recalculating it on every cursor move
			if (!this.selectedGeometryWebMercatorCentroid) {
				this.selectedGeometryWebMercatorCentroid =
					webMercatorCentroid(updatedFeature);
			}

			const cursorWebMercator = lngLatToWebMercatorXY(event.lng, event.lat);

			bearing = webMercatorBearing(
				this.selectedGeometryWebMercatorCentroid,
				cursorWebMercator,
			);

			if (bearing === 0) {
				return;
			}

			if (!this.lastBearing) {
				this.lastBearing = bearing;
				return;
			}

			const angle = this.lastBearing - bearing;

			transformRotateWebMercator(
				updatedFeature,
				-angle,
				this.selectedGeometryWebMercatorCentroid,
			);

			updateDragHandleFeature &&
				transformRotateWebMercator(
					updateDragHandleFeature,
					-angle,
					this.selectedGeometryWebMercatorCentroid,
				);
		} else if (this.config.projection === "globe") {
			// Cache the centroid of the selected geometry
			// to avoid recalculating it on every cursor move
			if (!this.selectedGeometryCentroid) {
				this.selectedGeometryCentroid = centroid({
					type: "Feature",
					geometry,
					properties: {},
				});
			}

			bearing = rhumbBearing(this.selectedGeometryCentroid, mouseCoord);

			// We need an original bearing to compare against
			if (!this.lastBearing) {
				this.lastBearing = bearing + 180;
				return;
			}

			const angle = this.lastBearing - (bearing + 180);

			transformRotate(updatedFeature, -angle);
		} else {
			throw new Error("Unsupported projection");
		}

		// Coordinates are either polygon or linestring at this point
		const updatedCoords: Position[] =
			geometry.type === "Polygon"
				? geometry.coordinates[0]
				: geometry.coordinates;

		// Ensure that coordinate precision is maintained
		updatedCoords.forEach((coordinate) => {
			coordinate[0] = limitPrecision(coordinate[0], this.coordinatePrecision);
			coordinate[1] = limitPrecision(coordinate[1], this.coordinatePrecision);
		});

		const update = {
			featureId: selectedId,
			coordinateMutations: {
				type: Mutations.Replace,
				coordinates:
					geometry.type === "Polygon" ? [updatedCoords] : updatedCoords,
			},
			context: {
				updateType: UpdateTypes.Provisional as const,
			},
		};

		if (updateDragHandleFeature) {
			this.mutateFeature.updatePoint({
				featureId: this.dragHandleId!,
				coordinateMutations: {
					coordinates: updateDragHandleFeature.geometry.coordinates,
					type: Mutations.Replace,
				},
				context: {
					updateType: UpdateTypes.Commit,
				},
			});
		}

		let updated: GeoJSONStoreFeatures<Polygon | LineString> | null = null;
		if (updatedFeature.geometry.type === "Polygon") {
			updated = this.mutateFeature.updatePolygon(
				update as UpdateGeometry<Polygon>,
			);
		} else if (updatedFeature.geometry.type === "LineString") {
			updated = this.mutateFeature.updateLineString(
				update as UpdateGeometry<LineString>,
			);
		} else {
			return;
		}

		if (!updated) {
			return false;
		}

		const featureCoordinates = updated.geometry.coordinates;

		// Perform the update to the midpoints and selection points
		this.midPoints.updateAllInPlace({ featureCoordinates });
		this.selectionPoints.updateAllInPlace({ featureCoordinates });
		this.coordinatePoints.updateAllInPlace({
			featureId: selectedId,
			featureCoordinates,
		});

		if (this.projection === "web-mercator") {
			this.lastBearing = bearing;
		} else if (this.projection === "globe") {
			this.lastBearing = bearing + 180;
		}
	}
}

type BBox = [number, number, number, number]; // [minX, minY, maxX, maxY]

function bbox(coordinates: Position[] | Position[][]): BBox {
	const isSingleRing = typeof coordinates[0]?.[0] === "number";
	const allPoints = isSingleRing
		? (coordinates as Position[])
		: (coordinates as Position[][]).flat();
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;

	for (const [x, y] of allPoints) {
		if (x <= minX) minX = x;
		if (x >= maxX) maxX = x;
		if (y <= minY) minY = y;
		if (y >= maxY) maxY = y;
	}

	return [minX, minY, maxX, maxY];
}
