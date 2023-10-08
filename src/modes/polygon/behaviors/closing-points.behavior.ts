import { Point, Position } from "geojson";
import { BehaviorConfig, TerraDrawModeBehavior } from "../../base.behavior";
import { POLYGON_PROPERTIES, TerraDrawMouseEvent } from "../../../common";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";

export class ClosingPointsBehavior extends TerraDrawModeBehavior {
	constructor(
		readonly config: BehaviorConfig,
		private readonly pixelDistance: PixelDistanceBehavior,
	) {
		super(config);
	}

	private _startEndPoints: string[] = [];

	get ids() {
		return this._startEndPoints.concat();
	}

	set ids(_: string[]) {}

	public create(selectedCoords: Position[], mode: string) {
		if (this.ids.length) {
			throw new Error("Opening and closing points already creating");
		}

		if (selectedCoords.length <= 3) {
			throw new Error("Requires at least 4 cooridnates");
		}

		this._startEndPoints = this.store.create(
			// Opening coordinate
			[
				{
					geometry: {
						type: "Point",
						coordinates: selectedCoords[0],
					} as Point,
					properties: {
						mode,
						[POLYGON_PROPERTIES.CLOSING_POINT]: true,
					},
				},
				// Final coordinate
				{
					geometry: {
						type: "Point",
						coordinates: selectedCoords[selectedCoords.length - 2],
					} as Point,
					properties: {
						mode,
						[POLYGON_PROPERTIES.CLOSING_POINT]: true,
					},
				},
			],
		);
	}

	public delete() {
		if (this.ids.length) {
			this.store.delete(this.ids);
			this._startEndPoints = [];
		}
	}

	public update(updatedCoordinates: Position[]) {
		if (this.ids.length !== 2) {
			throw new Error("No closing points to update");
		}

		this.store.updateGeometry(
			// Opening coordinate
			[
				{
					id: this.ids[0],
					geometry: {
						type: "Point",
						coordinates: updatedCoordinates[0],
					} as Point,
				},
				// Final coordinate
				{
					id: this.ids[1],
					geometry: {
						type: "Point",
						coordinates: updatedCoordinates[updatedCoordinates.length - 3],
					} as Point,
				},
			],
		);
	}

	public isClosingPoint(event: TerraDrawMouseEvent) {
		const opening = this.store.getGeometryCopy(this.ids[0]);
		const closing = this.store.getGeometryCopy(this.ids[1]);

		const distance = this.pixelDistance.measure(
			event,
			opening.coordinates as Position,
		);

		const distancePrevious = this.pixelDistance.measure(
			event,
			closing.coordinates as Position,
		);

		const isClosing = distance < this.pointerDistance;
		const isPreviousClosing = distancePrevious < this.pointerDistance;

		return { isClosing, isPreviousClosing };
	}
}
