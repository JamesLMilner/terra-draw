import {
	Project,
	Unproject,
	TerraDrawCallbacks,
	TerraDrawChanges,
	TerraDrawMouseEvent,
	SetCursor,
	TerraDrawStylingFunction,
	GetLngLatFromEvent,
} from "../../common";
import { limitPrecision } from "../../geometry/limit-decimal-precision";
import { pixelDistance } from "../../geometry/measure/pixel-distance";
import { AdapterListener } from "./adapter-listener";

type BasePointerListener = (event: PointerEvent) => void;
type BaseKeyboardListener = (event: KeyboardEvent) => void;
type BaseMouseListener = (event: MouseEvent) => void;

export abstract class TerraDrawBaseAdapter {
	constructor(config: {
		coordinatePrecision?: number;
		minPixelDragDistanceDrawing?: number;
		minPixelDragDistance?: number;
		minPixelDragDistanceSelecting?: number;
	}) {
		this._minPixelDragDistance =
			typeof config.minPixelDragDistance === "number"
				? config.minPixelDragDistance
				: 1;

		this._minPixelDragDistanceSelecting =
			typeof config.minPixelDragDistanceSelecting === "number"
				? config.minPixelDragDistanceSelecting
				: 1;

		this._minPixelDragDistanceDrawing =
			typeof config.minPixelDragDistanceDrawing === "number"
				? config.minPixelDragDistanceDrawing
				: 8;

		this._coordinatePrecision =
			typeof config.coordinatePrecision === "number"
				? config.coordinatePrecision
				: 9;
	}

	protected _minPixelDragDistance: number;
	protected _minPixelDragDistanceDrawing: number;
	protected _minPixelDragDistanceSelecting: number;
	protected _lastDrawEvent: TerraDrawMouseEvent | undefined;
	protected _coordinatePrecision: number;
	protected _heldKeys: Set<string> = new Set();
	protected _listeners: AdapterListener<
		BasePointerListener | BaseKeyboardListener | BaseMouseListener
	>[] = [];
	protected _dragState: "not-dragging" | "pre-dragging" | "dragging" =
		"not-dragging";
	protected _currentModeCallbacks: TerraDrawCallbacks | undefined;

	protected abstract getMapEventElement(): HTMLElement;

