import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	CartesianPoint,
	Z_INDEX,
	Snapping,
	COMMON_PROPERTIES,
	FinishActions,
} from "../../common";
import { Feature, LineString, Position } from "geojson";
import {
	BaseModeOptions,
	CustomStyling,
	ModeUpdateOptions,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { BehaviorConfig } from "../base.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { CoordinateSnappingBehavior } from "../coordinate-snapping.behavior";
import { getDefaultStyling } from "../../util/styling";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { InsertCoordinatesBehavior } from "../insert-coordinates.behavior";
import { haversineDistanceKilometers } from "../../geometry/measure/haversine-distance";
import { coordinatesIdentical } from "../../geometry/coordinates-identical";
import { ValidateLineStringFeature } from "../../validations/linestring.validation";
import { LineSnappingBehavior } from "../line-snapping.behavior";
import {
	MutateFeatureBehavior,
	Mutations,
	ReplaceMutation,
	type CoordinateMutation,
} from "../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../read-feature.behavior";
import { ClosingPointsBehavior } from "../closing-points.behavior";
import { CoordinatePointBehavior } from "../select/behaviors/coordinate-point.behavior";

type TerraDrawLineStringModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" } as const;

type LineStringStyling = {
	lineStringWidth: NumericStyling;
	lineStringColor: HexColorStyling;
	closingPointColor: HexColorStyling;
	closingPointWidth: NumericStyling;
	closingPointOutlineColor: HexColorStyling;
	closingPointOutlineWidth: NumericStyling;
	snappingPointColor: HexColorStyling;
	snappingPointWidth: NumericStyling;
	snappingPointOutlineColor: HexColorStyling;
	snappingPointOutlineWidth: NumericStyling;
	coordinatePointColor: HexColorStyling;
	coordinatePointWidth: NumericStyling;
	coordinatePointOutlineColor: HexColorStyling;
	coordinatePointOutlineWidth: NumericStyling;
};

interface Cursors {
	start?: Cursor;
	close?: Cursor;
	dragStart?: Cursor;
	dragEnd?: Cursor;
}

const defaultCursors = {
	start: "crosshair",
	close: "pointer",
	dragStart: "grabbing",
	dragEnd: "crosshair",
} as Required<Cursors>;

interface InertCoordinates {
	strategy: "amount"; // In future this could be extended
	value: number;
}

interface TerraDrawLineStringModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	snapping?: Snapping;
	pointerDistance?: number;
	keyEvents?: TerraDrawLineStringModeKeyEvents | null;
	cursors?: Cursors;
	insertCoordinates?: InertCoordinates;
	editable?: boolean;
	showCoordinatePoints?: boolean;
	finishOnNthCoordinate?: number;
}

export class TerraDrawLineStringMode extends TerraDrawBaseDrawMode<LineStringStyling> {
	mode = "linestring";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private keyEvents: TerraDrawLineStringModeKeyEvents = defaultKeyEvents;
	private snapping: Snapping | undefined;
	private cursors: Required<Cursors> = defaultCursors;
	private mouseMove = false;
	private insertCoordinates: InertCoordinates | undefined;
	private lastCommittedCoordinates: Position[] | undefined;
	private snappedPointId: FeatureId | undefined;
	private lastMouseMoveEvent: TerraDrawMouseEvent | undefined;
	private showCoordinatePoints = false;
	private finishOnNthCoordinate: number | undefined;

	// Editable properties
	private editable: boolean = false;
	private editedFeatureId: FeatureId | undefined;
	private editedFeatureCoordinateIndex: number | undefined;
	private editedSnapType: "line" | "coordinate" | undefined;
	private editedInsertIndex: number | undefined;
	private editedPointId: FeatureId | undefined;

	// Behaviors
	private coordinateSnapping!: CoordinateSnappingBehavior;
	private insertPoint!: InsertCoordinatesBehavior;
	private lineSnapping!: LineSnappingBehavior;
	private pixelDistance!: PixelDistanceBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;
	private mutateFeature!: MutateFeatureBehavior;
	private readFeature!: ReadFeatureBehavior;
	private closingPoints!: ClosingPointsBehavior;
	private coordinatePoints!: CoordinatePointBehavior;

