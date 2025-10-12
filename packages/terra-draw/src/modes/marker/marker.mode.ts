import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	NumericStyling,
	Cursor,
	UpdateTypes,
	COMMON_PROPERTIES,
	Z_INDEX,
	UrlStyling,
} from "../../common";
import {
	BBoxPolygon,
	FeatureId,
	GeoJSONStoreFeatures,
	StoreValidation,
} from "../../store/store";
import { getDefaultStyling } from "../../util/styling";
import {
	BaseModeOptions,
	CustomStyling,
	TerraDrawBaseDrawMode,
} from "../base.mode";
import { ValidatePointFeature } from "../../validations/point.validation";
import { Point, Position } from "geojson";
import { BehaviorConfig } from "../base.behavior";
import { ClickBoundingBoxBehavior } from "../click-bounding-box.behavior";
import { PixelDistanceBehavior } from "../pixel-distance.behavior";

type MarkerModeStyling = {
	markerUrl: UrlStyling;
	markerHeight: NumericStyling;
	markerWidth: NumericStyling;
};

interface Cursors {
	create?: Cursor;
	dragStart?: Cursor;
	dragEnd?: Cursor;
}

const defaultCursors = {
	create: "crosshair",
	dragStart: "grabbing",
	dragEnd: "crosshair",
} as Required<Cursors>;

interface TerraDrawMarkerModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	cursors?: Cursors;
	editable?: boolean;
}

export class TerraDrawMarkerMode extends TerraDrawBaseDrawMode<MarkerModeStyling> {
	mode = "marker" as const;

	// Options
	private cursors: Required<Cursors> = defaultCursors;
	private editable: boolean = false;

	// Internal state
	private editedFeatureId: FeatureId | undefined;

	// Marker specific
	private markerUrl: string | undefined;
	private markerHeight: number | undefined;
	private markerWidth: number | undefined;

	// Behaviors
	private pixelDistance!: PixelDistanceBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;

	constructor(options?: TerraDrawMarkerModeOptions<MarkerModeStyling>) {
		super(options, true);
		this.updateOptions(options);
	}

	updateOptions(
		options?: TerraDrawMarkerModeOptions<MarkerModeStyling> | undefined,
	): void {
		super.updateOptions(options);

		if (options?.cursors) {
			this.cursors = { ...this.cursors, ...options.cursors };
		}

		if (options?.editable) {
			this.editable = options.editable;
		}
	}

	/** @internal */
	start() {
		this.setStarted();
		this.setCursor(this.cursors.create);
	}

