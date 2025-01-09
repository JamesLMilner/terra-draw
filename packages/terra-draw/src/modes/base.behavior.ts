import { Project, Projection, Unproject } from "../common";
import { GeoJSONStore } from "../store/store";

export type BehaviorConfig = {
	store: GeoJSONStore;
	mode: string;
	project: Project;
	unproject: Unproject;
	pointerDistance: number;
	coordinatePrecision: number;
	projection: Projection;
};

export class TerraDrawModeBehavior {
	protected store: GeoJSONStore;
	protected mode: string;
	protected project: Project;
	protected unproject: Unproject;
	protected pointerDistance: number;
	protected coordinatePrecision: number;
	protected projection: Projection;

	constructor({
		store,
		mode,
		project,
		unproject,
		pointerDistance,
		coordinatePrecision,
		projection,
	}: BehaviorConfig) {
		this.store = store;
		this.mode = mode;
		this.project = project;
		this.unproject = unproject;
		this.pointerDistance = pointerDistance;
		this.coordinatePrecision = coordinatePrecision;
		this.projection = projection;
	}
}