	constructor(options?: TerraDrawLineStringModeOptions<LineStringStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	updateOptions(
		options?: ModeUpdateOptions<
			TerraDrawLineStringModeOptions<LineStringStyling>
		>,
	) {
		super.updateOptions(options);

		if (
			options?.finishOnNthCoordinate !== undefined &&
			Number.isInteger(options.finishOnNthCoordinate) &&
			options.finishOnNthCoordinate > 1
		) {
			this.finishOnNthCoordinate = Math.floor(options.finishOnNthCoordinate);
		}

		if (options?.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		if (options?.snapping) {
			this.snapping = options.snapping;
		}

		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else if (options?.keyEvents) {
			this.keyEvents = { ...this.keyEvents, ...options.keyEvents };
		}

		if (options?.insertCoordinates) {
			this.insertCoordinates = options.insertCoordinates;
		}

		if (options && options.editable) {
			this.editable = options.editable;
		}

		if (options?.showCoordinatePoints !== undefined) {
			this.showCoordinatePoints = options.showCoordinatePoints;

			// If we are showing coordinate points, we need to add them all
			if (this.coordinatePoints && options.showCoordinatePoints === true) {
				const features = this.store.copyAllWhere(
					(properties) => properties.mode === this.mode,
				);
				features.forEach((feature) => {
					this.coordinatePoints.createOrUpdate({
						featureId: feature.id as FeatureId,
						featureCoordinates: feature.geometry.coordinates as Position[],
					});
				});
			} else if (this.coordinatePoints && this.showCoordinatePoints === false) {
				const featuresWithCoordinates = this.store.copyAllWhere(
					(properties) =>
						properties.mode === this.mode &&
						Boolean(
							(
								properties[
									COMMON_PROPERTIES.COORDINATE_POINT_IDS
								] as FeatureId[]
							)?.length,
						),
				);

				this.coordinatePoints.deletePointsByFeatureIds(
					featuresWithCoordinates.map((f) => f.id as FeatureId),
				);
			}
		}
	}

	private shouldFinishOnCommit(geometry: LineString) {
		if (!this.finishOnNthCoordinate) {
			return false;
		}
		// While drawing, LineString coordinates contain a trailing "live" coordinate.
		// Committed coordinates exclude that last "live" coordinate.
		const committedCoordinateCount = Math.max(
			0,
			geometry.coordinates.length - 1,
		);
		return committedCoordinateCount >= this.finishOnNthCoordinate;
	}

	private updateSnappedCoordinate(event: TerraDrawMouseEvent) {
		const snappedCoordinate = this.snapCoordinate(event);

		if (snappedCoordinate) {
			if (this.snappedPointId) {
				this.mutateFeature.updateGuidancePoints([
					{
						featureId: this.snappedPointId,
						coordinate: snappedCoordinate,
					},
				]);
			} else {
				this.snappedPointId = this.mutateFeature.createGuidancePoint({
					coordinate: snappedCoordinate,
					type: COMMON_PROPERTIES.SNAPPING_POINT,
				});
			}

			event.lng = snappedCoordinate[0];
			event.lat = snappedCoordinate[1];
		} else if (this.snappedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
			this.snappedPointId = undefined;
		}

		return snappedCoordinate;
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		const updated = this.mutateFeature.updateLineString({
			featureId: this.currentId,
			context: { updateType: UpdateTypes.Finish, action: FinishActions.Draw },
			coordinateMutations: [
				{
					type: Mutations.Delete,
					index: -1,
				},
			],
			propertyMutations: {
				[COMMON_PROPERTIES.CURRENTLY_DRAWING]: undefined,
			},
		});

		if (!updated) {
			return;
		}

		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId: this.currentId,
				featureCoordinates: updated.geometry.coordinates,
			});
		}

		const featureId = this.currentId;

		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.lastCommittedCoordinates = undefined;

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		this.closingPoints.delete();

		if (this.snappedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
			this.snappedPointId = undefined;
		}

		if (this.editedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.editedPointId);
			this.editedPointId = undefined;

