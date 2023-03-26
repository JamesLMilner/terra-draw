import {
	Project,
	Unproject,
	TerraDrawCallbacks,
	TerraDrawChanges,
	TerraDrawMouseEvent,
	SetCursor,
	TerraDrawStylingFunction,
} from "../../common";
import { limitPrecision } from "../../geometry/limit-decimal-precision";
import { pixelDistance } from "../../geometry/measure/pixel-distance";
import { AdapterListener } from "./adapter-listener";

export abstract class TerraDrawAdapterBase {
	constructor(config: {
		coordinatePrecision?: number;
		minPixelDragDistance?: number;
	}) {
		this._minPixelDragDistance =
			typeof config.minPixelDragDistance === "number"
				? config.minPixelDragDistance
				: 8;

		this._coordinatePrecision =
			typeof config.coordinatePrecision === "number"
				? config.coordinatePrecision
				: 9;

		this.listeners = [
			new AdapterListener({
				name: "pointerdown",
				callback: (event) => {
					// We don't support multitouch as this point in time
					if (!event.isPrimary) {
						return;
					}

					this.dragState = "pre-dragging";

					// On pointer devices pointer mouse move events won't be
					// triggered so this._lastDrawEvent will not get set in
					// pointermove listener, so we must set it here.
					this._lastDrawEvent = this.getDrawEventFromPointerEvent(event);
				},
				register: (callback) => {
					return [
						this.getMapContainer().addEventListener("pointerdown", callback),
					];
				},
				unregister: (listeners: any[]) => {
					listeners.forEach((listener) => {
						this.getMapContainer().removeEventListener("pointerdown", listener);
					});
				},
			}),
			new AdapterListener({
				name: "pointermove",
				callback: (event) => {
					if (!this.currentModeCallbacks) return;

					// We don't support multitouch as this point in time
					if (!event.isPrimary) {
						return;
					}

					event.preventDefault();

					const drawEvent = this.getDrawEventFromPointerEvent(event);

					if (this.dragState === "not-dragging") {
						this.dragConter = 0;
						// If we're not dragging we can trigger the onMouseMove event
						this.currentModeCallbacks.onMouseMove(drawEvent);
						this._lastDrawEvent = drawEvent;
					} else if (this.dragState === "pre-dragging") {
						// This should always be set because of pointerdown event
						if (!this._lastDrawEvent) {
							return;
						}

						const lastEventXY = {
							x: this._lastDrawEvent.containerX,
							y: this._lastDrawEvent.containerY,
						};
						const currentEventXY = {
							x: drawEvent.containerX,
							y: drawEvent.containerY,
						};

						// We only want to prevent micro drags when we are
						// drawing as doing in on selection can cause janky
						// behaviours
						const modeState = this.currentModeCallbacks.getState();
						if (modeState === "drawing") {
							// We want to ignore very small pointer movements when holding
							// the map down as these are normally done by accident when
							// drawing and is not an intended drag
							const isMicroDrag =
								pixelDistance(lastEventXY, currentEventXY) <
								this._minPixelDragDistance;

							if (isMicroDrag) {
								return;
							}
						}

						this.dragState = "dragging";
						this.currentModeCallbacks.onDragStart(
							drawEvent,
							(enabled: boolean) => {
								this.setDraggability.bind(this)(enabled);
							}
						);
					} else if (this.dragState === "dragging") {
						this.dragConter = 0;
						this.currentModeCallbacks.onDrag(drawEvent);
					}
				},
				register: (callback) => {
					const container = this.getMapContainer();

					return [container.addEventListener("pointermove", callback)];
				},
				unregister: (listeners: any[]) => {
					listeners.forEach((listener) => {
						const container = this.getMapContainer();
						container.removeEventListener("pointermove", listener);
					});
				},
			}),
			new AdapterListener({
				name: "contextmenu",
				callback: (event: PointerEvent) => {
					if (!this.currentModeCallbacks) return;

					// We do not want the context menu to open
					event.preventDefault();

					if (
						this.dragState === "not-dragging" ||
						this.dragState === "pre-dragging"
					) {
						const drawEvent = this.getDrawEventFromPointerEvent(event);

						// On mobile devices there is no real 'right click'
						// so we want to make sure the event is genuine in this case
						if (drawEvent.button !== "neither") {
							this.currentModeCallbacks.onClick(drawEvent);
						}
					}
				},
				register: (callback) => {
					const container = this.getMapContainer();
					return [container.addEventListener("contextmenu", callback)];
				},
				unregister: (listeners: any[]) => {
					const container = this.getMapContainer();

					listeners.forEach((listener) => {
						container.removeEventListener("contextmenu", listener);
					});
				},
			}),
			new AdapterListener({
				name: "pointerup",
				callback: (event) => {
					if (!this.currentModeCallbacks) return;

					// We don't support multitouch as this point in time
					if (!event.isPrimary) {
						return;
					}

					const drawEvent = this.getDrawEventFromPointerEvent(event);

					if (this.dragState === "dragging") {
						this.currentModeCallbacks.onDragEnd(drawEvent, (enabled) => {
							this.setDraggability.bind(this)(enabled);
						});
					} else if (
						this.dragState === "not-dragging" ||
						this.dragState === "pre-dragging"
					) {
						// If we're not dragging or about to drag we
						// can trigger the onClick event
						this.currentModeCallbacks.onClick(drawEvent);
					}

					// Ensure we go back to the regular behaviour
					// not dragging and re-enable draggin on the actual map
					this.dragState = "not-dragging";
					this.setDraggability(true);
				},
				register: (callback) => {
					const container = this.getMapContainer();
					container.addEventListener("pointerup", callback);
					return [callback];
				},
				unregister: (listeners: any[]) => {
					const container = this.getMapContainer();

					listeners.forEach((listener) => {
						container.removeEventListener("pointerup", listener);
					});
				},
			}),
			new AdapterListener({
				name: "keyup",
				callback: (event: KeyboardEvent) => {
					// map has no keypress event, so we add one to the canvas itself

					if (!this.currentModeCallbacks) return;

					event.preventDefault();

					this._heldKeys.delete(event.key);

					this.currentModeCallbacks.onKeyUp({
						key: event.key,
					});
				},
				register: (callback) => {
					const container = this.getMapContainer();
					return [container.addEventListener("keyup", callback)];
				},
				unregister: (listeners: any[]) => {
					const container = this.getMapContainer();

					listeners.forEach((listener) => {
						container.removeEventListener("keyup", listener);
					});
				},
			}),
			new AdapterListener({
				name: "keydown",
				callback: (event: KeyboardEvent) => {
					if (!this.currentModeCallbacks) {
						return;
					}

					event.preventDefault();

					this._heldKeys.add(event.key);

					this.currentModeCallbacks.onKeyDown({
						key: event.key,
					});
				},
				register: (callback) => {
					const container = this.getMapContainer();

					return [container.addEventListener("keydown", callback)];
				},
				unregister: (listeners: any[]) => {
					const container = this.getMapContainer();

					listeners.forEach((listener) => {
						container.removeEventListener("keydown", listener);
					});
				},
			}),
		];
	}

