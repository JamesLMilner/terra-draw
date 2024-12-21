import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColorStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
} from "../../common";
import { Polygon } from "geojson";
import {
	TerraDrawBaseDrawMode,
	BaseModeOptions,
	CustomStyling,
} from "../base.mode";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { BehaviorConfig } from "../base.behavior";
import { createPolygon } from "../../util/geoms";
import { SnappingBehavior } from "../snapping.behavior";
import { coordinatesIdentical } from "../../geometry/coordinates-identical";
import { ClosingPointsBehavior } from "./behaviors/closing-points.behavior";
import { getDefaultStyling } from "../../util/styling";
import {
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { ValidatePolygonFeature } from "../../validations/polygon.validation";

type TerraDrawPolygonModeKeyEvents = {
	cancel?: KeyboardEvent["key"] | null;
	finish?: KeyboardEvent["key"] | null;
};

type PolygonStyling = {
	fillColor: HexColorStyling;
	outlineColor: HexColorStyling;
	outlineWidth: NumericStyling;
	fillOpacity: NumericStyling;
	closingPointWidth: NumericStyling;
	closingPointColor: HexColorStyling;
	closingPointOutlineWidth: NumericStyling;
	closingPointOutlineColor: HexColorStyling;
};

interface Cursors {
	start?: Cursor;
	close?: Cursor;
}

interface TerraDrawPolygonModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	snapping?: boolean;
	pointerDistance?: number;
	keyEvents?: TerraDrawPolygonModeKeyEvents | null;
	cursors?: Cursors;
}

export class TerraDrawPolygonMode extends TerraDrawBaseDrawMode<PolygonStyling> {
	mode = "polygon";

	private currentCoordinate = 0;
	private currentId: FeatureId | undefined;
	private keyEvents: TerraDrawPolygonModeKeyEvents;
	private snappingEnabled: boolean;

	// Behaviors
	private snapping!: SnappingBehavior;
	private pixelDistance!: PixelDistanceBehavior;
	private closingPoints!: ClosingPointsBehavior;
	private cursors: Required<Cursors>;
	private mouseMove = false;

	constructor(options?: TerraDrawPolygonModeOptions<PolygonStyling>) {
		super(options);

		const defaultCursors = {
			start: "crosshair",
			close: "pointer",
		} as Required<Cursors>;

		if (options && options.cursors) {
			this.cursors = { ...defaultCursors, ...options.cursors };
		} else {
			this.cursors = defaultCursors;
		}

		this.snappingEnabled =
			options && options.snapping !== undefined ? options.snapping : false;

		// We want to have some defaults, but also allow key bindings
		// to be explicitly turned off
		if (options?.keyEvents === null) {
			this.keyEvents = { cancel: null, finish: null };
		} else {
			const defaultKeyEvents = { cancel: "Escape", finish: "Enter" };
			this.keyEvents =
				options && options.keyEvents
					? { ...defaultKeyEvents, ...options.keyEvents }
					: defaultKeyEvents;
		}
	}

	private close() {
		if (this.currentId === undefined) {
			return;
		}

		const currentPolygonCoordinates = this.store.getGeometryCopy<Polygon>(
			this.currentId,
		).coordinates[0];

		// We don't want to allow closing if there is not enough
		// coordinates. We have extra because we insert them on mouse
		// move
		if (currentPolygonCoordinates.length < 5) {
			return;
		}

		const updated = this.updatePolygonGeometry(
			[...currentPolygonCoordinates.slice(0, -2), currentPolygonCoordinates[0]],
			UpdateTypes.Finish,
		);

		if (!updated) {
			return;
		}

		const finishedId = this.currentId;

		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.closingPoints.delete();

		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		this.onFinish(finishedId, { mode: this.mode, action: "draw" });
	}

