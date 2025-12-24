import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	COMMON_PROPERTIES,
	Z_INDEX,
	Snapping,
	FinishActions,
} from "../../common";
import { Feature, Polygon, Position } from "geojson";
import {
	TerraDrawBaseDrawMode,
	BaseModeOptions,
	CustomStyling,
	PointerEvents,
	ModeUpdateOptions,
} from "../base.mode";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { BehaviorConfig } from "../base.behavior";
import { ClosingPointsBehavior } from "../closing-points.behavior";
import { getDefaultStyling } from "../../util/styling";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { ValidatePolygonFeature } from "../../validations/polygon.validation";
import { LineSnappingBehavior } from "../line-snapping.behavior";
import { CoordinateSnappingBehavior } from "../coordinate-snapping.behavior";
import { CoordinatePointBehavior } from "../select/behaviors/coordinate-point.behavior";
import {
	CoordinateMutation,
	MutateFeatureBehavior,
	Mutations,
} from "../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../read-feature.behavior";

type TerraDrawPolygonModeKeyEvents = {
	cancel?: KeyboardEvent["key"] | null;
	finish?: KeyboardEvent["key"] | null;
};

const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };

type PolygonStyling = {
	fillColor: HexColorStyling;
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	fillOpacity: NumericStyling;
	closingPointWidth: NumericStyling;
	closingPointColor: HexColorStyling;
	closingPointOutlineWidth: NumericStyling;
	closingPointOutlineColor: HexColorStyling;
	snappingPointWidth: NumericStyling;
	snappingPointColor: HexColorStyling;
	snappingPointOutlineWidth: NumericStyling;
	snappingPointOutlineColor: HexColorStyling;
	editedPointWidth: NumericStyling;
	editedPointColor: HexColorStyling;
	editedPointOutlineWidth: NumericStyling;
	editedPointOutlineColor: HexColorStyling;
	coordinatePointWidth: NumericStyling;
	coordinatePointColor: HexColorStyling;
	coordinatePointOutlineWidth: NumericStyling;
	coordinatePointOutlineColor: HexColorStyling;
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

interface TerraDrawPolygonModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	snapping?: Snapping;
	pointerDistance?: number;
	keyEvents?: TerraDrawPolygonModeKeyEvents | null;
	pointerEvents?: PointerEvents;
	cursors?: Cursors;
	editable?: boolean;
	showCoordinatePoints?: boolean;
}

export class TerraDrawPolygonMode extends TerraDrawBaseDrawMode<PolygonStyling> {
	mode = "polygon";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private keyEvents: TerraDrawPolygonModeKeyEvents = defaultKeyEvents;
	private cursors: Required<Cursors> = defaultCursors;
	private mouseMove = false;
	private showCoordinatePoints = false;
	private lastMouseMoveEvent: TerraDrawMouseEvent | undefined;

	// Snapping
	private snapping: Snapping | undefined;
	private snappedPointId: FeatureId | undefined;

	// Editable
	private editable: boolean = false;
	private editedFeatureId: FeatureId | undefined;
	private editedFeatureCoordinateIndex: number | undefined;
	private editedSnapType: "line" | "coordinate" | undefined;
	private editedInsertIndex: number | undefined;
	private editedPointId: FeatureId | undefined;

	// Behaviors
	private coordinatePoints!: CoordinatePointBehavior;
	private lineSnapping!: LineSnappingBehavior;
	private coordinateSnapping!: CoordinateSnappingBehavior;
	private pixelDistance!: PixelDistanceBehavior;
	private closingPoints!: ClosingPointsBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;
	private mutateFeature!: MutateFeatureBehavior;
	private readFeature!: ReadFeatureBehavior;