			// Reset edit state
			this.editedFeatureId = undefined;
			this.editedFeatureCoordinateIndex = undefined;
			this.editedInsertIndex = undefined;
			this.editedSnapType = undefined;
		}

		this.onFinish(featureId, { mode: this.mode, action: FinishActions.Draw });
	}

	private generateInsertCoordinates(startCoord: Position, endCoord: Position) {
		if (!this.insertCoordinates || !this.lastCommittedCoordinates) {
			throw new Error("Not able to insert coordinates");
		}

		// Other strategies my be implemented in the future
		if (this.insertCoordinates.strategy !== "amount") {
			throw new Error("Strategy does not exist");
		}

		const distance = haversineDistanceKilometers(startCoord, endCoord);
		const segmentDistance = distance / (this.insertCoordinates.value + 1);
		let insertedCoordinates: Position[] = [];

		if (this.projection === "globe") {
			insertedCoordinates =
				this.insertPoint.generateInsertionGeodesicCoordinates(
					startCoord,
					endCoord,
					segmentDistance,
				);
		} else if (this.projection === "web-mercator") {
			insertedCoordinates = this.insertPoint.generateInsertionCoordinates(
				startCoord,
				endCoord,
				segmentDistance,
			);
		}

		return insertedCoordinates;
	}

	private createLine(startingCoord: Position) {
		const created = this.mutateFeature.createLineString({
			coordinates: [
				startingCoord,
				startingCoord, // This is the 'live' point that changes on mouse move
			],
			properties: {
				mode: this.mode,
				[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
			},
		});

		this.lastCommittedCoordinates = created.geometry.coordinates;
		this.currentId = created.id as FeatureId;
		this.currentCoordinate++;
		this.setDrawing();

		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId: this.currentId,
				featureCoordinates: created.geometry.coordinates,
			});
		}
	}

	private firstUpdateToLine(updatedCoord: Position) {
		if (!this.currentId) {
			return;
		}

		// We are creating the point so we immediately want
		// to set the point cursor to show it can be closed
		this.setCursor(this.cursors.close);

		const updated = this.mutateFeature.updateLineString({
			featureId: this.currentId,
			context: { updateType: UpdateTypes.Commit },
			coordinateMutations: [
				{
					type: Mutations.InsertAfter,
					index: -1,
					coordinate: updatedCoord,
				},
			],
		});

		if (!updated) {
			return;
		}

		this.closingPoints.create(updated.geometry.coordinates);

		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId: this.currentId,
				featureCoordinates: updated.geometry.coordinates,
			});
		}

		this.lastCommittedCoordinates = updated.geometry.coordinates;
		this.currentCoordinate++;

		if (this.shouldFinishOnCommit(updated.geometry)) {
			this.close();
		}
	}

	private updateToLine(event: TerraDrawMouseEvent, updatedCoord: Position) {
		if (!this.currentId) {
			return;
		}

		const { isClosing } = this.closingPoints.isLineStringClosingPoint(event);

		// If the pointer is hovered over the closing point we show the close cursor
		if (isClosing) {
			this.close();
			return;
		}

		// The cursor will immediately change to closing because the
		// closing point will be underneath the cursor
		this.setCursor(this.cursors.close);

		const updated = this.mutateFeature.updateLineString({
			featureId: this.currentId,
			context: { updateType: UpdateTypes.Commit },
			coordinateMutations: [
				{ type: Mutations.InsertAfter, index: -1, coordinate: updatedCoord },
			],
		});

		if (!updated) {
			return;
		}

		this.closingPoints.update(updated.geometry.coordinates);

		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId: this.currentId,
				featureCoordinates: updated.geometry.coordinates,
			});
		}

		this.lastCommittedCoordinates = updated.geometry.coordinates;

		this.currentCoordinate++;

		if (this.shouldFinishOnCommit(updated.geometry)) {
			this.close();
		}
	}

	/** @internal */
	registerBehaviors(config: BehaviorConfig) {
		this.insertPoint = new InsertCoordinatesBehavior(config);
		this.clickBoundingBox = new ClickBoundingBoxBehavior(config);
		this.pixelDistance = new PixelDistanceBehavior(config);
		this.lineSnapping = new LineSnappingBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
		this.coordinateSnapping = new CoordinateSnappingBehavior(
			config,
			this.pixelDistance,
			this.clickBoundingBox,
		);
		this.readFeature = new ReadFeatureBehavior(config);
		this.mutateFeature = new MutateFeatureBehavior(config, {
			validate: this.validate,
		});
		this.closingPoints = new ClosingPointsBehavior(
			config,
			this.pixelDistance,
			this.mutateFeature,
			this.readFeature,
		);
		this.coordinatePoints = new CoordinatePointBehavior(
			config,
			this.readFeature,
			this.mutateFeature,
		);
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setCursor(this.cursors.start);
	}

	/** @internal */
	stop() {
		this.cleanUp();
		this.setStopped();
		this.setCursor("unset");
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.mouseMove = true;
		this.setCursor(this.cursors.start);
		this.lastMouseMoveEvent = event;

		const snappedCoordinate = this.updateSnappedCoordinate(event);

		const updatedCoord = snappedCoordinate
			? snappedCoordinate
			: [event.lng, event.lat];

		if (this.currentId === undefined || this.currentCoordinate === 0) {
			return;
		}

		const { isClosing } = this.closingPoints.isLineStringClosingPoint(event);

		// If the pointer is hovered over the closing point we show the close cursor
		if (isClosing) {
			this.setCursor(this.cursors.close);
		}

		// Default mutation is just to update the final coordinate
		let coordinateMutations:
			| CoordinateMutation[]
			| ReplaceMutation<LineString> = [
			{
				type: Mutations.Update,
				index: -1,
				coordinate: updatedCoord,
			},
		];

		if (this.insertCoordinates) {
			const insertCoordinates = this.getInsertCoordinates(updatedCoord);

			if (insertCoordinates) {
				coordinateMutations = {
					type: Mutations.Replace,
					coordinates: insertCoordinates,
				};
			}
		}

		const updated = this.mutateFeature.updateLineString({
			coordinateMutations,
			featureId: this.currentId,
			context: { updateType: UpdateTypes.Provisional },
		});

		// Keep coordinate points in sync with the provisional "live" coordinate
		if (updated && this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId: this.currentId,
				featureCoordinates: updated.geometry.coordinates,
			});
		}
	}

	private getInsertCoordinates(endCoord: Position) {
		if (!this.lastCommittedCoordinates) {
			return;
		}

		const index = this.lastCommittedCoordinates.length - 1;
		const startCoord = this.lastCommittedCoordinates[index];

		if (coordinatesIdentical(startCoord, endCoord)) {
			return;
		}

		const insertedCoordinates = this.generateInsertCoordinates(
			startCoord,
			endCoord,
		);

		const startCoordinates = this.lastCommittedCoordinates.slice(0, -1);

		return [...startCoordinates, ...insertedCoordinates, endCoord];
	}

	private onRightClick(event: TerraDrawMouseEvent) {
		if (!this.editable || this.state !== "started") {
			return;
		}

		const { featureId, featureCoordinateIndex: coordinateIndex } =
			this.coordinateSnapping.getSnappable(event, (feature) =>
				this.lineStringFilter(feature),
			);

		if (!featureId || coordinateIndex === undefined) {
			return;
		}

		const geometry = this.readFeature.getGeometry(featureId);

		let coordinates;
		if (geometry.type === "LineString") {
			coordinates = geometry.coordinates;

			// Prevent creating an invalid linestring
			if (coordinates.length <= 2) {
				return;
			}
		} else {
			return;
		}

		const updated = this.mutateFeature.updateLineString({
			featureId,
			coordinateMutations: [{ type: Mutations.Delete, index: coordinateIndex }],
			context: { updateType: UpdateTypes.Finish, action: FinishActions.Edit },
		});

		if (updated && this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId,
				featureCoordinates: updated.geometry.coordinates,
			});
		}

		if (this.snappedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
			this.snappedPointId = undefined;
		}

		if (this.editedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.editedPointId);
			this.editedPointId = undefined;

			// Reset edit state
			this.editedFeatureId = undefined;
			this.editedFeatureCoordinateIndex = undefined;
			this.editedInsertIndex = undefined;
			this.editedSnapType = undefined;
		}

		this.closingPoints.delete();

		this.onFinish(featureId, {
			mode: this.mode,
			action: FinishActions.DeleteCoordinate,
		});
	}

	private onLeftClick(event: TerraDrawMouseEvent) {
		// Reset the snapping point
		if (this.snappedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
			this.snappedPointId = undefined;
		}

		const snappedCoordinate = this.snapCoordinate(event);
		const updatedCoordinate = snappedCoordinate
			? snappedCoordinate
			: [event.lng, event.lat];

		if (this.currentCoordinate === 0) {
			this.createLine(updatedCoordinate);
		} else if (this.currentCoordinate === 1 && this.currentId) {
			this.firstUpdateToLine(updatedCoordinate);
		} else if (this.currentId) {
			this.updateToLine(event, updatedCoordinate);
		}
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		if (
			this.currentId !== undefined &&
			!this.readFeature.hasFeature(this.currentId)
		) {
			this.cleanUp();
		}

		if (
			(event.button === "right" &&
				this.allowPointerEvent(this.pointerEvents.rightClick, event)) ||
			(event.button === "left" &&
				this.allowPointerEvent(this.pointerEvents.leftClick, event)) ||
			(event.isContextMenu &&
				this.allowPointerEvent(this.pointerEvents.contextMenu, event))
		) {
			// We want pointer devices (mobile/tablet) to have
			// similar behaviour to mouse based devices so we
			// trigger a mousemove event before every click
			// if one has not been triggered to emulate this
			if (this.currentCoordinate > 0 && !this.mouseMove) {
				this.onMouseMove(event);
			}
			this.mouseMove = false;

			if (event.button === "right") {
				this.onRightClick(event);
			} else if (event.button === "left") {
				this.onLeftClick(event);
			}
		}
	}

	/** @internal */
	onKeyDown() {
		// no-op
	}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		}

		if (event.key === this.keyEvents.finish) {
			this.close();
		}
	}

	/** @internal */
	onDragStart(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDragStart, event)) {
			return;
		}

		if (!this.editable) {
			return;
		}

		let snappedCoordinate: Position | undefined = undefined;

		if (this.state === "started") {
			const lineSnapped = this.lineSnapping.getSnappable(event, (feature) =>
				this.lineStringFilter(feature),
			);

			if (lineSnapped.coordinate) {
				this.editedSnapType = "line";
				this.editedFeatureCoordinateIndex = lineSnapped.featureCoordinateIndex;
				this.editedFeatureId = lineSnapped.featureId;
				snappedCoordinate = lineSnapped.coordinate;
			}

			const coordinateSnapped = this.coordinateSnapping.getSnappable(
				event,
				(feature) => this.lineStringFilter(feature),
			);

			if (coordinateSnapped.coordinate) {
				this.editedSnapType = "coordinate";
				this.editedFeatureCoordinateIndex =
					coordinateSnapped.featureCoordinateIndex;
				this.editedFeatureId = coordinateSnapped.featureId;
				snappedCoordinate = coordinateSnapped.coordinate;
			}
		}

		// We only need to stop the map dragging if
		// we actually have something selected
		if (!this.editedFeatureId || !snappedCoordinate) {
			return;
		}

		// Create a point to drag when editing
		if (!this.editedPointId) {
			this.editedPointId = this.mutateFeature.createGuidancePoint({
				coordinate: snappedCoordinate,
				type: COMMON_PROPERTIES.EDITED,
			});
		}

		// Drag Feature
		this.setCursor(this.cursors.dragStart);

		setMapDraggability(false);
	}

	/** @internal */
	onDrag(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDrag, event)) {
			return;
		}

		if (
			this.editedFeatureId === undefined ||
			this.editedFeatureCoordinateIndex === undefined
		) {
			return;
		}

		// Either it's a coordinate drag or a line drag where the line coordinate has already been inserted
		if (
			this.editedSnapType === "coordinate" ||
			(this.editedSnapType === "line" && this.editedInsertIndex !== undefined)
		) {
			const updated = this.mutateFeature.updateLineString({
				featureId: this.editedFeatureId,
				context: { updateType: UpdateTypes.Provisional },
				coordinateMutations: [
					{
						type: Mutations.Update,
						index: this.editedFeatureCoordinateIndex,
						coordinate: [event.lng, event.lat],
					},
				],
			});

			if (!updated) {
				return;
			}

			if (this.showCoordinatePoints) {
				// If a point was inserted we need to update all coordinate points
				if (this.editedInsertIndex !== undefined) {
					this.coordinatePoints.createOrUpdate({
						featureId: this.editedFeatureId,
						featureCoordinates: updated.geometry.coordinates,
					});
				}
				// Else we are only updating one point
				else {
					this.coordinatePoints.updateOneAtIndex(
						this.editedFeatureId,
						this.editedFeatureCoordinateIndex,
						[event.lng, event.lat],
					);
				}
			}
		} else if (
			this.editedSnapType === "line" &&
			this.editedInsertIndex === undefined
		) {
			// Splice inserts _before_ the index, so we need to add 1
			this.editedInsertIndex = this.editedFeatureCoordinateIndex + 1;

			const inserted = this.mutateFeature.updateLineString({
				featureId: this.editedFeatureId,
				context: { updateType: UpdateTypes.Provisional },
			});

			if (!inserted) {
				return;
			}

			if (this.showCoordinatePoints) {
				this.coordinatePoints.createOrUpdate({
					featureId: this.editedFeatureId,
					featureCoordinates: inserted.geometry.coordinates,
				});
			}

			// We have inserted a point, need to change the edit index
			// so it can be moved correctly when it gets dragged again
			this.editedFeatureCoordinateIndex++;
		}

		if (this.snapping && this.snappedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
			this.snappedPointId = undefined;
		}

		if (this.editedPointId) {
			this.mutateFeature.updateGuidancePoints([
				{
					featureId: this.editedPointId,
					coordinate: [event.lng, event.lat],
				},
			]);
		}

		this.mutateFeature.updateLineString({
			featureId: this.editedFeatureId,
			context: { updateType: UpdateTypes.Provisional },
			propertyMutations: { [COMMON_PROPERTIES.EDITED]: true },
		});
	}

	/** @internal */
	onDragEnd(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDragEnd, event)) {
			return;
		}

		if (this.editedFeatureId === undefined) {
			return;
		}

		this.setCursor(this.cursors.dragEnd);

		const updated = this.mutateFeature.updateLineString({
			featureId: this.editedFeatureId,
			propertyMutations: { [COMMON_PROPERTIES.EDITED]: false },
			context: { updateType: UpdateTypes.Finish, action: FinishActions.Edit },
		});

		if (!updated) {
			return;
		}

		const featureId = this.editedFeatureId;

		setMapDraggability(true);

		if (this.snappedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId);
			this.snappedPointId = undefined;
		}

		if (this.editedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.editedPointId);
			this.editedPointId = undefined;

			// Reset edit state
			this.editedFeatureId = undefined;
			this.editedFeatureCoordinateIndex = undefined;
			this.editedInsertIndex = undefined;
			this.editedSnapType = undefined;
		}

		this.closingPoints.delete();

		this.onFinish(featureId, { mode: this.mode, action: FinishActions.Edit });
	}

	/** @internal */
	cleanUp() {
		const currentId = this.currentId;
		const snappedPointId = this.snappedPointId;

		this.snappedPointId = undefined;
		this.currentId = undefined;
		this.currentCoordinate = 0;
		if (this.state === "drawing") {
			this.setStarted();
		}

		if (currentId && this.showCoordinatePoints) {
			this.coordinatePoints.deletePointsByFeatureIds([currentId]);
		}

		this.mutateFeature.deleteFeatureIfPresent(currentId);
		this.mutateFeature.deleteFeatureIfPresent(snappedPointId);
		this.closingPoints.delete();
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.type === "Feature" &&
			feature.geometry.type === "LineString" &&
			feature.properties.mode === this.mode
		) {
			styles.lineStringColor = this.getHexColorStylingValue(
				this.styles.lineStringColor,
				styles.lineStringColor,
				feature,
			);

			styles.lineStringWidth = this.getNumericStylingValue(
				this.styles.lineStringWidth,
				styles.lineStringWidth,
				feature,
			);

			styles.zIndex = Z_INDEX.LAYER_ONE;

			return styles;
		} else if (
			feature.type === "Feature" &&
			feature.geometry.type === "Point" &&
			feature.properties.mode === this.mode
		) {
			const closingPoint = feature.properties[COMMON_PROPERTIES.CLOSING_POINT];
			const snappingPoint =
				feature.properties[COMMON_PROPERTIES.SNAPPING_POINT];
			const coordinatePoint =
				feature.properties[COMMON_PROPERTIES.COORDINATE_POINT];

			const pointType = closingPoint
				? "closingPoint"
				: snappingPoint
					? "snappingPoint"
					: coordinatePoint
						? "coordinatePoint"
						: undefined;

			if (!pointType) {
				return styles;
			}

			const styleMap = {
				closingPoint: {
					width: this.styles.closingPointWidth,
					color: this.styles.closingPointColor,
					outlineColor: this.styles.closingPointOutlineColor,
					outlineWidth: this.styles.closingPointOutlineWidth,
				},
				snappingPoint: {
					width: this.styles.snappingPointWidth,
					color: this.styles.snappingPointColor,
					outlineColor: this.styles.snappingPointOutlineColor,
					outlineWidth: this.styles.snappingPointOutlineWidth,
				},
				coordinatePoint: {
					width: this.styles.coordinatePointWidth,
					color: this.styles.coordinatePointColor,
					outlineColor: this.styles.coordinatePointOutlineColor,
					outlineWidth: this.styles.coordinatePointOutlineWidth,
				},
			};

			styles.pointWidth = this.getNumericStylingValue(
				styleMap[pointType].width,
				styles.pointWidth,
				feature,
			);

			styles.pointColor = this.getHexColorStylingValue(
				styleMap[pointType].color,
				styles.pointColor,
				feature,
			);

			styles.pointOutlineColor = this.getHexColorStylingValue(
				styleMap[pointType].outlineColor,
				"#ffffff",
				feature,
			);

			styles.pointOutlineWidth = this.getNumericStylingValue(
				styleMap[pointType].outlineWidth,
				2,
				feature,
			);

			if (coordinatePoint) {
				styles.zIndex = Z_INDEX.LAYER_TWO;
			} else {
				styles.zIndex = Z_INDEX.LAYER_FIVE;
			}

			return styles;
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidateLineStringFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}

	private lineStringFilter(feature: Feature) {
		return Boolean(
			feature.geometry.type === "LineString" &&
				feature.properties &&
				feature.properties.mode === this.mode,
		);
	}

	private snapCoordinate(event: TerraDrawMouseEvent) {
		let snappedCoordinate: Position | undefined;

		if (this.snapping?.toLine) {
			let snapped: Position | undefined;
			if (this.currentId) {
				snapped = this.lineSnapping.getSnappableCoordinate(
					event,
					this.currentId,
				);
			} else {
				snapped = this.lineSnapping.getSnappableCoordinateFirstClick(event);
			}

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		if (this.snapping?.toCoordinate) {
			let snapped: Position | undefined;
			if (this.currentId) {
				snapped = this.coordinateSnapping.getSnappableCoordinate(
					event,
					this.currentId,
				);
			} else {
				snapped =
					this.coordinateSnapping.getSnappableCoordinateFirstClick(event);
			}

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		if (this.snapping?.toCustom) {
			const snapped = this.snapping.toCustom(event, {
				currentCoordinate: this.currentCoordinate,
				currentId: this.currentId,
				getCurrentGeometrySnapshot: this.currentId
					? () =>
							this.readFeature.getGeometry<LineString>(
								this.currentId as FeatureId,
							)
					: () => null,
				project: this.project,
				unproject: this.unproject,
			});

			if (snapped) {
				snappedCoordinate = snapped;
			}
		}

		return snappedCoordinate;
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// Clean up here is important to get right as we need to make a best effort to avoid erroneous
		// internal state.

		// IF we have coordinate points showing these need to be completely recreated
		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId: feature.id as FeatureId,
				featureCoordinates: feature.geometry.coordinates as Position[],
			});
		}

		// If we are editing a feature by dragging one of its points
		// we want to clear that state up as new polygon might be completely
		// different in terms of it's coordinates
		if (this.editedFeatureId === feature.id && this.editedPointId) {
			this.mutateFeature.deleteFeatureIfPresent(this.editedPointId);
			this.editedPointId = undefined;
			this.editedFeatureId = undefined;
			this.editedFeatureCoordinateIndex = undefined;
			this.editedSnapType = undefined;
		}

		// We can recalculate the snapped point from the last mouse event if there was one
		if (this.snappedPointId && this.lastMouseMoveEvent) {
			this.updateSnappedCoordinate(
				this.lastMouseMoveEvent as TerraDrawMouseEvent,
			);
		}

		// NOTE: This handles the case we are currently drawing a polygon
		// We need to reset the drawing state because it is very complicated (impossible?)
		// to recover the drawing state after a feature update
		if (this.currentId === feature.id) {
			this.closingPoints.delete();

			this.currentCoordinate = 0;
			this.currentId = undefined;

			// Go back to started state
			if (this.state === "drawing") {
				this.setStarted();
			}
		}
	}

	afterFeatureAdded(feature: GeoJSONStoreFeatures) {
		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId: feature.id as FeatureId,
				featureCoordinates: feature.geometry.coordinates as Position[],
			});
		}
	}
}