	/** @internal */
	registerBehaviors(config: BehaviorConfig) {
		this.pixelDistance = new PixelDistanceBehavior(config);
		this.snapping = new SnappingBehavior(
			config,
			this.pixelDistance,
			new ClickBoundingBoxBehavior(config),
		);
		this.closingPoints = new ClosingPointsBehavior(config, this.pixelDistance);
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

		if (this.currentId === undefined || this.currentCoordinate === 0) {
			return;
		}

		const closestCoord = this.snappingEnabled
			? this.snapping.getSnappableCoordinate(event, this.currentId)
			: undefined;

		const currentPolygonCoordinates = this.store.getGeometryCopy<Polygon>(
			this.currentId,
		).coordinates[0];

		if (closestCoord) {
			event.lng = closestCoord[0];
			event.lat = closestCoord[1];
		}

		let updatedCoordinates;

		if (this.currentCoordinate === 1) {
			// We must add a very small epsilon value so that Mapbox GL
			// renders the polygon - There might be a cleaner solution?
			const epsilon = 1 / Math.pow(10, this.coordinatePrecision - 1);
			const offset = Math.max(0.000001, epsilon);

			updatedCoordinates = [
				currentPolygonCoordinates[0],
				[event.lng, event.lat],
				[event.lng, event.lat - offset],
				currentPolygonCoordinates[0],
			];
		} else if (this.currentCoordinate === 2) {
			updatedCoordinates = [
				currentPolygonCoordinates[0],
				currentPolygonCoordinates[1],
				[event.lng, event.lat],
				currentPolygonCoordinates[0],
			];
		} else {
			const { isClosing, isPreviousClosing } =
				this.closingPoints.isClosingPoint(event);

			if (isPreviousClosing || isClosing) {
				this.setCursor(this.cursors.close);

				updatedCoordinates = [
					...currentPolygonCoordinates.slice(0, -2),
					currentPolygonCoordinates[0],
					currentPolygonCoordinates[0],
				];
			} else {
				updatedCoordinates = [
					...currentPolygonCoordinates.slice(0, -2),
					[event.lng, event.lat],
					currentPolygonCoordinates[0],
				];
			}
		}

		this.updatePolygonGeometry(updatedCoordinates, UpdateTypes.Provisional);
	}

