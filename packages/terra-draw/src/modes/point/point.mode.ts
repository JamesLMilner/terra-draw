import {
	TerraDrawMouseEvent,
	TerraDrawAdapterStyling,
	NumericStyling,
	HexColorStyling,
	Cursor,
	UpdateTypes,
	COMMON_PROPERTIES,
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

type PointModeStyling = {
	pointWidth: NumericStyling;
	pointColor: HexColorStyling;
	pointOutlineColor: HexColorStyling;
	pointOutlineWidth: NumericStyling;
	editedPointColor: HexColorStyling;
	editedPointWidth: NumericStyling;
	editedPointOutlineColor: HexColorStyling;
	editedPointOutlineWidth: NumericStyling;
};

interface Cursors {
	create?: Cursor;
	dragStart?: Cursor;
	dragEnd?: Cursor;
}

interface TerraDrawPointModeOptions<T extends CustomStyling>
	extends BaseModeOptions<T> {
	cursors?: Cursors;
	editable?: boolean;
}

export class TerraDrawPointMode extends TerraDrawBaseDrawMode<PointModeStyling> {
	mode = "point";

	private cursors: Required<Cursors>;
	private editable: boolean;
	private editedFeatureId: FeatureId | undefined;

	// Behaviors
	private pixelDistance!: PixelDistanceBehavior;
	private clickBoundingBox!: ClickBoundingBoxBehavior;

	constructor(options?: TerraDrawPointModeOptions<PointModeStyling>) {
		super(options);
		const defaultCursors = {
			create: "crosshair",
			dragStart: "grabbing",
			dragEnd: "crosshair",
		} as Required<Cursors>;

		if (options && options.cursors) {
			this.cursors = { ...defaultCursors, ...options.cursors };
		} else {
			this.cursors = defaultCursors;
		}

		if (options && options.editable) {
			this.editable = options.editable;
		} else {
			this.editable = false;
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
		if (!this.store) {
			throw new Error("Mode must be registered first");
		}

		const geometry = {
			type: "Point",
			coordinates: [event.lng, event.lat],
		} as Point;

		const properties = { mode: this.mode };

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
		if (this.editable) {
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

			if (clickedFeature) {
				this.editedFeatureId = clickedFeature.id;
			}
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

		setMapDraggability(true);
	}

	/** @internal */
	onDragEnd(
		_: TerraDrawMouseEvent,
		setMapDraggability: (enabled: boolean) => void,
	) {
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
			const isEdited = Boolean(
				feature.id && this.editedFeatureId === feature.id,
			);

			styles.pointWidth = this.getNumericStylingValue(
				isEdited ? this.styles.editedPointWidth : this.styles.pointWidth,
				styles.pointWidth,
				feature,
			);

			styles.pointColor = this.getHexColorStylingValue(
				isEdited ? this.styles.editedPointColor : this.styles.pointColor,
				styles.pointColor,
				feature,
			);

			styles.pointOutlineColor = this.getHexColorStylingValue(
				isEdited
					? this.styles.editedPointOutlineColor
					: this.styles.pointOutlineColor,
				styles.pointOutlineColor,
				feature,
			);

			styles.pointOutlineWidth = this.getNumericStylingValue(
				isEdited
					? this.styles.editedPointOutlineWidth
					: this.styles.pointOutlineWidth,
				2,
				feature,
			);

			styles.zIndex = 30;
		}

		return styles;
	}

	validateFeature(feature: unknown): StoreValidation {
		return this.validateModeFeature(feature, (baseValidatedFeature) =>
			ValidatePointFeature(baseValidatedFeature, this.coordinatePrecision),
		);
	}
}
