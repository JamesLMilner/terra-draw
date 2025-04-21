import {
	Project,
	Projection,
	TerraDrawGeoJSONStore,
	Unproject,
} from "../common";

export type BehaviorConfig = {
	store: TerraDrawGeoJSONStore;
	mode: string;
	project: Project;
	unproject: Unproject;
	pointerDistance: number;
	coordinatePrecision: number;
	projection: Projection;
};

export class TerraDrawModeBehavior {
	protected store: TerraDrawGeoJSONStore;
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