	constructor(options?: TerraDrawPolygonModeOptions<PolygonStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	override updateOptions(
		options?: ModeUpdateOptions<TerraDrawPolygonModeOptions<PolygonStyling>>,
	) {
		super.updateOptions(options);

		if (options?.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		// null is the case where we want to explicitly turn key bindings off
		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else if (options?.keyEvents) {
			this.keyEvents = { ...this.keyEvents, ...options.keyEvents };
		}

		if (options?.snapping) {
			this.snapping = options.snapping;
		}

		if (options?.editable !== undefined) {
			this.editable = options.editable;
		}

		if (options?.pointerEvents !== undefined) {
			this.pointerEvents = options.pointerEvents;
		}

		if (options?.showCoordinatePoints !== undefined) {
			this.showCoordinatePoints = options.showCoordinatePoints;

			// If we are not showing coordinate points, we need to add them all
			if (this.coordinatePoints && options.showCoordinatePoints === true) {
				const features = this.store.copyAllWhere(
					(properties) => properties.mode === this.mode,
				);
				features.forEach((feature) => {
					this.coordinatePoints.createOrUpdate({
						featureId: feature.id as FeatureId,
						featureCoordinates: feature.geometry.coordinates as Position[][],
					});
				});
			} else if (this.coordinatePoints && this.showCoordinatePoints === false) {
				const featuresWithCoordinates = this.store.copyAllWhere(
					(properties) =>
						properties.mode === this.mode &&
						Boolean(
							properties[COMMON_PROPERTIES.COORDINATE_POINT_IDS] as FeatureId[],
						),
				);

				this.coordinatePoints.deletePointsByFeatureIds(
					featuresWithCoordinates.map((f) => f.id as FeatureId),
				);
			}
		}
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		const currentPolygonCoordinates = this.readFeature.getCoordinates<Polygon>(
			this.currentId,
		);

		// We don't want to allow closing if there is not enough
		// coordinates. We have extra because we insert them on mouse
		// move
		if (currentPolygonCoordinates.length < 5) {
			return;
		}

		const updated = this.mutateFeature.updatePolygon({
			featureId: this.currentId,
			coordinateMutations: [{ type: Mutations.Delete, index: -2 }],
			propertyMutations: {
				[COMMON_PROPERTIES.CURRENTLY_DRAWING]: undefined,
				[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT]: undefined,
				[COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT]: undefined,
			},
			context: {
				updateType: UpdateTypes.Finish,
				action: FinishActions.Draw,
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

		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.snappedPointId = undefined;
		this.closingPoints.delete();

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}
	}

	/** @internal */
	registerBehaviors(config: BehaviorConfig) {
		this.readFeature = new ReadFeatureBehavior(config);
		this.mutateFeature = new MutateFeatureBehavior(config, {
			validate: this.validate,
			onFinish: (featureId, context) => {
				if (this.editedPointId) {
					this.mutateFeature.deleteFeature(this.editedPointId);
					this.editedPointId = undefined;
				}

				if (this.snappedPointId) {
					this.mutateFeature.deleteFeature(this.snappedPointId);
					this.snappedPointId = undefined;
				}

				this.onFinish(featureId, {
					mode: this.mode,
					action: context.action,
				});
			},
		});
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
			this.mutateFeature.deleteFeature(this.snappedPointId);
			this.snappedPointId = undefined;
		}
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.mouseMove = true;
		this.setCursor(this.cursors.start);

		this.lastMouseMoveEvent = event;
		this.updateSnappedCoordinate(event);

		if (this.currentId === undefined || this.currentCoordinate === 0) {
			return;
		}

		const firstCoordinate = this.readFeature.getCoordinate<Polygon>(
			this.currentId,
			0,
		);
		const eventCoordinate = [event.lng, event.lat];

		let coordinateMutations: CoordinateMutation[];

		if (this.currentCoordinate === 1) {
			coordinateMutations = [
				{ type: Mutations.Update, index: 1, coordinate: eventCoordinate },
				{
					type: Mutations.Update,
					index: 2,
					coordinate: [
						event.lng,
						event.lat - this.mutateFeature.epsilonOffset(),
					],
				},
			];
		} else if (this.currentCoordinate === 2) {
			coordinateMutations = [
				{ type: Mutations.Update, index: 2, coordinate: eventCoordinate },
			];
		} else {
			const { isClosing, isPreviousClosing } =
				this.closingPoints.isPolygonClosingPoints(event);

			if (isPreviousClosing || isClosing) {
				if (this.snappedPointId) {
					this.mutateFeature.deleteFeature(this.snappedPointId);
					this.snappedPointId = undefined;
				}

				this.setCursor(this.cursors.close);

				coordinateMutations = [
					{ type: Mutations.Update, index: -1, coordinate: firstCoordinate },
					{ type: Mutations.Update, index: -2, coordinate: firstCoordinate },
				];
			} else {
				coordinateMutations = [
					{ type: Mutations.Update, index: -2, coordinate: eventCoordinate },
					{ type: Mutations.Update, index: -1, coordinate: firstCoordinate },
				];
			}
		}

		const updated = this.mutateFeature.updatePolygon({
			featureId: this.currentId,
			coordinateMutations,
			propertyMutations: {
				[COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT]:
					this.currentCoordinate + 1,
			},
			context: { updateType: UpdateTypes.Provisional },
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
	}

	private snapCoordinate(event: TerraDrawMouseEvent): undefined | Position {
		let snappedCoordinate: Position | undefined = undefined;

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
			let snapped: Position | undefined = undefined;
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
							this.readFeature.getGeometry<Polygon>(this.currentId as FeatureId)
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

	private polygonFilter(feature: Feature) {
		return Boolean(
			feature.geometry.type === "Polygon" &&
				feature.properties &&
				feature.properties.mode === this.mode,
		);
	}

	private onRightClick(event: TerraDrawMouseEvent) {
		// Right click is only relevant when editable is true
		if (!this.editable || this.state !== "started") {
			return;
		}

		const { featureId, featureCoordinateIndex: coordinateIndex } =
			this.coordinateSnapping.getSnappable(event, (feature) =>
				this.polygonFilter(feature),
			);

		if (!featureId || coordinateIndex === undefined) {
			return;
		}

		const geometry = this.readFeature.getGeometry(featureId);

		if (geometry.type !== "Polygon") {
			return;
		}

		const coordinates = geometry.coordinates[0];

		// Prevent creating an invalid polygon
		if (coordinates.length <= 4) {
			return;
		}

		const isFinalPolygonCoordinate =
			coordinateIndex === 0 || coordinateIndex === coordinates.length - 1;

		let coordinateMutations: CoordinateMutation[];

		if (isFinalPolygonCoordinate) {
			// Deleting the final coordinate in a polygon breaks it
			// because GeoJSON expects a duplicate, so we need to fix
			// it by adding the new first coordinate to the end

			// The second coordinate becomes the first coordinate, so we need to
			// add it to the end to maintain the closed polygon
			const secondCoordinate = coordinates[1];

			coordinateMutations = [
				{ type: Mutations.Delete, index: 0 },
				{ type: Mutations.Delete, index: -1 },
				{
					type: Mutations.InsertAfter,
					index: -1,
					coordinate: secondCoordinate,
				},
			];
		} else {
			// Remove coordinate from array
			coordinateMutations = [
				{ type: Mutations.Delete, index: coordinateIndex },
			];
		}

		const updated = this.mutateFeature.updatePolygon({
			featureId,
			coordinateMutations,
			context: { updateType: UpdateTypes.Finish, action: FinishActions.Edit },
		});

		if (!updated) {
			return;
		}

		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId,
				featureCoordinates: updated.geometry.coordinates,
			});
		}
	}

	private onLeftClick(event: TerraDrawMouseEvent) {
		// Reset the snapping point
		if (this.snappedPointId) {
			this.mutateFeature.deleteFeature(this.snappedPointId);
			this.snappedPointId = undefined;
		}

		const snappedCoordinate = this.snapCoordinate(event);

		let eventCoordinate = snappedCoordinate
			? snappedCoordinate
			: [event.lng, event.lat];

		if (this.currentCoordinate === 0) {
			const { id, geometry } = this.mutateFeature.createPolygon({
				coordinates: [
					eventCoordinate,
					eventCoordinate,
					eventCoordinate,
					eventCoordinate,
				],
				properties: {
					mode: this.mode,
					[COMMON_PROPERTIES.CURRENTLY_DRAWING]: true,
					[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT]:
						this.currentCoordinate + 1,
					[COMMON_PROPERTIES.PROVISIONAL_COORDINATE_COUNT]:
						this.currentCoordinate + 1,
				},
			});

			if (this.showCoordinatePoints) {
				this.coordinatePoints.createOrUpdate({
					featureId: id,
					featureCoordinates: geometry.coordinates,
				});
			}

			this.currentId = id;
			this.currentCoordinate++;

			// Ensure the state is updated to reflect drawing has started
			this.setDrawing();
		} else if (this.currentCoordinate === 1 && this.currentId) {
			const isIdentical = this.readFeature.coordinateAtIndexIsIdentical({
				featureId: this.currentId,
				newCoordinate: eventCoordinate,
				index: 0,
			});

			if (isIdentical) {
				return;
			}

			const updated = this.mutateFeature.updatePolygon({
				featureId: this.currentId,
				coordinateMutations: [
					{ type: Mutations.Update, index: 1, coordinate: eventCoordinate },
					{ type: Mutations.Update, index: 2, coordinate: eventCoordinate },
				],
				propertyMutations: {
					[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT]:
						this.currentCoordinate + 1,
				},
				context: { updateType: UpdateTypes.Commit },
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

			this.currentCoordinate++;
		} else if (this.currentCoordinate === 2 && this.currentId) {
			const isIdentical = this.readFeature.coordinateAtIndexIsIdentical({
				featureId: this.currentId,
				newCoordinate: eventCoordinate,
				index: 1,
			});

			if (isIdentical) {
				return;
			}

			const updated = this.mutateFeature.updatePolygon({
				featureId: this.currentId,
				coordinateMutations: [
					{ type: Mutations.Update, index: 2, coordinate: eventCoordinate },
					{
						type: Mutations.InsertAfter,
						index: 2,
						coordinate: eventCoordinate,
					},
				],
				propertyMutations: {
					[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT]:
						this.currentCoordinate + 1,
				},
				context: { updateType: UpdateTypes.Commit },
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

			if (this.currentCoordinate === 2) {
				this.closingPoints.create(updated.geometry.coordinates);
			}

			this.currentCoordinate++;
		} else if (this.currentId) {
			const { isClosing, isPreviousClosing } =
				this.closingPoints.isPolygonClosingPoints(event);

			if (isPreviousClosing || isClosing) {
				this.close();
			} else {
				const isIdentical = this.readFeature.coordinateAtIndexIsIdentical({
					featureId: this.currentId,
					newCoordinate: eventCoordinate,
					index: this.currentCoordinate - 1,
				});

				if (isIdentical) {
					return;
				}

				// If not close to the final point, keep adding points
				const updated = this.mutateFeature.updatePolygon({
					featureId: this.currentId,
					coordinateMutations: [
						{
							type: Mutations.InsertBefore,
							index: -1,
							coordinate: eventCoordinate,
						},
					],
					propertyMutations: {
						[COMMON_PROPERTIES.COMMITTED_COORDINATE_COUNT]:
							this.currentCoordinate + 1,
					},
					context: { updateType: UpdateTypes.Commit },
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

				this.currentCoordinate++;

				// Update closing points straight away
				if (this.closingPoints.ids.length) {
					this.closingPoints.update(updated.geometry.coordinates);
				}
			}
		}
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		// We want pointer devices (mobile/tablet) to have
		// similar behaviour to mouse based devices so we
		// trigger a mousemove event before every click
		// if one has not been trigged to emulate this
		if (this.currentCoordinate > 0 && !this.mouseMove) {
			this.onMouseMove(event);
		}
		this.mouseMove = false;

		if (
			(event.button === "right" &&
				this.allowPointerEvent(this.pointerEvents.rightClick, event)) ||
			(event.isContextMenu &&
				this.allowPointerEvent(this.pointerEvents.contextMenu, event))
		) {
			this.onRightClick(event);
			return;
		} else if (
			event.button === "left" &&
			this.allowPointerEvent(this.pointerEvents.leftClick, event)
		) {
			this.onLeftClick(event);
			return;
		}
	}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {
		if (event.key === this.keyEvents.cancel) {
			this.cleanUp();
		} else if (event.key === this.keyEvents.finish) {
			this.close();
		}
	}

	/** @internal */
	onKeyDown() {}

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
			// Here we reuse the snapping logic to find the feature and coordinate
			// that we want to edit. We can drag a arbitrary polygon coordinate point
			// or an arbitrary point on one of its 'lines

			const lineSnapped = this.lineSnapping.getSnappable(event, (feature) =>
				this.polygonFilter(feature),
			);

			if (lineSnapped.coordinate) {
				this.editedSnapType = "line";
				this.editedFeatureCoordinateIndex = lineSnapped.featureCoordinateIndex;
				this.editedFeatureId = lineSnapped.featureId;
				snappedCoordinate = lineSnapped.coordinate;
			}

			const coordinateSnapped = this.coordinateSnapping.getSnappable(
				event,
				(feature) => this.polygonFilter(feature),
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

		const featureCopy: Polygon = this.readFeature.getGeometry(
			this.editedFeatureId,
		);

		const eventCoordinate: Position = [event.lng, event.lat];

		let coordinateMutations: CoordinateMutation[] = [];

		// Either it's a coordinate drag or a line drag where the line coordinate has already been inserted
		if (
			this.editedSnapType === "coordinate" ||
			(this.editedSnapType === "line" && this.editedInsertIndex !== undefined)
		) {
			// Account for the first and last point being the same
			const isStartingOrEndingCoordinate =
				this.editedFeatureCoordinateIndex === 0 ||
				this.editedFeatureCoordinateIndex ===
					featureCopy.coordinates[0].length - 1;

			if (isStartingOrEndingCoordinate) {
				coordinateMutations = [
					{
						type: Mutations.Update,
						index: 0,
						coordinate: eventCoordinate,
					},
					{
						type: Mutations.Update,
						index: -1,
						coordinate: eventCoordinate,
					},
				];
			} else {
				coordinateMutations = [
					{
						type: Mutations.Update,
						index: this.editedFeatureCoordinateIndex,
						coordinate: eventCoordinate,
					},
				];
			}
		} else if (
			this.editedSnapType === "line" &&
			this.editedInsertIndex === undefined
		) {
			this.editedInsertIndex = this.editedFeatureCoordinateIndex + 1;

			coordinateMutations = [
				{
					type: Mutations.InsertBefore,
					index: this.editedInsertIndex,
					coordinate: eventCoordinate,
				},
			];

			// We have inserted a point, need to change the edit index
			// so it can be moved correctly when it gets dragged again
			this.editedFeatureCoordinateIndex++;
		}

		// No changes
		if (coordinateMutations.length === 0) {
			return;
		}

		const updated = this.mutateFeature.updatePolygon({
			featureId: this.editedFeatureId,
			coordinateMutations,
			propertyMutations: {
				[COMMON_PROPERTIES.EDITED]: true,
			},
			context: { updateType: UpdateTypes.Provisional },
		});

		if (!updated) {
			return;
		}

		if (
			this.showCoordinatePoints &&
			this.editedFeatureCoordinateIndex !== undefined
		) {
			this.coordinatePoints.updateOneAtIndex(
				this.editedFeatureId,
				this.editedFeatureCoordinateIndex,
				eventCoordinate,
			);
		}

		if (this.snapping && this.snappedPointId) {
			this.mutateFeature.deleteFeature(this.snappedPointId);
			this.snappedPointId = undefined;
		}

		if (this.editedPointId) {
			this.mutateFeature.updateGuidancePoints([
				{
					featureId: this.editedPointId,
					coordinate: eventCoordinate,
				},
			]);
		}
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

		const updated = this.mutateFeature.updatePolygon({
			featureId: this.editedFeatureId,
			propertyMutations: {
				[COMMON_PROPERTIES.EDITED]: false,
			},
			context: { updateType: UpdateTypes.Finish, action: FinishActions.Edit },
		});

		if (!updated) {
			return;
		}

		// Reset edit state
		this.editedFeatureId = undefined;
		this.editedFeatureCoordinateIndex = undefined;
		this.editedInsertIndex = undefined;
		this.editedSnapType = undefined;

		setMapDraggability(true);
	}

	/** @internal */
	cleanUp() {
		const cleanUpId = this.currentId;
		const snappedPointId = this.snappedPointId;
		const editedPointId = this.editedPointId;

		this.currentId = undefined;
		this.snappedPointId = undefined;
		this.editedPointId = undefined;
		this.editedFeatureId = undefined;
		this.editedFeatureCoordinateIndex = undefined;
		this.editedInsertIndex = undefined;
		this.editedSnapType = undefined;
		this.currentCoordinate = 0;

		if (this.state === "drawing") {
			this.setStarted();
		}

		try {
			if (cleanUpId) {
				this.coordinatePoints.deletePointsByFeatureIds([cleanUpId]);
			}

			if (cleanUpId !== undefined) {
				this.mutateFeature.deleteFeature(cleanUpId);
			}
			if (editedPointId !== undefined) {
				this.mutateFeature.deleteFeature(editedPointId);
			}
			if (snappedPointId !== undefined) {
				this.mutateFeature.deleteFeature(snappedPointId);
			}
			if (this.closingPoints.ids.length) {
				this.closingPoints.delete();
			}
		} catch (error) {}
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (feature.properties.mode === this.mode) {
			if (feature.geometry.type === "Polygon") {
				styles.polygonFillColor = this.getHexColorStylingValue(
					this.styles.fillColor,
					styles.polygonFillColor,
					feature,
				);

				styles.polygonOutlineColor = this.getHexColorStylingValue(
					this.styles.outlineColor,
					styles.polygonOutlineColor,
					feature,
				);

				styles.polygonOutlineWidth = this.getNumericStylingValue(
					this.styles.outlineWidth,
					styles.polygonOutlineWidth,
					feature,
				);

				styles.polygonFillOpacity = this.getNumericStylingValue(
					this.styles.fillOpacity,
					styles.polygonFillOpacity,
					feature,
				);

				styles.zIndex = Z_INDEX.LAYER_ONE;
				return styles;
			} else if (feature.geometry.type === "Point") {
				const editedPoint = feature.properties[COMMON_PROPERTIES.EDITED];
				const closingPoint =
					feature.properties[COMMON_PROPERTIES.CLOSING_POINT];
				const snappingPoint =
					feature.properties[COMMON_PROPERTIES.SNAPPING_POINT];
				const coordinatePoint =
					feature.properties[COMMON_PROPERTIES.COORDINATE_POINT];

				const pointType = editedPoint
					? "editedPoint"
					: closingPoint
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
					editedPoint: {
						width: this.styles.editedPointOutlineWidth,
						color: this.styles.editedPointColor,
						outlineColor: this.styles.editedPointOutlineColor,
						outlineWidth: this.styles.editedPointOutlineWidth,
					},
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
					styles.pointOutlineColor,
					feature,
				);

				styles.pointOutlineWidth = this.getNumericStylingValue(
					styleMap[pointType].outlineWidth,
					2,
					feature,
				);

				if (editedPoint) {
					styles.zIndex = Z_INDEX.LAYER_FOUR;
				} else if (coordinatePoint) {
					styles.zIndex = Z_INDEX.LAYER_TWO;
				} else {
					styles.zIndex = Z_INDEX.LAYER_THREE;
				}

				return styles;
			}
		}

		return styles;
	}

	afterFeatureAdded(feature: GeoJSONStoreFeatures) {
		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId: feature.id as FeatureId,
				featureCoordinates: feature.geometry.coordinates as Position[][],
			});
		}
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// Clean up here is important to get right as we need to make a best effort to avoid erroneous
		// internal state.

		// IF we have coordinate points showing these need to be completely recreated
		if (this.showCoordinatePoints) {
			this.coordinatePoints.createOrUpdate({
				featureId: feature.id as FeatureId,
				featureCoordinates: feature.geometry.coordinates as Position[][],
			});
		}

		// If we are editing a feature by dragging one of its points
		// we want to clear that state up as new polygon might be completely
		// different in terms of it's coordinates
		if (this.editedFeatureId === feature.id && this.editedPointId) {
			this.mutateFeature.deleteFeature(this.editedPointId);
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
			this.currentCoordinate = 0;
			this.currentId = undefined;
			this.closingPoints.delete();

			// Go back to started state
			if (this.state === "drawing") {
				this.setStarted();
			}
		}
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePolygonFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}
}
