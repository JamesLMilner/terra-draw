/**
 * @jest-environment jsdom
 */
import {
	TerraDrawAdapterStyling,
	GeoJSONStoreFeatures,
	TerraDrawExtend,
} from "terra-draw";

const createMockGoogleMap = (overrides?: Partial<google.maps.Map>) => {
	// Minimal emulation of google.maps.Data styling behavior.
	// The adapter calls `map.data.getStyle()` to check if a style function is set.
	let currentStyle: unknown = null;

	return {
		setValues: jest.fn(),
		unbind: jest.fn(),
		unbindAll: jest.fn(),
		bindTo: jest.fn(),
		get: jest.fn(),
		notify: jest.fn(),
		set: jest.fn(),
		addListener: jest.fn(),
		getBounds: jest.fn(),
		controls: [],
		data: {
			addListener: jest.fn(),
			getStyle: jest.fn(() => currentStyle),
			setStyle: jest.fn((style) => {
				currentStyle = style;
			}),
		} as unknown as google.maps.Data,
		fitBounds: jest.fn(),
		getCenter: jest.fn(),
		getClickableIcons: jest.fn(),
		getDiv: jest.fn(() => ({
			id: "map",
			querySelector: jest.fn(() => ({
				addEventListener: jest.fn(),
			})),
			addEventListener: jest.fn(),
		})),
		getHeading: jest.fn(),
		getMapTypeId: jest.fn(),
		getProjection: jest.fn(),
		getRenderingType: jest.fn(),
		getStreetView: jest.fn(),
		getTilt: jest.fn(),
		getZoom: jest.fn(),
		mapTypes: {} as unknown as google.maps.MapTypeRegistry,
		moveCamera: jest.fn(),
		overlayMapTypes: [] as unknown as google.maps.MVCArray<google.maps.MapType>,
		panBy: jest.fn(),
		panTo: jest.fn(),
		panToBounds: jest.fn(),
		setCenter: jest.fn(),
		setClickableIcons: jest.fn(),
		setHeading: jest.fn(),
		setMapTypeId: jest.fn(),
		setOptions: jest.fn(),
		setStreetView: jest.fn(),
		setTilt: jest.fn(),
		setZoom: jest.fn(),
		...overrides,
	} as unknown as google.maps.Map;
};

import {
	Feature,
	FeatureCollection,
	LineString,
	Point,
	Polygon,
} from "geojson";
import { TerraDrawGoogleMapsAdapter } from "./terra-draw-google-maps-adapter";

// The adapter batches map mutations into requestAnimationFrame; in unit tests we
// want those mutations to happen immediately so assertions are deterministic.
let rafQueue: FrameRequestCallback[] = [];

function flushRaf(maxFrames = 10) {
	for (let i = 0; i < maxFrames; i++) {
		const cb = rafQueue.shift();
		if (!cb) return;
		cb(0);
	}

	if (rafQueue.length) {
		throw new Error(
			`flushRaf exceeded maxFrames=${maxFrames}. Remaining=${rafQueue.length}`,
		);
	}
}

beforeEach(() => {
	rafQueue = [];
	jest
		.spyOn(globalThis, "requestAnimationFrame")
		.mockImplementation((cb: FrameRequestCallback) => {
			rafQueue.push(cb);
			return 0;
		});
});

afterEach(() => {
	// Only clear call history between tests; keep the requestAnimationFrame mock
	// from being fully restored mid-suite.
	jest.clearAllMocks();
});

const mockUUID = "29da86c2-92e2-4095-a1b3-22103535ebfa";

function createMockFeature<T extends Polygon | LineString | Point>(
	id: string,
	geometry: T,
): Feature<T> {
	return {
		id: id ? id : mockUUID,
		type: "Feature",
		properties: {
			mode: geometry.type.toLowerCase(),
		},
		geometry: geometry,
	};
}

function MockPolygonSquare(
	id?: string,
	squareStart?: number,
	squareEnd?: number,
): Feature<Polygon> {
	squareStart = squareStart !== undefined ? squareStart : 0;
	squareEnd = squareEnd !== undefined ? squareEnd : 1;

	return createMockFeature(id || mockUUID, {
		type: "Polygon",
		coordinates: [
			[
				// 0, 0    0,1------1,1
				// 0, 1    |         |
				// 1, 1    |         |
				// 1, 0    |         |
				// 0, 0  . 0,0------1,0

				[squareStart, squareStart],
				[squareStart, squareEnd],
				[squareEnd, squareEnd],
				[squareEnd, squareStart],
				[squareStart, squareStart],
			],
		],
	});
}

function MockPoint(id?: string, lng?: number, lat?: number): Feature<Point> {
	return createMockFeature(id || mockUUID, {
		type: "Point",
		coordinates: [lng ? lng : 0, lat ? lat : 0],
	});
}

function MockLineString(id?: string): Feature<LineString> {
	return createMockFeature(id || mockUUID, {
		type: "LineString",
		coordinates: [
			[0, 0],
			[0, 1],
		],
	});
}

const MockPointerEvent = () =>
	({
		bubbles: true,
		cancelable: true,
		clientX: 0,
		clientY: 0,
		button: 0,
		buttons: 1,
		pointerId: 1,
		pointerType: "mouse",
		isPrimary: true,
	}) as PointerEvent;

const MockCallbacks = (
	overrides?: Partial<TerraDrawExtend.TerraDrawCallbacks>,
): TerraDrawExtend.TerraDrawCallbacks => ({
	getState: jest.fn(),
	onKeyUp: jest.fn(),
	onKeyDown: jest.fn(),
	onClick: jest.fn(),
	onMouseMove: jest.fn(),
	onDragStart: jest.fn(),
	onDrag: jest.fn(),
	onDragEnd: jest.fn(),
	onClear: jest.fn(),
	onReady: jest.fn(),
	...overrides,
});

