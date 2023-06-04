import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	TerraDrawKeyboardEvent,
	HexColor,
} from "../../common";
import { LineString } from "geojson";
import { TerraDrawBaseDrawMode } from "../base.mode";
import { BehaviorConfig } from "../base.behavior";
import { getDefaultStyling } from "../../util/styling";
import { GeoJSONStoreFeatures } from "../../store/store";
import { greatCircleLine } from "../../geometry/shape/great-circle-line";
import { GreatCircleSnappingBehavior } from "../great-circle-snapping.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";

type TerraDrawGreateCircleModeKeyEvents = {
	cancel: KeyboardEvent["key"] | null;
	finish: KeyboardEvent["key"] | null;
};

type GreateCircleStyling = {
	lineStringWidth: number;
	lineStringColor: HexColor;
	closingPointColor: HexColor;
	closingPointWidth: number;
	closingPointOutlineColor: HexColor;
	closingPointOutlineWidth: number;
};

export class TerraDrawGreatCircleMode extends TerraDrawBaseDrawMode<GreateCircleStyling> {
	mode = "greatcircle";

	private currentCoordinate = 0;
	private currentId: string | undefined;
	private closingPointId: string | undefined;
	private keyEvents: TerraDrawGreateCircleModeKeyEvents;
	private snappingEnabled: boolean;

	// Behaviors
	private snapping!: GreatCircleSnappingBehavior;

	constructor(options?: {
		snapping?: boolean;
		pointerDistance?: number;
		styles?: Partial<GreateCircleStyling>;
		keyEvents?: TerraDrawGreateCircleModeKeyEvents | null;
	}) {
		super(options);

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
		if (!this.currentId) {
			return;
		}

		const finishedId = this.currentId;

		// Reset the state back to starting state
		this.closingPointId && this.store.delete([this.closingPointId]);
		this.currentCoordinate = 0;
		this.currentId = undefined;
		this.closingPointId = undefined;
		// Go back to started state
		if (this.state === "drawing") {
			this.setStarted();
		}

		// Ensure that any listerers are triggered with the main created geometry
		this.onFinish(finishedId);
	}

	/** @internal */
	registerBehaviors(config: BehaviorConfig) {
		this.snapping = new GreatCircleSnappingBehavior(
			config,
			new PixelDistanceBehavior(config),
			new ClickBoundingBoxBehavior(config)
		);
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setCursor("crosshair");
	}

	/** @internal */
	stop() {
		this.cleanUp();
		this.setStopped();
		this.setCursor("unset");
	}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {
		this.setCursor("crosshair");

		if (!this.currentId && this.currentCoordinate === 0) {
			return;
		} else if (
			this.currentId &&
			this.currentCoordinate === 1 &&
			this.closingPointId
		) {
			const snappedCoord =
				this.currentId &&
				this.snappingEnabled &&
				this.snapping.getSnappableCoordinate(event, this.currentId);

			const updatedCoord = snappedCoord ? snappedCoord : [event.lng, event.lat];

			this.store.updateGeometry([
				{
					id: this.closingPointId,
					geometry: { type: "Point", coordinates: updatedCoord },
				},
			]);

			const currentLineGeometry = this.store.getGeometryCopy<LineString>(
				this.currentId
			);

			// Remove the 'live' point that changes on mouse move
			currentLineGeometry.coordinates.pop();

			// Update the 'live' point
			const greatCircle = greatCircleLine({
				start: currentLineGeometry.coordinates[0],
				end: updatedCoord,
				options: { coordinatePrecision: this.coordinatePrecision },
			});

			if (greatCircle) {
				this.store.updateGeometry([
					{
						id: this.currentId,
						geometry: greatCircle.geometry,
					},
				]);
			}
		}
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
		if (this.currentCoordinate === 0) {
			const snappedCoord =
				this.snappingEnabled && this.snapping.getSnappableCoordinate(event);

			const updatedCoord = snappedCoord ? snappedCoord : [event.lng, event.lat];

			const [createdId] = this.store.create([
				{
					geometry: {
						type: "LineString",
						coordinates: [
							updatedCoord,
							updatedCoord, // This is the 'live' point that changes on mouse move
						],
					},
					properties: { mode: this.mode },
				},
			]);
			this.currentId = createdId;

			const [pointId] = this.store.create([
				{
					geometry: {
						type: "Point",
						coordinates: updatedCoord,
					},
					properties: { mode: this.mode },
				},
			]);
			this.closingPointId = pointId;

			this.currentCoordinate++;
			this.setDrawing();
		} else if (this.currentCoordinate === 1 && this.currentId) {
			// We are creating the point so we immediately want
			// to set the point cursor to show it can be closed
			this.setCursor("pointer");
			this.close();
		}
	}

	/** @internal */
	onKeyDown() {}

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
	onDragStart() {}

	/** @internal */
	onDrag() {}

	/** @internal */
	onDragEnd() {}

	/** @internal */
	cleanUp() {
		try {
			if (this.currentId) {
				this.store.delete([this.currentId]);
			}
			if (this.closingPointId) {
				this.store.delete([this.closingPointId]);
			}
		} catch (error) {}

		this.closingPointId = undefined;
		this.currentId = undefined;
		this.currentCoordinate = 0;
		if (this.state === "drawing") {
			this.setStarted();
		}
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.type === "Feature" &&
			feature.geometry.type === "LineString" &&
			feature.properties.mode === this.mode
		) {
			if (this.styles.lineStringColor) {
				styles.lineStringColor = this.styles.lineStringColor;
			}
			if (this.styles.lineStringWidth) {
				styles.lineStringWidth = this.styles.lineStringWidth;
			}

			return styles;
		} else if (
			feature.type === "Feature" &&
			feature.geometry.type === "Point" &&
			feature.properties.mode === this.mode
		) {
			if (this.styles.closingPointColor) {
				styles.pointColor = this.styles.closingPointColor;
			}
			if (this.styles.closingPointWidth) {
				styles.pointWidth = this.styles.closingPointWidth;
			}

			styles.pointOutlineColor =
				this.styles.closingPointOutlineColor !== undefined
					? this.styles.closingPointOutlineColor
					: "#ffffff";
			styles.pointOutlineWidth =
				this.styles.closingPointOutlineWidth !== undefined
					? this.styles.closingPointOutlineWidth
					: 2;

			return styles;
		}

		return styles;
	}

	validateFeature(feature: unknown): feature is GeoJSONStoreFeatures {
		if (super.validateFeature(feature)) {
			return (
				feature.geometry.type === "LineString" &&
				feature.properties.mode === this.mode &&
				feature.geometry.coordinates.length >= 2
			);
		} else {
			return false;
		}
	}
}