	private updatePolygonGeometry(
		coordinates: Polygon["coordinates"][0],
		updateType: UpdateTypes,
	) {
		if (!this.currentId) {
			return false;
		}

		const updatedGeometry = {
			type: "Polygon",
			coordinates: [coordinates],
		} as Polygon;

		if (this.validate) {
			const validationResult = this.validate(
				{
					type: "Feature",
					geometry: updatedGeometry,
				} as GeoJSONStoreFeatures,
				{
					project: this.project,
					unproject: this.unproject,
					coordinatePrecision: this.coordinatePrecision,
					updateType,
				},
			);

			if (!validationResult.valid) {
				return false;
			}
		}

		this.store.updateGeometry([
			{ id: this.currentId, geometry: updatedGeometry },
		]);

		return true;
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

		if (this.currentCoordinate === 0) {
			const closestCoord = this.snappingEnabled
				? this.snapping.getSnappableCoordinateFirstClick(event)
				: undefined;

			if (closestCoord) {
				event.lng = closestCoord[0];
				event.lat = closestCoord[1];
			}

			const [newId] = this.store.create([
				{
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[event.lng, event.lat],
								[event.lng, event.lat],
								[event.lng, event.lat],
								[event.lng, event.lat],
							],
						],
					},
					properties: { mode: this.mode },
				},
			]);
			this.currentId = newId;
			this.currentCoordinate++;

			// Ensure the state is updated to reflect drawing has started
			this.setDrawing();
		} else if (this.currentCoordinate === 1 && this.currentId) {
			const closestCoord = this.snappingEnabled
				? this.snapping.getSnappableCoordinate(event, this.currentId)
				: undefined;

			if (closestCoord) {
				event.lng = closestCoord[0];
				event.lat = closestCoord[1];
			}

			const currentPolygonGeometry = this.store.getGeometryCopy<Polygon>(
				this.currentId,
			);

			const previousCoordinate = currentPolygonGeometry.coordinates[0][0];
			const isIdentical = coordinatesIdentical(
				[event.lng, event.lat],
				previousCoordinate,
			);

			if (isIdentical) {
				return;
			}

			const updated = this.updatePolygonGeometry(
				[
					currentPolygonGeometry.coordinates[0][0],
					[event.lng, event.lat],
					[event.lng, event.lat],
					currentPolygonGeometry.coordinates[0][0],
				],
				UpdateTypes.Commit,
			);

			if (!updated) {
				return;
			}

			this.currentCoordinate++;
		} else if (this.currentCoordinate === 2 && this.currentId) {
			const closestCoord = this.snappingEnabled
				? this.snapping.getSnappableCoordinate(event, this.currentId)
				: undefined;

			if (closestCoord) {
				event.lng = closestCoord[0];
				event.lat = closestCoord[1];
			}

			const currentPolygonCoordinates = this.store.getGeometryCopy<Polygon>(
				this.currentId,
			).coordinates[0];

			const previousCoordinate = currentPolygonCoordinates[1];
			const isIdentical = coordinatesIdentical(
				[event.lng, event.lat],
				previousCoordinate,
			);

			if (isIdentical) {
				return;
			}

			const updated = this.updatePolygonGeometry(
				[
					currentPolygonCoordinates[0],
					currentPolygonCoordinates[1],
					[event.lng, event.lat],
					[event.lng, event.lat],
					currentPolygonCoordinates[0],
				],
				UpdateTypes.Commit,
			);

			if (!updated) {
				return;
			}

			if (this.currentCoordinate === 2) {
				this.closingPoints.create(currentPolygonCoordinates, "polygon");
			}

			this.currentCoordinate++;
		} else if (this.currentId) {
			const closestCoord = this.snappingEnabled
				? this.snapping.getSnappableCoordinate(event, this.currentId)
				: undefined;

			const currentPolygonCoordinates = this.store.getGeometryCopy<Polygon>(
				this.currentId,
			).coordinates[0];

			const { isClosing, isPreviousClosing } =
				this.closingPoints.isClosingPoint(event);

			if (isPreviousClosing || isClosing) {
				this.close();
			} else {
				if (closestCoord) {
					event.lng = closestCoord[0];
					event.lat = closestCoord[1];
				}

				const previousCoordinate =
					currentPolygonCoordinates[this.currentCoordinate - 1];
				const isIdentical = coordinatesIdentical(
					[event.lng, event.lat],
					previousCoordinate,
				);

				if (isIdentical) {
					return;
				}

				const updatedPolygon = createPolygon([
					[
						...currentPolygonCoordinates.slice(0, -1),
						[event.lng, event.lat], // New point that onMouseMove can manipulate
						currentPolygonCoordinates[0],
					],
				]);

				// If not close to the final point, keep adding points
				const updated = this.updatePolygonGeometry(
					updatedPolygon.geometry.coordinates[0],
					UpdateTypes.Commit,
				);
				if (!updated) {
					return;
				}
				this.currentCoordinate++;

				// Update closing points straight away
				if (this.closingPoints.ids.length) {
					this.closingPoints.update(updatedPolygon.geometry.coordinates[0]);
				}
			}
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

	/** @internal */
	onDragStart() {
		// We want to allow the default drag
		// cursor to exist
		this.setCursor("unset");
	}

	/** @internal */
	onDrag() {}

	/** @internal */
	onDragEnd() {
		// Set it back to crosshair
		this.setCursor(this.cursors.start);
	}

	/** @internal */
	cleanUp() {
		const cleanUpId = this.currentId;

		this.currentId = undefined;
		this.currentCoordinate = 0;
		if (this.state === "drawing") {
			this.setStarted();
		}

		try {
			if (cleanUpId !== undefined) {
				this.store.delete([cleanUpId]);
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

				styles.zIndex = 10;
				return styles;
			} else if (feature.geometry.type === "Point") {
				styles.pointWidth = this.getNumericStylingValue(
					this.styles.closingPointWidth,
					styles.pointWidth,
					feature,
				);

				styles.pointColor = this.getHexColorStylingValue(
					this.styles.closingPointColor,
					styles.pointColor,
					feature,
				);

				styles.pointOutlineColor = this.getHexColorStylingValue(
					this.styles.closingPointOutlineColor,
					styles.pointOutlineColor,
					feature,
				);

				styles.pointOutlineWidth = this.getNumericStylingValue(
					this.styles.closingPointOutlineWidth,
					2,
					feature,
				);
				styles.zIndex = 30;
				return styles;
			}
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePolygonFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}
}