describe("TerraDrawGoogleMapsAdapter", () => {
	// Google, of course
	const testLng = -122.084252077;
	const testLat = 37.422592266;

	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
					})),
				} as any,
				map: createMockGoogleMap(),
				minPixelDragDistance: 1,
				minPixelDragDistanceSelecting: 8,
				minPixelDragDistanceDrawing: 8,
				coordinatePrecision: 9,
			});

			expect(adapter).toBeDefined();
			expect(adapter.render).toBeDefined();
			expect(adapter.register).toBeDefined();
			expect(adapter.unregister).toBeDefined();
			expect(adapter.project).toBeDefined();
			expect(adapter.unproject).toBeDefined();
			expect(adapter.setCursor).toBeDefined();
		});
	});

	describe("register", () => {
		it("registers event listeners", () => {
			const addListenerMock = jest.fn();

			const div = {
				addEventListener: jest.fn(),
			} as unknown as HTMLDivElement;
			const keyboardDiv = {
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
			} as unknown as HTMLDivElement;
			const mockMap = createMockGoogleMap({
				getDiv: jest.fn(() => ({
					id: "map",
					querySelector: jest.fn(() => div),
					addEventListener: keyboardDiv.addEventListener,
					removeEventListener: keyboardDiv.removeEventListener,
				})) as any,
				data: {
					addListener: addListenerMock,
				} as any,
			});
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
					})),
				} as any,
				map: mockMap,
			});

			const callbackMock = MockCallbacks();
			adapter.register(callbackMock);

			expect(div.addEventListener).toHaveBeenCalledTimes(4);
			expect(keyboardDiv.addEventListener).toHaveBeenCalledTimes(2);

			expect(addListenerMock).toHaveBeenNthCalledWith(
				1,
				"click",
				expect.any(Function),
			);
			expect(addListenerMock).toHaveBeenNthCalledWith(
				2,
				"mousemove",
				expect.any(Function),
			);
		});
	});

	describe("unregister", () => {
		it("is safe to call without listeners", () => {
			const div = {
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
			} as unknown as HTMLDivElement;
			const mockMap = createMockGoogleMap({
				getDiv: jest.fn(() => ({
					id: "map",
					querySelector: jest.fn(() => div),
					addEventListener: jest.fn(),
					removeEventListener: jest.fn(),
				})) as any,
				data: {
					setStyle: jest.fn(),
				} as any,
			});
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
					})),
				} as any,
				map: mockMap,
			});

			adapter.unregister();
		});

		it("removes listeners", () => {
			const removeListenerMock = jest.fn();
			const addListenerMock = jest.fn(() => ({
				remove: removeListenerMock,
			}));

			const div = {
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
			} as unknown as HTMLDivElement;

			const keyboardDiv = {
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
			} as unknown as HTMLDivElement;

			const mockMap = createMockGoogleMap({
				getDiv: jest.fn(() => ({
					id: "map",
					querySelector: jest.fn(() => div),
					addEventListener: keyboardDiv.addEventListener,
					removeEventListener: keyboardDiv.removeEventListener,
				})) as any,
				data: {
					addListener: addListenerMock,
					setStyle: jest.fn(),
				} as any,
			});
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getMap: jest.fn(() => ({})),
					})),
				} as any,
				map: mockMap,
			});

			adapter.register(MockCallbacks());

			expect(removeListenerMock).not.toHaveBeenCalled();

			adapter.unregister();

			// These are the callbacks registered with the Google Maps API
			expect(removeListenerMock).toHaveBeenCalledTimes(2);

			// These are the general listeners (registered in base)
			expect(div.removeEventListener).toHaveBeenCalledTimes(4);
			expect(keyboardDiv.removeEventListener).toHaveBeenCalledTimes(2);
		});
	});

	describe("getLngLatFromEvent", () => {
		it("returns null for uninitialized map", () => {
			const mapMock = createMockGoogleMap();
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(() => undefined),
					})),
				} as any,
				map: mapMock,
			});

			adapter.register(MockCallbacks());

			expect(adapter.getLngLatFromEvent(MockPointerEvent())).toBeNull();
			expect(mapMock.getBounds).toHaveBeenCalled();
		});

		it("returns null when no projection available", () => {
			const mapMock = createMockGoogleMap({
				getBounds: jest.fn(
					() =>
						({
							getNorthEast: jest.fn(),
							getSouthWest: jest.fn(),
						}) as unknown as google.maps.LatLngBounds,
				),
				getDiv: jest.fn(
					() =>
						({
							id: "map",
							querySelector: jest.fn(() => ({
								addEventListener: jest.fn(),
							})),
							getBoundingClientRect: jest.fn(() => ({})),
							addEventListener: jest.fn(),
						}) as unknown as HTMLDivElement,
				),
			});

			const getProjectionMock = jest.fn(() => undefined);
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					LatLngBounds: jest.fn(),
					Point: jest.fn(),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			adapter.register(MockCallbacks());

			expect(adapter.getLngLatFromEvent(MockPointerEvent())).toBeNull();
			expect(getProjectionMock).toHaveBeenCalled();
		});

		it("returns long & lat for click within bounds", () => {
			const mapMock = createMockGoogleMap({
				getBounds: jest.fn(
					() =>
						({
							getNorthEast: jest.fn(),
							getSouthWest: jest.fn(),
						}) as unknown as google.maps.LatLngBounds,
				),
				getDiv: jest.fn(
					() =>
						({
							id: "map",
							querySelector: jest.fn(() => ({
								addEventListener: jest.fn(),
							})),
							getBoundingClientRect: jest.fn(() => ({})),
							addEventListener: jest.fn(),
						}) as unknown as HTMLDivElement,
				),
			});

			const getProjectionMock = jest.fn(() => ({
				fromContainerPixelToLatLng: jest.fn(() => ({
					lng: () => testLng,
					lat: () => testLat,
				})),
			}));

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					LatLngBounds: jest.fn(() => ({
						contains: jest.fn(() => true),
					})),
					Point: jest.fn(),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			adapter.register(MockCallbacks());

			const lngLatFromEvent = adapter.getLngLatFromEvent(MockPointerEvent());
			expect(lngLatFromEvent?.lng).toEqual(testLng);
			expect(lngLatFromEvent?.lat).toEqual(testLat);
		});

		it("returns uses the fullscreen element for boundingClientRect in fullscreen mode", () => {
			// Mock fullscreen element with its own getBoundingClientRect
			const fullscreenElementMock = {
				getBoundingClientRect: jest.fn(() => ({
					left: 0,
					top: 0,
				})),
			};

			// Store original document.fullscreenElement
			const originalFullscreenElement = Object.getOwnPropertyDescriptor(
				document,
				"fullscreenElement",
			);

			// Mock document.fullscreenElement to return our mock element
			Object.defineProperty(document, "fullscreenElement", {
				configurable: true,
				get: () => fullscreenElementMock,
			});

			const mapMock = createMockGoogleMap({
				getBounds: jest.fn(
					() =>
						({
							getNorthEast: jest.fn(),
							getSouthWest: jest.fn(),
						}) as unknown as google.maps.LatLngBounds,
				),
				getDiv: jest.fn(
					() =>
						({
							id: "map",
							querySelector: jest.fn(() => ({
								addEventListener: jest.fn(),
							})),
							getBoundingClientRect: jest.fn(() => ({
								left: 371, // we do NOT want to see these returned
								top: 580,
							})),
							addEventListener: jest.fn(),
						}) as unknown as HTMLDivElement,
				),
			});

			const testX = 10;
			const testY = 15;

			const fromContainerPixelToLatLngMock = jest.fn((passed) => {
				return {
					lng: () => (passed.x === testX ? testLng : -1.01),
					lat: () => (passed.y === testY ? testLat : -1.01),
				};
			});
			const getProjectionMock = jest.fn(() => ({
				fromContainerPixelToLatLng: fromContainerPixelToLatLngMock,
			}));

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					LatLngBounds: jest.fn(() => ({
						contains: jest.fn(() => true),
					})),
					Point: jest.fn((x, y) => ({ x, y })),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			adapter.register(MockCallbacks());

			let event = MockPointerEvent();
			// @ts-ignore -- ok to overwrite this in tests
			event.clientX = testX;
			// @ts-ignore -- ok to overwrite this in tests
			event.clientY = testY;

			const lngLatFromEvent = adapter.getLngLatFromEvent(event);

			// Verify that the fullscreen element's getBoundingClientRect was called
			expect(fullscreenElementMock.getBoundingClientRect).toHaveBeenCalled();

			expect(lngLatFromEvent?.lng).toEqual(testLng);
			expect(lngLatFromEvent?.lat).toEqual(testLat);

			// // Restore original document.fullscreenElement
			if (originalFullscreenElement) {
				Object.defineProperty(
					document,
					"fullscreenElement",
					originalFullscreenElement,
				);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				delete (document as any).fullscreenElement;
			}
		});
	});

	describe("project", () => {
		it("throws when not registered and cannot get overlay", () => {
			const mapMock = createMockGoogleMap({
				getBounds: jest.fn(() => undefined),
			});

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(() => undefined),
					})),
				} as any,
				map: mapMock,
			});

			expect(() => {
				adapter.project(-1, -2);
			}).toThrow("cannot get overlay");

			expect(mapMock.getBounds).not.toHaveBeenCalled();
		});

		it("throws when cannot get bounds", () => {
			const mapMock = createMockGoogleMap({
				getBounds: jest.fn(() => undefined),
			});

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(() => undefined),
					})),
				} as any,
				map: mapMock,
			});

			adapter.register(MockCallbacks());

			expect(() => {
				adapter.project(-1, -2);
			}).toThrow("cannot get bounds");

			expect(mapMock.getBounds).toHaveBeenCalled();
		});

		it("throws when projection unavailable", () => {
			const mapMock = createMockGoogleMap();
			// For now the bounds are just used to determine if within the map (existence only)
			mapMock.getBounds = jest.fn(() => ({}) as google.maps.LatLngBounds);

			const getProjectionMock = jest.fn();

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			adapter.register(MockCallbacks());

			expect(() => {
				adapter.project(testLng, testLat);
			}).toThrow();

			expect(getProjectionMock).toHaveBeenCalledTimes(1);
		});

		it("throws when coordinates cannot be projected", () => {
			const mapMock = createMockGoogleMap();
			// For now the bounds are just used to determine if within the map (existence only)
			mapMock.getBounds = jest.fn(() => ({}) as google.maps.LatLngBounds);

			const fromLatLngToContainerPixelMock = jest.fn(() => null);
			const getProjectionMock = jest.fn(() => ({
				fromLatLngToContainerPixel: fromLatLngToContainerPixelMock,
			}));

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			adapter.register(MockCallbacks());

			expect(() => {
				adapter.project(testLng, testLat);
			}).toThrow();

			expect(getProjectionMock).toHaveBeenCalledTimes(1);
			expect(fromLatLngToContainerPixelMock).toHaveBeenCalledTimes(1);
		});

		it("projects valid long & lat", () => {
			const mapMock = createMockGoogleMap();
			// For now the bounds are just used to determine if within the map (existence only)
			mapMock.getBounds = jest.fn(() => ({}) as google.maps.LatLngBounds);

			const getProjectionMock = jest.fn(() => ({
				fromLatLngToContainerPixel: jest.fn(() => ({
					x: 50,
					y: 80,
				})),
			}));

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: mapMock,
			});

			adapter.register(MockCallbacks());

			const projected = adapter.project(testLng, testLat);

			expect(getProjectionMock).toHaveBeenCalledTimes(1);

			expect(projected.x).toEqual(50);
			expect(projected.y).toEqual(80);
		});
	});

	describe("unproject", () => {
		it("throws when unregistered and overlay unavailable", () => {
			const getProjectionMock = jest.fn(() => undefined);

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: createMockGoogleMap(),
			});

			expect(() => {
				adapter.unproject(50, 80);
			}).toThrow();

			expect(getProjectionMock).not.toHaveBeenCalled();
		});

		it("throws when projection unavailable", () => {
			const getProjectionMock = jest.fn(() => undefined);

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
				} as any,
				map: createMockGoogleMap(),
			});

			adapter.register(MockCallbacks());

			expect(() => {
				adapter.unproject(-1, -2);
			}).toThrow();

			expect(getProjectionMock).toHaveBeenCalled();
		});

		it("unprojects valid points", () => {
			const getProjectionMock = jest.fn(() => ({
				fromContainerPixelToLatLng: jest.fn(() => ({
					lng: () => testLng,
					lat: () => testLat,
				})),
			}));

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					LatLng: jest.fn(),
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: getProjectionMock,
					})),
					Point: jest.fn(),
				} as any,
				map: createMockGoogleMap(),
			});

			adapter.register(MockCallbacks());

			const unprojected = adapter.unproject(50, 80);
			expect(getProjectionMock).toHaveBeenCalledTimes(1);

			expect(unprojected.lng).toEqual(testLng);
			expect(unprojected.lat).toEqual(testLat);
		});
	});

	describe("setCursor", () => {
		it("is no-op for cursor: unset", () => {
			const map = createMockGoogleMap() as google.maps.Map;
			const container = {
				id: "map",
				offsetLeft: 0,
				offsetTop: 0,
				style: { removeProperty: jest.fn(), cursor: "initial" },
			} as any;

			map.getDiv = jest.fn(() => container);

			// Create the adapter instance with the mocked map
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as any,
				map,
			});

			// We want to reset getDiv so we can correctly ensure
			// map.getDiv is not called in setCursor
			jest.resetAllMocks();

			adapter.setCursor("unset");

			expect(map.getDiv).not.toHaveBeenCalled();
			expect(container.style.removeProperty).not.toHaveBeenCalledTimes(1);
		});

		it("sets to pointer", () => {
			const elId = "map-container";
			const map = createMockGoogleMap() as google.maps.Map;
			const container = {
				...document.createElement("div"),
				offsetLeft: 0,
				offsetTop: 0,
				id: elId,
				querySelector: jest.fn(),
			};

			map.getDiv = jest.fn(() => container);

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as any,
				map,
			});

			const mockQuerySelector = jest.spyOn(container, "querySelector");
			mockQuerySelector.mockImplementationOnce(
				() => ({ classList: { add: jest.fn() } }) as unknown as Element,
			);

			adapter.setCursor("pointer");

			const firstSheetAndRule = document.styleSheets[0]
				.cssRules[0] as CSSStyleRule;
			expect(
				firstSheetAndRule.selectorText.startsWith(`.terra-draw-google-maps`),
			).toBeTruthy();
			expect(
				firstSheetAndRule.cssText.includes(`cursor: pointer`),
			).toBeTruthy();
		});

		it("exits early when no update to cursor type", () => {
			const elId = "map-container";
			const map = createMockGoogleMap() as google.maps.Map;
			const container = {
				...document.createElement("div"),
				offsetLeft: 0,
				offsetTop: 0,
				id: elId,
				querySelector: jest.fn(() => document.createElement("div")),
			};

			map.getDiv = jest.fn(() => container);

			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn().mockImplementation(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as any,
				map,
			});

			const createElementSpy = jest.spyOn(document, "createElement");

			adapter.setCursor("pointer");
			adapter.setCursor("pointer");
			adapter.setCursor("pointer");

			// filter only document.createElement('style')
			const calls = createElementSpy.mock.calls.filter(
				(args) => args[0] === "style",
			);
			expect(calls.length).toBe(1);
		});
	});

	describe("render", () => {
		it("rejects updates to invalid features", () => {
			const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;
			let style: unknown = null;
			const mockMap = createMockGoogleMap({
				data: {
					getStyle: () => style,
					addListener: () => {},
					addGeoJson: () => {},
					remove: () => {},
					getFeatureById: () => {},
					setStyle: (s: unknown) => {
						style = s;
					},
				} as any,
			});
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn(() => ({
						setMap: () => {},
						getProjection: () => {},
					})),
				} as any,
				map: mockMap,
			});

			adapter.render(
				{
					unchanged: [],
					created: [pointOne],
					deletedIds: [],
					updated: [],
				},
				mockStyleDraw,
			);

			const pointTwo = MockPoint("point-2") as GeoJSONStoreFeatures;
			pointTwo.id = undefined;

			expect(() => {
				adapter.render(
					{
						unchanged: [pointOne],
						created: [],
						deletedIds: [],
						updated: [pointTwo],
					},
					mockStyleDraw,
				);
			}).toThrow();
		});

		it("rejects updates to unrecognized/out-of-sync features", () => {
			const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;
			Object.assign(pointOne, { forEachProperty: () => {} });
			Object.assign(pointOne, { setProperty: () => {} });
			Object.assign(pointOne, { setGeometry: jest.fn() });
			const getFeatureByIdMock = jest.fn((featureId: string) => {
				// Only the feature created during the first render exists.
				// Any update for an unknown id should return undefined.
				return [pointOne].find((f) => f.id === featureId);
			});
			let style: unknown = null;
			const mockMap = createMockGoogleMap({
				data: {
					getStyle: () => style,
					addListener: jest.fn(),
					addGeoJson: () => {},
					remove: () => {},
					getFeatureById: getFeatureByIdMock,
					setStyle: (s: unknown) => {
						style = s;
					},
				} as any,
			});
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
					LatLng: jest.fn(),
					Data: {
						Point: jest.fn(),
					},
				} as any,
				map: mockMap,
			});

			adapter.render(
				{
					unchanged: [],
					created: [pointOne],
					deletedIds: [],
					updated: [],
				},
				mockStyleDraw,
			);
			flushRaf();

			// Not present in map copy of state, will cause to throw
			const pointTwo = MockPoint("point-2") as GeoJSONStoreFeatures;

			// The adapter only throws for out-of-sync features when applying updates
			// after the initial render. Because render work is queued via
			// requestAnimationFrame, the exception is raised when we flush the frame.
			expect(() => {
				adapter.render(
					{
						unchanged: [],
						created: [],
						deletedIds: [],
						updated: [pointOne, pointTwo],
					},
					mockStyleDraw,
				);
				flushRaf();
			}).toThrow("Feature could not be found by Google Maps API");

			// pointOne lookup + failing pointTwo lookup
			expect(getFeatureByIdMock).toHaveBeenCalledTimes(2);
		});

		describe("Point", () => {
			it("adds and deletes features", () => {
				const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;
				const pointTwo = MockPoint("point-2", 2, 4) as GeoJSONStoreFeatures;
				const addGeoJsonMock = jest.fn();
				const removeMock = jest.fn();
				let style: unknown = null;
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: jest.fn(),
						addGeoJson: addGeoJsonMock,
						remove: removeMock,
						getFeatureById: (featureId: string) =>
							[pointOne, pointTwo].find((s) => s.id === featureId),
						setStyle: jest.fn((s: unknown) => {
							style = s;
						}),
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
					} as any,
					map: mockMap,
				});

				adapter.render(
					{
						unchanged: [],
						created: [pointOne, pointTwo],
						deletedIds: [],
						updated: [],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [
							expect.objectContaining({ id: pointOne.id }),
							expect.objectContaining({ id: pointTwo.id }),
						],
					}),
				);

				adapter.render(
					{
						unchanged: [pointOne],
						created: [],
						deletedIds: [pointTwo.id!.toString()],
						updated: [],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(removeMock).toHaveBeenCalledWith(
					expect.objectContaining({ id: pointTwo.id }),
				);
			});

			it("applies styles to added feature", () => {
				const feature = MockPoint("point-1") as GeoJSONStoreFeatures;
				Object.assign(feature, {
					getGeometry: jest.fn(() => ({
						getType: () => "Point",
					})),
				});

				const testStyles: TerraDrawAdapterStyling = {
					pointColor: "#FF0000",
					pointOutlineWidth: 5,
					pointOutlineColor: "#FFFFFF",
				} as unknown as TerraDrawAdapterStyling;

				// looks up mode
				Object.assign(feature, { getProperty: () => "test" });
				Object.assign(feature, { forEachProperty: () => {} });
				Object.assign(feature, { getId: () => feature.id });

				const addGeoJsonMock = jest.fn();
				let style: unknown = null;
				const setStyleMock = jest.fn((cb) => {
					style = cb;
				});
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: () => {},
						addGeoJson: addGeoJsonMock,
						remove: () => {},
						getFeatureById: (featureId: string) =>
							[feature].find((s) => s.id === featureId),
						setStyle: setStyleMock,
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
					} as any,
					map: mockMap,
				});

				adapter.render(
					{
						unchanged: [],
						created: [feature],
						deletedIds: [],
						updated: [],
					},
					{ test: () => testStyles },
				);
				flushRaf();

				// Google Maps stores a style callback and calls it lazily; emulate that.
				const styleFn = mockMap.data.getStyle() as unknown as (
					f: unknown,
				) => unknown;
				const setStyleResult = styleFn(feature) as unknown as {
					icon?: { strokeColor?: unknown; strokeWeight?: unknown };
				};

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [expect.objectContaining({ id: feature.id })],
					}),
				);

				expect(setStyleResult).toHaveProperty("icon");
				expect(setStyleResult!.icon!.strokeColor).toEqual(
					testStyles.pointOutlineColor,
				);
				expect(setStyleResult!.icon!.strokeWeight).toEqual(
					testStyles.pointOutlineWidth,
				);
			});

			it("adds features on successive renders", () => {
				const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;
				const addGeoJsonMock = jest.fn();
				let style: unknown = null;
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: jest.fn(),
						addGeoJson: addGeoJsonMock,
						remove: jest.fn(),
						getFeatureById: jest.fn(),
						setStyle: jest.fn((s: unknown) => {
							style = s;
						}),
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
					} as any,
					map: mockMap,
				});

				adapter.render(
					{ unchanged: [], created: [], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				flushRaf();
				expect(addGeoJsonMock).not.toHaveBeenCalled();

				adapter.render(
					{
						unchanged: [],
						created: [pointOne],
						deletedIds: [],
						updated: [],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [expect.objectContaining({ id: pointOne.id })],
					}),
				);
			});

			it("updates features on successive renders", () => {
				const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;
				const addGeoJsonMock = jest.fn();
				const dummyProp = "dummy";
				const forEachPropertyMock = jest.fn((cb) => {
					cb("propValue", dummyProp);
				});
				const setPropertyMock = jest.fn();
				Object.assign(pointOne, { forEachProperty: forEachPropertyMock });
				Object.assign(pointOne, { setProperty: setPropertyMock });
				Object.assign(pointOne, { setGeometry: jest.fn() });

				let style: unknown = null;
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: jest.fn(),
						addGeoJson: addGeoJsonMock,
						remove: () => {},
						getFeatureById: (featureId: string) =>
							[pointOne].find((s) => s.id === featureId),
						setStyle: jest.fn((s: unknown) => {
							style = s;
						}),
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
						LatLng: jest.fn(),
						Data: {
							LineString: jest.fn(),
							Polygon: jest.fn(),
							Point: jest.fn(),
						},
					} as any,
					map: mockMap,
				});

				adapter.render(
					{ unchanged: [], created: [pointOne], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				flushRaf();

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [expect.objectContaining({ id: pointOne.id })],
					}),
				);

				adapter.render(
					{
						unchanged: [],
						created: [],
						deletedIds: [],
						updated: [pointOne],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(setPropertyMock).toHaveBeenCalledWith(dummyProp, undefined);
			});
		});

		describe("LineString", () => {
			it("adds and deletes features", () => {
				const pointOne = MockLineString(
					"line-string-1",
				) as GeoJSONStoreFeatures;
				const pointTwo = MockLineString(
					"line-string-2",
				) as GeoJSONStoreFeatures;
				const addGeoJsonMock = jest.fn();
				const removeMock = jest.fn();
				let style: unknown = null;
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: jest.fn(),
						addGeoJson: addGeoJsonMock,
						remove: removeMock,
						getFeatureById: (featureId: string) =>
							[pointOne, pointTwo].find((s) => s.id === featureId),
						setStyle: jest.fn((s: unknown) => {
							style = s;
						}),
					} as unknown as google.maps.Data,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
					} as unknown as typeof google.maps,
					map: mockMap,
				});

				adapter.render(
					{
						unchanged: [],
						created: [pointOne, pointTwo],
						deletedIds: [],
						updated: [],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [
							expect.objectContaining({ id: pointOne.id }),
							expect.objectContaining({ id: pointTwo.id }),
						],
					}),
				);

				adapter.render(
					{
						unchanged: [pointOne],
						created: [],
						deletedIds: [pointTwo.id!.toString()],
						updated: [],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(removeMock).toHaveBeenCalledWith(
					expect.objectContaining({ id: pointTwo.id }),
				);
			});

			it("applies styles to added feature", () => {
				const feature = MockLineString("line-string-1") as GeoJSONStoreFeatures;
				Object.assign(feature, {
					getGeometry: jest.fn(() => ({
						getType: () => "LineString",
					})),
				});

				const testStyles: TerraDrawAdapterStyling = {
					lineStringWidth: 5,
					lineStringColor: "#FFFFFF",
				} as unknown as TerraDrawAdapterStyling;

				Object.assign(feature, { getProperty: () => "test" });
				Object.assign(feature, { forEachProperty: () => {} });
				Object.assign(feature, { getId: () => feature.id });

				const addGeoJsonMock = jest.fn();
				let style: unknown = null;
				const setStyleMock = jest.fn((cb) => {
					style = cb;
				});
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: () => {},
						addGeoJson: addGeoJsonMock,
						remove: () => {},
						getFeatureById: (featureId: string) =>
							[feature].find((s) => s.id === featureId),
						setStyle: setStyleMock,
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
					} as unknown as typeof google.maps,
					map: mockMap,
				});

				adapter.render(
					{
						unchanged: [],
						created: [feature],
						deletedIds: [],
						updated: [],
					},
					{ test: () => testStyles },
				);
				flushRaf();

				const styleFn = mockMap.data.getStyle() as unknown as (
					f: unknown,
				) => unknown;
				const setStyleResult = styleFn(feature) as unknown as {
					strokeColor?: unknown;
					strokeWeight?: unknown;
				};

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [expect.objectContaining({ id: feature.id })],
					}),
				);

				expect(setStyleResult!.strokeColor).toEqual(testStyles.lineStringColor);
				expect(setStyleResult!.strokeWeight).toEqual(
					testStyles.lineStringWidth,
				);
			});

			it("adds features on successive renders", () => {
				const pointOne = MockLineString(
					"line-string-1",
				) as GeoJSONStoreFeatures;
				const addGeoJsonMock = jest.fn();
				let style: unknown = null;
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: jest.fn(),
						addGeoJson: addGeoJsonMock,
						remove: jest.fn(),
						getFeatureById: jest.fn(),
						setStyle: jest.fn((s: unknown) => {
							style = s;
						}),
					} as unknown as google.maps.Data,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
					} as unknown as typeof google.maps,
					map: mockMap,
				});

				adapter.render(
					{ unchanged: [], created: [], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				flushRaf();
				expect(addGeoJsonMock).not.toHaveBeenCalled();

				adapter.render(
					{
						unchanged: [],
						created: [pointOne],
						deletedIds: [],
						updated: [],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [expect.objectContaining({ id: pointOne.id })],
					}),
				);
			});

			it("updates features on successive renders", () => {
				const pointOne = MockLineString(
					"line-string-1",
				) as GeoJSONStoreFeatures;
				const addGeoJsonMock = jest.fn();
				const dummyProp = "dummy";
				const forEachPropertyMock = jest.fn((cb) => {
					cb("propValue", dummyProp);
				});
				const setPropertyMock = jest.fn();
				Object.assign(pointOne, { forEachProperty: forEachPropertyMock });
				Object.assign(pointOne, { setProperty: setPropertyMock });
				Object.assign(pointOne, { setGeometry: jest.fn() });

				let style: unknown = null;
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: jest.fn(),
						addGeoJson: addGeoJsonMock,
						remove: () => {},
						getFeatureById: (featureId: string) =>
							[pointOne].find((s) => s.id === featureId),
						setStyle: jest.fn((s: unknown) => {
							style = s;
						}),
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
						LatLng: jest.fn(),
						Data: {
							LineString: jest.fn(),
							Polygon: jest.fn(),
							Point: jest.fn(),
						},
					} as unknown as typeof google.maps,
					map: mockMap,
				});

				adapter.render(
					{ unchanged: [], created: [pointOne], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				flushRaf();

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [expect.objectContaining({ id: pointOne.id })],
					}),
				);

				adapter.render(
					{
						unchanged: [],
						created: [],
						deletedIds: [],
						updated: [pointOne],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(setPropertyMock).toHaveBeenCalledWith(dummyProp, undefined);
			});
		});

		describe("Polygon", () => {
			it("adds and deletes features", () => {
				const sq1 = MockPolygonSquare("square-1") as GeoJSONStoreFeatures;
				const sq2 = MockPolygonSquare("square-2", 2, 4) as GeoJSONStoreFeatures;
				const addGeoJsonMock = jest.fn();
				const removeMock = jest.fn();
				let style: unknown = null;
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: jest.fn(),
						addGeoJson: addGeoJsonMock,
						remove: removeMock,
						getFeatureById: (featureId: string) =>
							[sq1, sq2].find((s) => s.id === featureId),
						setStyle: jest.fn((s: unknown) => {
							style = s;
						}),
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
					} as unknown as typeof google.maps,
					map: mockMap,
				});

				adapter.render(
					{
						unchanged: [],
						created: [sq1, sq2],
						deletedIds: [],
						updated: [],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [
							expect.objectContaining({ id: sq1.id }),
							expect.objectContaining({ id: sq2.id }),
						],
					}),
				);

				adapter.render(
					{
						unchanged: [sq1],
						created: [],
						deletedIds: [sq2.id!.toString()],
						updated: [],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(removeMock).toHaveBeenCalledWith(
					expect.objectContaining({ id: sq2.id }),
				);
			});

			it("applies styles to added feature", () => {
				const feature = MockPolygonSquare("square-1") as GeoJSONStoreFeatures;
				Object.assign(feature, {
					getGeometry: jest.fn(() => ({
						getType: () => "Polygon",
					})),
				});

				const testStyles: TerraDrawAdapterStyling = {
					polygonOutlineWidth: 5,
					polygonOutlineColor: "#FFFFFF",
				} as unknown as TerraDrawAdapterStyling;

				Object.assign(feature, { getProperty: () => "test" });
				Object.assign(feature, { forEachProperty: () => {} });
				Object.assign(feature, { getId: () => feature.id });

				const addGeoJsonMock = jest.fn();
				let style: unknown = null;
				const setStyleMock = jest.fn((cb) => {
					style = cb;
				});
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: () => {},
						addGeoJson: addGeoJsonMock,
						remove: () => {},
						getFeatureById: (featureId: string) =>
							[feature].find((s) => s.id === featureId),
						setStyle: setStyleMock,
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
					} as any,
					map: mockMap,
				});

				adapter.render(
					{
						unchanged: [],
						created: [feature],
						deletedIds: [],
						updated: [],
					},
					{ test: () => testStyles },
				);
				flushRaf();

				const styleFn = mockMap.data.getStyle() as unknown as (f: any) => any;
				const setStyleResult = styleFn(feature);

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [expect.objectContaining({ id: feature.id })],
					}),
				);

				expect(setStyleResult!.strokeColor).toEqual(
					testStyles.polygonOutlineColor,
				);
				expect(setStyleResult!.strokeWeight).toEqual(
					testStyles.polygonOutlineWidth,
				);
			});

			it("adds features on successive renders", () => {
				const sq1 = MockPolygonSquare("square-1") as GeoJSONStoreFeatures;
				const addGeoJsonMock = jest.fn();
				let style: unknown = null;
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: jest.fn(),
						addGeoJson: addGeoJsonMock,
						remove: jest.fn(),
						getFeatureById: jest.fn(),
						setStyle: jest.fn((s: unknown) => {
							style = s;
						}),
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
					} as any,
					map: mockMap,
				});

				adapter.render(
					{ unchanged: [], created: [], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				flushRaf();
				expect(addGeoJsonMock).not.toHaveBeenCalled();

				adapter.render(
					{
						unchanged: [],
						created: [sq1],
						deletedIds: [],
						updated: [],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [expect.objectContaining({ id: sq1.id })],
					}),
				);
			});

			it("updates features on successive renders", () => {
				const sq1 = MockPolygonSquare("square-1") as GeoJSONStoreFeatures;
				const addGeoJsonMock = jest.fn();
				const dummyProp = "dummy";
				const forEachPropertyMock = jest.fn((cb) => {
					cb("propValue", dummyProp);
				});
				const setPropertyMock = jest.fn();
				Object.assign(sq1, { forEachProperty: forEachPropertyMock });
				Object.assign(sq1, { setProperty: setPropertyMock });
				Object.assign(sq1, { setGeometry: jest.fn() });

				let style: unknown = null;
				const mockMap = createMockGoogleMap({
					data: {
						getStyle: () => style,
						addListener: jest.fn(),
						addGeoJson: addGeoJsonMock,
						remove: () => {},
						getFeatureById: (featureId: string) =>
							[sq1].find((s) => s.id === featureId),
						setStyle: jest.fn((s: unknown) => {
							style = s;
						}),
					} as any,
				});
				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
						LatLng: jest.fn(),
						Data: {
							LineString: jest.fn(),
							Polygon: jest.fn(),
							Point: jest.fn(),
						},
					} as any,
					map: mockMap,
				});

				adapter.render(
					{ unchanged: [], created: [sq1], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				flushRaf();

				expect(addGeoJsonMock).toHaveBeenCalledWith(
					expect.objectContaining({
						features: [expect.objectContaining({ id: sq1.id })],
					}),
				);

				adapter.render(
					{
						unchanged: [],
						created: [],
						deletedIds: [],
						updated: [sq1],
					},
					mockStyleDraw,
				);
				flushRaf();

				expect(setPropertyMock).toHaveBeenCalledWith(dummyProp, undefined);
			});
		});

		describe("requestAnimationFrame checks", () => {
			it("queues RAF callbacks and flushRaf() runs them in order", () => {
				const calls: number[] = [];
				requestAnimationFrame(() => calls.push(1));
				requestAnimationFrame(() => calls.push(2));

				expect(calls).toEqual([]);
				flushRaf();
				expect(calls).toEqual([1, 2]);
			});

			it("supports nested scheduling within a frame", () => {
				const calls: string[] = [];

				requestAnimationFrame(() => {
					calls.push("a");
					requestAnimationFrame(() => calls.push("b"));
				});

				flushRaf();
				expect(calls).toEqual(["a", "b"]);
			});

			it("throws when flushRaf maxFrames is exceeded", () => {
				requestAnimationFrame(() => {
					// Schedule another frame forever
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							// keep queue non-empty
						});
					});
				});

				expect(() => flushRaf(1)).toThrow(/exceeded maxFrames=1/);
			});

			it("resets the queue between tests (via beforeEach)", () => {
				// If this test runs, beforeEach has already reset rafQueue to []
				flushRaf();
				// No assertion needed beyond not throwing; schedule and run a single frame
				const fn = jest.fn();
				requestAnimationFrame(fn);
				flushRaf();
				expect(fn).toHaveBeenCalledTimes(1);
			});
		});

		describe("render batching", () => {
			const createAdapterWithMapSpies = () => {
				const addGeoJson = jest.fn();
				const remove = jest.fn();
				const getFeatureById = jest.fn();
				const setStyle = jest.fn();
				const getStyle = jest.fn(() => null);

				const mockMap = createMockGoogleMap({
					data: {
						addListener: jest.fn(),
						addGeoJson,
						remove,
						getFeatureById,
						setStyle,
						getStyle,
					} as any,
				});

				const adapter = new TerraDrawGoogleMapsAdapter({
					lib: {
						OverlayView: jest.fn(() => ({
							setMap: jest.fn(),
							getProjection: jest.fn(),
						})),
						LatLng: jest.fn(),
						LatLngBounds: jest.fn(),
						Point: jest.fn(),
						Size: jest.fn(),
						Data: {
							Point: jest.fn(),
							LineString: jest.fn(),
							Polygon: jest.fn(),
						},
					} as any,
					map: mockMap,
				});

				return {
					adapter,
					mockMap,
					spies: { addGeoJson, remove, getFeatureById, setStyle, getStyle },
				};
			};

			it("coalesces multiple render() calls into a single RAF flush", () => {
				const { adapter, spies } = createAdapterWithMapSpies();

				const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;
				const pointTwo = MockPoint("point-2") as GeoJSONStoreFeatures;

				adapter.render(
					{ unchanged: [], created: [pointOne], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				adapter.render(
					{ unchanged: [], created: [pointTwo], deletedIds: [], updated: [] },
					mockStyleDraw,
				);

				// Nothing should apply until RAF flush
				expect(spies.addGeoJson).toHaveBeenCalledTimes(0);
				flushRaf();

				// First render path batches into a single FeatureCollection
				expect(spies.addGeoJson).toHaveBeenCalledTimes(1);
				const arg = spies.addGeoJson.mock.calls[0][0] as FeatureCollection;
				expect(arg.type).toBe("FeatureCollection");
				expect(arg.features.map((feature) => feature.id).sort()).toEqual(
					["point-1", "point-2"].sort(),
				);
			});

			it("delete wins over update/create in the same frame", () => {
				const { adapter, spies } = createAdapterWithMapSpies();
				const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;

				// Create initial feature so later renders go down the _hasRenderedFeatures path
				adapter.render(
					{ unchanged: [], created: [pointOne], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				flushRaf();
				spies.addGeoJson.mockClear();

				const gmFeature = {
					id: "point-1",
					getId: () => "point-1",
					forEachProperty: jest.fn(),
					setProperty: jest.fn(),
					setGeometry: jest.fn(),
				} as any;
				spies.getFeatureById.mockReturnValue(gmFeature);

				adapter.render(
					{
						unchanged: [],
						created: [pointOne],
						deletedIds: ["point-1"],
						updated: [pointOne],
					},
					mockStyleDraw,
				);
				flushRaf();

				// Deleted applies, update/create should be suppressed
				expect(spies.remove).toHaveBeenCalledTimes(1);
				expect(spies.addGeoJson).toHaveBeenCalledTimes(0);
				expect(gmFeature.setGeometry).toHaveBeenCalledTimes(0);
			});

			it("create supersedes update for the same id within a frame (post-initial render)", () => {
				const { adapter, spies } = createAdapterWithMapSpies();
				const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;
				const pointOneUpdated = MockPoint(
					"point-1",
					5,
					6,
				) as GeoJSONStoreFeatures;

				adapter.render(
					{ unchanged: [], created: [pointOne], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				flushRaf();
				spies.addGeoJson.mockClear();

				const gmFeature = {
					id: "point-1",
					getId: () => "point-1",
					forEachProperty: jest.fn(),
					setProperty: jest.fn(),
					setGeometry: jest.fn(),
				} as any;
				spies.getFeatureById.mockReturnValue(gmFeature);

				adapter.render(
					{
						unchanged: [],
						created: [pointOneUpdated],
						deletedIds: [],
						updated: [pointOneUpdated],
					},
					mockStyleDraw,
				);
				flushRaf();

				// Because create supersedes update, it should addGeoJson (single feature) and not setGeometry.
				expect(spies.addGeoJson).toHaveBeenCalledTimes(1);
				expect(spies.addGeoJson).toHaveBeenCalledWith(pointOneUpdated);
				expect(gmFeature.setGeometry).toHaveBeenCalledTimes(0);
			});

			it("latest update wins when multiple updates for same id are queued in one frame", () => {
				const { adapter, spies } = createAdapterWithMapSpies();
				const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;

				adapter.render(
					{ unchanged: [], created: [pointOne], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				flushRaf();

				const gmFeature = {
					id: "point-1",
					getId: () => "point-1",
					forEachProperty: jest.fn((cb: any) => {
						// no existing props
					}),
					setProperty: jest.fn(),
					setGeometry: jest.fn(),
				} as any;
				spies.getFeatureById.mockReturnValue(gmFeature);

				const pointOneUpdate1 = MockPoint(
					"point-1",
					1,
					1,
				) as GeoJSONStoreFeatures;
				(pointOneUpdate1.properties as any) = { mode: "point", a: 1 };
				const pointOneUpdate2 = MockPoint(
					"point-1",
					2,
					2,
				) as GeoJSONStoreFeatures;
				(pointOneUpdate2.properties as any) = { mode: "point", a: 2 };

				adapter.render(
					{
						unchanged: [],
						created: [],
						deletedIds: [],
						updated: [pointOneUpdate1],
					},
					mockStyleDraw,
				);
				adapter.render(
					{
						unchanged: [],
						created: [],
						deletedIds: [],
						updated: [pointOneUpdate2],
					},
					mockStyleDraw,
				);
				flushRaf();

				// Last one should win: expect lat/lng (2,2) in the LatLng constructor and property a=2 set.
				const latLngCalls = (adapter as any)._lib.LatLng.mock.calls;
				expect(latLngCalls[latLngCalls.length - 1]).toEqual([2, 2]);
				expect(gmFeature.setProperty).toHaveBeenCalledWith("a", 2);
			});

			it("resets rafId allowing subsequent frames to schedule", () => {
				const { adapter, spies } = createAdapterWithMapSpies();
				const pointOne = MockPoint("point-1") as GeoJSONStoreFeatures;
				const pointTwo = MockPoint("point-2") as GeoJSONStoreFeatures;

				const rafSpy = jest.spyOn(globalThis, "requestAnimationFrame");

				adapter.render(
					{ unchanged: [], created: [pointOne], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				expect(rafSpy).toHaveBeenCalledTimes(1);
				flushRaf();

				spies.addGeoJson.mockClear();
				adapter.render(
					{ unchanged: [], created: [pointTwo], deletedIds: [], updated: [] },
					mockStyleDraw,
				);
				// A new frame should be scheduled after previous flush cleared rafId
				expect(rafSpy).toHaveBeenCalledTimes(2);
				flushRaf();
				expect(spies.addGeoJson).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("clear", () => {
		it("is safe to call without features", () => {
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as unknown as typeof google.maps,
				map: createMockGoogleMap(),
			});

			adapter.clear();
		});
		it("is clears data.setStyle function", () => {
			let style: unknown = null;
			const mockMap = createMockGoogleMap({
				// If the adapter sees a style already set, it exits early.
				// Use a stateful getStyle/setStyle pair so render can proceed.
				data: {
					getStyle: () => style,
					setStyle: jest.fn((s: unknown) => {
						style = s;
					}),
				} as any,
			});
			const adapter = new TerraDrawGoogleMapsAdapter({
				lib: {
					OverlayView: jest.fn(() => ({
						setMap: jest.fn(),
						getProjection: jest.fn(),
					})),
				} as unknown as typeof google.maps,
				map: mockMap,
			});

			adapter.clear();

			expect(mockMap.data.setStyle).toHaveBeenCalled();
		});
	});
});

const mockStyleDraw = {
	test: jest.fn(() => ({}) as any),
};