	protected getButton(event: PointerEvent | MouseEvent) {
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

	protected getMapElementXYPosition(event: PointerEvent | MouseEvent) {
		const mapElement = this.getMapEventElement();
		const { left, top } = mapElement.getBoundingClientRect();

		return {
			containerX: event.clientX - left,
			containerY: event.clientY - top,
		};
	}

	protected getDrawEventFromEvent(
		event: PointerEvent | MouseEvent,
	): TerraDrawMouseEvent | null {
		const latLng = this.getLngLatFromEvent(event);

		if (!latLng) {
			return null;
		}

		const { lng, lat } = latLng;
		const { containerX, containerY } = this.getMapElementXYPosition(event);
		const button = this.getButton(event);
		const heldKeys = Array.from(this._heldKeys);

		return {
			lng: limitPrecision(lng, this._coordinatePrecision),
			lat: limitPrecision(lat, this._coordinatePrecision),
			containerX,
			containerY,
			button,
			heldKeys,
		};
	}

	/**
	 * Registers the provided callbacks for the current drawing mode and attaches
	 * the necessary event listeners.
	 * @param {TerraDrawCallbacks} callbacks - An object containing callback functions
	 * for handling various drawing events in the current mode.
	 */
	public register(callbacks: TerraDrawCallbacks) {
		this._currentModeCallbacks = callbacks;

		this._listeners = this.getAdapterListeners();

		this._listeners.forEach((listener) => {
			listener.register();
		});
	}

	private getAdapterListeners() {
		return [
			new AdapterListener<BasePointerListener>({
				name: "pointerdown",
				callback: (event) => {
					if (!this._currentModeCallbacks) {
						return;
					}

					// We don't support multitouch as this point in time
					if (!event.isPrimary) {
						return;
					}

					const drawEvent = this.getDrawEventFromEvent(event);
					if (!drawEvent) {
						return;
					}

					this._dragState = "pre-dragging";

					// On pointer devices pointer mouse move events won't be
					// triggered so this._lastDrawEvent will not get set in
					// pointermove listener, so we must set it here.
					this._lastDrawEvent = drawEvent;
				},
				register: (callback) => {
					this.getMapEventElement().addEventListener("pointerdown", callback);
				},
				unregister: (callback) => {
					this.getMapEventElement().removeEventListener(
						"pointerdown",
						callback,
					);
				},
			}),
			new AdapterListener<BasePointerListener>({
				name: "pointermove",
				callback: (event) => {
					if (!this._currentModeCallbacks) return;

					// We don't support multitouch as this point in time
					if (!event.isPrimary) {
						return;
					}

					event.preventDefault();

					const drawEvent = this.getDrawEventFromEvent(event);
					if (!drawEvent) {
						return;
					}

					if (this._dragState === "not-dragging") {
						// If we're not dragging we can trigger the onMouseMove event
						this._currentModeCallbacks.onMouseMove(drawEvent);
						this._lastDrawEvent = drawEvent;
					} else if (this._dragState === "pre-dragging") {
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
						const modeState = this._currentModeCallbacks.getState();

						const pixelDistanceToCheck = pixelDistance(
							lastEventXY,
							currentEventXY,
						);

						// We start off assuming it is not a microdrag
						let isMicroDrag = false;

						if (modeState === "drawing") {
							// We want to ignore very small pointer movements when holding
							// the map down as these are normally done by accident when
							// drawing and is not an intended drag
							isMicroDrag =
								pixelDistanceToCheck < this._minPixelDragDistanceDrawing;
						} else if (modeState === "selecting") {
							// Simiarly when selecting, we want to ignore very small pointer
							// movements when holding the map down as these are normally done
							// by accident when drawing and is not an intended drag
							isMicroDrag =
								pixelDistanceToCheck < this._minPixelDragDistanceSelecting;
						} else {
							// Same as above, but when not drawing we generally want a much lower tolerance
							isMicroDrag = pixelDistanceToCheck < this._minPixelDragDistance;
						}

						// If it is a microdrag we do not register it by returning early
						if (isMicroDrag) {
							return;
						}

						this._dragState = "dragging";
						this._currentModeCallbacks.onDragStart(
							drawEvent,
							(enabled: boolean) => {
								this.setDraggability.bind(this)(enabled);
							},
						);
					} else if (this._dragState === "dragging") {
						this._currentModeCallbacks.onDrag(drawEvent, (enabled: boolean) => {
							this.setDraggability.bind(this)(enabled);
						});
					}
				},
				register: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.addEventListener("pointermove", callback);
				},
				unregister: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.removeEventListener("pointermove", callback);
				},
			}),
			new AdapterListener<BaseMouseListener>({
				name: "contextmenu",
				callback: (event) => {
					if (!this._currentModeCallbacks) return;

					// We do not want the context menu to open
					event.preventDefault();

					if (
						this._dragState === "not-dragging" ||
						this._dragState === "pre-dragging"
					) {
						const drawEvent = this.getDrawEventFromEvent(event);
						if (!drawEvent) {
							return;
						}

						// On mobile devices there is no real 'right click'
						// so we want to make sure the event is genuine in this case
						if (drawEvent.button !== "neither") {
							this._currentModeCallbacks.onClick(drawEvent);
						}
					}
				},
				register: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.addEventListener("contextmenu", callback);
				},
				unregister: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.removeEventListener("contextmenu", callback);
				},
			}),
			new AdapterListener<BasePointerListener>({
				name: "pointerup",
				callback: (event) => {
					if (!this._currentModeCallbacks) {
						return;
					}

					if (event.target !== this.getMapEventElement()) {
						return;
					}

					// We don't support multitouch as this point in time
					if (!event.isPrimary) {
						return;
					}

					const drawEvent = this.getDrawEventFromEvent(event);

					if (!drawEvent) {
						return;
					}

					if (this._dragState === "dragging") {
						this._currentModeCallbacks.onDragEnd(drawEvent, (enabled) => {
							this.setDraggability.bind(this)(enabled);
						});
					} else if (
						this._dragState === "not-dragging" ||
						this._dragState === "pre-dragging"
					) {
						// If we're not dragging or about to drag we
						// can trigger the onClick event
						this._currentModeCallbacks.onClick(drawEvent);
					}

					// Ensure we go back to the regular behaviour
					// not dragging and re-enable draggin on the actual map
					this._dragState = "not-dragging";
					this.setDraggability(true);
				},
				register: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.addEventListener("pointerup", callback);
				},
				unregister: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.removeEventListener("pointerup", callback);
				},
			}),
			new AdapterListener({
				name: "keyup",
				callback: (event: KeyboardEvent) => {
					// map has no keypress event, so we add one to the canvas itself

					if (!this._currentModeCallbacks) return;

					this._heldKeys.delete(event.key);

					this._currentModeCallbacks.onKeyUp({
						key: event.key,
						heldKeys: Array.from(this._heldKeys),
						preventDefault: () => event.preventDefault(),
					});
				},
				register: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.addEventListener("keyup", callback);
				},
				unregister: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.removeEventListener("keyup", callback);
				},
			}),
			new AdapterListener({
				name: "keydown",
				callback: (event: KeyboardEvent) => {
					if (!this._currentModeCallbacks) {
						return;
					}

					this._heldKeys.add(event.key);

					this._currentModeCallbacks.onKeyDown({
						key: event.key,
						heldKeys: Array.from(this._heldKeys),
						preventDefault: () => event.preventDefault(),
					});
				},
				register: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.addEventListener("keydown", callback);
				},
				unregister: (callback) => {
					const mapElement = this.getMapEventElement();
					mapElement.removeEventListener("keydown", callback);
				},
			}),
		];
	}

	/**
	 * Unregisters the event listeners for the current drawing mode.
	 * This is typically called when switching between drawing modes or
	 * stopping the drawing process.
	 */
	public unregister() {
		this._listeners.forEach((listener) => {
			listener.unregister();
		});
		this.clear();
	}

	public abstract clear(): void;

	public abstract project(...args: Parameters<Project>): ReturnType<Project>;

	public abstract unproject(
		...args: Parameters<Unproject>
	): ReturnType<Unproject>;

	public abstract setCursor(
		...args: Parameters<SetCursor>
	): ReturnType<SetCursor>;

	public abstract getLngLatFromEvent(
		...event: Parameters<GetLngLatFromEvent>
	): ReturnType<GetLngLatFromEvent>;

	public abstract setDraggability(enabled: boolean): void;

	public abstract setDoubleClickToZoom(enabled: boolean): void;

	public abstract render(
		changes: TerraDrawChanges,
		styling: TerraDrawStylingFunction,
	): void;
}