	/** @internal */
	stop() {
		this.cleanUp();
		this.setStopped();
		this.setCursor("unset");
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {
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
	onMouseMove() {}

	/** @internal */
	onKeyDown() {}

	/** @internal */
	onKeyUp() {}

	/** @internal */
	cleanUp() {
		this.editedFeatureId = undefined;
	}

	onDragStart(
		event: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
		if (!this.allowPointerEvent(this.pointerEvents.onDragStart, event)) {
			return;
		}

		if (this.editable) {
			const nearestPointFeature = this.getNearestPointFeature(event);
			this.editedFeatureId = nearestPointFeature?.id;
		}

		// We only need to stop the map dragging if
		// we actually have something selected
		if (!this.editedFeatureId) {
			return;
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

		if (this.editedFeatureId === undefined) {
			return;
		}

		const newGeometry = {
			type: "Point",
			coordinates: [event.lng, event.lat],
		};

		if (this.validate) {
			const validationResult = this.validate(
				{
					type: "Feature",
					geometry: newGeometry,
					properties: this.store.getPropertiesCopy(this.editedFeatureId),
				} as GeoJSONStoreFeatures,
				{
					project: this.project,
					unproject: this.unproject,
					coordinatePrecision: this.coordinatePrecision,
					updateType: UpdateTypes.Finish,
				},
			);

			if (!validationResult.valid) {
				return;
			}
		}

		// For cursor points we can simply move it
		// to the dragged position
		this.store.updateGeometry([
			{
				id: this.editedFeatureId,
				geometry: {
					type: "Point",
					coordinates: [event.lng, event.lat],
				},
			},
		]);

		this.store.updateProperty([
			{
				id: this.editedFeatureId,
				property: COMMON_PROPERTIES.EDITED,
				value: true,
			},
		]);
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

		this.onFinish(this.editedFeatureId, { mode: this.mode, action: "edit" });

		this.setCursor(this.cursors.dragEnd);

		this.store.updateProperty([
			{
				id: this.editedFeatureId,
				property: COMMON_PROPERTIES.EDITED,
				value: false,
			},
		]);
		this.editedFeatureId = undefined;
		setMapDraggability(true);
	}

	registerBehaviors(config: BehaviorConfig) {
		this.pixelDistance = new PixelDistanceBehavior(config);
		this.clickBoundingBox = new ClickBoundingBoxBehavior(config);
	}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {
		const styles = { ...getDefaultStyling() };

		if (
			feature.type === "Feature" &&
			feature.geometry.type === "Point" &&
			feature.properties.mode === this.mode
		) {
			styles.zIndex = Z_INDEX.LAYER_THREE;
			styles.markerHeight = this.getNumericStylingValue(
				this.styles?.markerHeight,
				30,
				feature,
			);
			styles.markerWidth = this.getNumericStylingValue(
				this.styles?.markerWidth,
				30,
				feature,
			);
			styles.markerUrl = this.getUrlStylingValue(
				this.styles?.markerUrl,
				"", // TODO: we will provide a default marker icon in future
				feature,
			);
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePointFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}

	private onLeftClick(event: TerraDrawMouseEvent) {
		const geometry = {
			type: "Point",
			coordinates: [event.lng, event.lat],
		} as Point;

		const properties = {
			mode: this.mode,
			markerUrl: this.markerUrl as string,
			markerHeight: this.markerHeight as number,
			markerWidth: this.markerWidth as number,
		};

		if (this.validate) {
			const validationResult = this.validate(
				{
					type: "Feature",
					geometry,
					properties,
				} as GeoJSONStoreFeatures,
				{
					project: this.project,
					unproject: this.unproject,
					coordinatePrecision: this.coordinatePrecision,
					updateType: UpdateTypes.Finish,
				},
			);

			if (!validationResult.valid) {
				return;
			}
		}

		const [pointId] = this.store.create([{ geometry, properties }]);

		// Ensure that any listerers are triggered with the main created geometry
		this.onFinish(pointId, { mode: this.mode, action: "draw" });
	}

	private onRightClick(event: TerraDrawMouseEvent) {
		// We only want to be able to delete points if the mode is editable
		if (!this.editable) {
			return;
		}

		const clickedFeature = this.getNearestPointFeature(event);

		if (clickedFeature) {
			this.store.delete([clickedFeature.id as FeatureId]);
		}
	}

	private getNearestPointFeature(event: TerraDrawMouseEvent) {
		const bbox = this.clickBoundingBox.create(event) as BBoxPolygon;
		const features = this.store.search(bbox);

		let distance = Infinity;
		let clickedFeature: GeoJSONStoreFeatures | undefined = undefined;

		for (let i = 0; i < features.length; i++) {
			const feature = features[i];
			const isPoint =
				feature.geometry.type === "Point" &&
				feature.properties.mode === this.mode;

			if (!isPoint) {
				continue;
			}

			const position = feature.geometry.coordinates as Position;
			const distanceToFeature = this.pixelDistance.measure(event, position);

			if (
				distanceToFeature > distance ||
				distanceToFeature > this.pointerDistance
			) {
				continue;
			}

			distance = distanceToFeature;
			clickedFeature = feature;
		}

		return clickedFeature;
	}

	afterFeatureUpdated(feature: GeoJSONStoreFeatures) {
		// If we are editing a point by dragging it we want to clear that state
		// up as new point location might be completely  different in terms of it's location
		if (this.editedFeatureId === feature.id) {
			this.editedFeatureId = undefined;
			this.setCursor(this.cursors.create);
		}
	}
}