	protected dragConter = 0;
	protected _minPixelDragDistance: number;
	protected _lastDrawEvent: TerraDrawMouseEvent | undefined;
	protected _coordinatePrecision: number;
	protected _heldKeys: Set<string> = new Set();
	protected listeners: AdapterListener[] = [];
	protected dragState: "not-dragging" | "pre-dragging" | "dragging" =
		"not-dragging";
	protected currentModeCallbacks: TerraDrawCallbacks | undefined;
	protected getButton(event: PointerEvent) {
		if (event.button === -1) {
			return "neither";
		} else if (event.button === 0) {
			return "left";
		} else if (event.button === 1) {
			return "middle";
		} else if (event.button === 2) {
			return "right";
		}

		// This shouldn't happen (?)
		return "neither";
	}

	protected getDrawEventFromPointerEvent(
		event: PointerEvent
	): TerraDrawMouseEvent {
		const { lng, lat } = this.getLngLatFromPointerEvent(event);
		const button = this.getButton(event);
		const container = this.getMapContainer();
		return {
			lng: limitPrecision(lng, this._coordinatePrecision),
			lat: limitPrecision(lat, this._coordinatePrecision),
			containerX: event.clientX - container.offsetLeft,
			containerY: event.clientY - container.offsetTop,
			button,
			heldKeys: [...this._heldKeys],
		};
	}

	public abstract project(...args: Parameters<Project>): ReturnType<Project>;
	public abstract unproject(
		...args: Parameters<Unproject>
	): ReturnType<Unproject>;
	public abstract setCursor(
		...args: Parameters<SetCursor>
	): ReturnType<SetCursor>;
	public abstract getLngLatFromPointerEvent(event: PointerEvent): {
		lng: number;
		lat: number;
	};
	public abstract setDraggability(enabled: boolean): void;
	public abstract setDoubleClickToZoom(enabled: boolean): void;
	public abstract getMapContainer(): HTMLElement;
	public abstract register(callbacks: TerraDrawCallbacks): void;
	public abstract unregister(): void;
	public abstract render(
		changes: TerraDrawChanges,
		styling: TerraDrawStylingFunction
	): void;
}
