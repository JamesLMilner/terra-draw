import { Project, Unproject } from "../../common";
import { GeoJSONStore } from "../../store/store";

export type BehaviorConfig = {
  store: GeoJSONStore;
  mode: string;
  project: Project;
  unproject: Unproject;
  pointerDistance: number;
  coordinatePrecision: number;
};

export class TerraDrawModeBehavior {
  protected store: GeoJSONStore | undefined;
  protected mode: string | undefined;
  protected project: Project;
  protected unproject: Unproject;
  protected pointerDistance: number;
  protected coordinatePrecision: number;

  constructor({
    store,
    mode,
    project,
    unproject,
    pointerDistance,
    coordinatePrecision,
  }: BehaviorConfig) {
    this.store = store;
    this.mode = mode;
    this.project = project;
    this.unproject = unproject;
    this.pointerDistance = pointerDistance;
    this.coordinatePrecision = coordinatePrecision;
  }
}
