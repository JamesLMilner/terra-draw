import { TerraDrawLeafletAdapter } from "./leaflet.adapter";
import { getMockPointerEvent } from "../test/mock-pointer-event";
import { TerraDrawCallbacks } from "../common";

const callbacks = () =>
	({
		getState: jest.fn(() => "started"),
		onKeyUp: jest.fn(),
		onKeyDown: jest.fn(),
		onClick: jest.fn(),
		onMouseMove: jest.fn(),
		onDragStart: jest.fn(),
		onDrag: jest.fn(),
		onDragEnd: jest.fn(),
		onClear: jest.fn(),
	}) as TerraDrawCallbacks;

const createLeafletMap = () => {
	return {
		getContainer: jest.fn(
			() =>
				({
					getBoundingClientRect: jest.fn(() => ({ top: 0, left: 0 })),
					style: { removeProperty: jest.fn(), cursor: "initial" },
					addEventListener: jest.fn(),
					removeEventListener: jest.fn(),
				}) as any,
		),
		latLngToContainerPoint: jest.fn(() => ({ x: 0, y: 0 }) as any),
		containerPointToLatLng: jest.fn(() => ({ lng: 0, lat: 0 }) as any),
		doubleClickZoom: {
			enable: jest.fn(),
			disable: jest.fn(),
			enabled: jest.fn(),
		},
		dragging: { enable: jest.fn(), disable: jest.fn(), enabled: jest.fn() },
		on: jest.fn(),
		off: jest.fn(),
		createPane: jest.fn(),
		getPane: jest.fn(),
		removeLayer: jest.fn(),
		addLayer: jest.fn(),
	} as Partial<L.Map>;
};

describe("TerraDrawLeafletAdapter", () => {
	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawLeafletAdapter({
				lib: {
					circleMarker: jest.fn(),
					geoJSON: jest.fn(),
				} as any,
				map: createLeafletMap() as L.Map,
				minPixelDragDistance: 1,
				minPixelDragDistanceSelecting: 8,
				minPixelDragDistanceDrawing: 8,
				coordinatePrecision: 9,
			});

			expect(adapter).toBeDefined();
			expect(adapter.getMapEventElement).toBeDefined();
			expect(adapter.render).toBeDefined();
			expect(adapter.register).toBeDefined();
			expect(adapter.unregister).toBeDefined();
			expect(adapter.project).toBeDefined();
			expect(adapter.unproject).toBeDefined();
			expect(adapter.setCursor).toBeDefined();
		});
	});

	describe("getLngLatFromEvent", () => {
		let adapter: TerraDrawLeafletAdapter;
		const map = createLeafletMap() as L.Map;
		beforeEach(() => {
			adapter = new TerraDrawLeafletAdapter({
				lib: {
					circleMarker: jest.fn(),
					geoJSON: jest.fn(),
				} as any,
				map,
			});
		});
		it("getLngLatFromEvent returns correct coordinates", () => {
			// Mock the containerPointToLatLng function
			map.containerPointToLatLng = jest.fn(() => ({
				lat: 51.507222,
				lng: -0.1275,
			})) as unknown as (point: L.PointExpression) => L.LatLng;

			const result = adapter.getLngLatFromEvent(getMockPointerEvent());
			expect(result).toEqual({ lat: 51.507222, lng: -0.1275 });
		});
	});

	describe("setDraggability", () => {
		it("setDraggability enables and disables map dragging", () => {
			const map = createLeafletMap() as L.Map;

			// Create the adapter instance with the mocked map
			const adapter = new TerraDrawLeafletAdapter({
				lib: {} as any,
				map,
				coordinatePrecision: 9,
			});

			// Test enabling dragging
			adapter.setDraggability(true);
			expect(map.dragging.enable).toHaveBeenCalledTimes(1);
			expect(map.dragging.disable).toHaveBeenCalledTimes(0);

			// Test disabling dragging
			adapter.setDraggability(false);
			expect(map.dragging.enable).toHaveBeenCalledTimes(1);
			expect(map.dragging.disable).toHaveBeenCalledTimes(1);
		});
	});

	it("project", () => {
		const map = createLeafletMap() as L.Map;

		// Create the adapter instance with the mocked map
		const adapter = new TerraDrawLeafletAdapter({
			lib: {} as any,
			map,
			coordinatePrecision: 9,
		});

		// Test enabling dragging
		adapter.project(0, 0);
		expect(map.latLngToContainerPoint).toHaveBeenCalledTimes(1);
		expect(map.latLngToContainerPoint).toBeCalledWith({ lat: 0, lng: 0 });
	});

	it("unproject", () => {
		const map = createLeafletMap() as L.Map;

		// Create the adapter instance with the mocked map
		const adapter = new TerraDrawLeafletAdapter({
			lib: {} as any,
			map,
			coordinatePrecision: 9,
		});

		// Test enabling dragging
		adapter.unproject(0, 0);
		expect(map.containerPointToLatLng).toHaveBeenCalledTimes(1);
		expect(map.containerPointToLatLng).toBeCalledWith({ x: 0, y: 0 });
	});

	it("setCursor", () => {
		const map = createLeafletMap() as L.Map;
		const container = {
			offsetLeft: 0,
			offsetTop: 0,
			style: { removeProperty: jest.fn(), cursor: "initial" },
		} as any;

		map.getContainer = jest.fn(() => container);

		// Create the adapter instance with the mocked map
		const adapter = new TerraDrawLeafletAdapter({
			lib: {} as any,
			map,
			coordinatePrecision: 9,
		});

		adapter.setCursor("unset");

		expect(map.getContainer).toHaveBeenCalledTimes(1);
		expect(container.style.removeProperty).toHaveBeenCalledTimes(1);

		adapter.setCursor("pointer");

		expect(map.getContainer).toHaveBeenCalledTimes(1);
		expect(container.style.cursor).toBe("pointer");
	});

	it("setDoubleClickToZoom", () => {
		const map = createLeafletMap() as L.Map;

		// Create the adapter instance with the mocked map
		const adapter = new TerraDrawLeafletAdapter({
			lib: {} as any,
			map,
			coordinatePrecision: 9,
		});

		adapter.setDoubleClickToZoom(true);

		expect(map.doubleClickZoom.enable).toHaveBeenCalledTimes(1);

		adapter.setDoubleClickToZoom(false);

		expect(map.doubleClickZoom.disable).toHaveBeenCalledTimes(1);
	});

	describe("render", () => {
		it("does nothing if no features are passed", () => {
			const map = createLeafletMap() as L.Map;

			// Create the adapter instance with the mocked map
			const adapter = new TerraDrawLeafletAdapter({
				lib: {} as any,
				map,
				coordinatePrecision: 9,
			});

			adapter.render(
				{ unchanged: [], created: [], deletedIds: [], updated: [] },
				{
					test: () => ({}) as any,
				},
			);
		});

		it("handles unchanged, created, deletedIds and updated", () => {
			const map = createLeafletMap() as L.Map;

			// Create the adapter instance with the mocked map
			const lib = {
				geoJSON: jest.fn(),
			} as any;

			const adapter = new TerraDrawLeafletAdapter({
				lib,
				map,
				coordinatePrecision: 9,
			});

			adapter.render(
				{
					unchanged: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [0, 0],
							},
							properties: {
								mode: "test",
							},
						},
					],
					created: [
						{
							id: "2",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 1],
							},
							properties: {
								mode: "test",
							},
						},
					],
					deletedIds: ["3"],
					updated: [
						{
							id: "4",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [2, 2],
							},
							properties: {
								mode: "test",
							},
						},
					],
				},
				{
					test: () => ({}) as any,
				},
			);

			expect(lib.geoJSON).toBeCalledTimes(2);
			expect(map.addLayer).toBeCalledTimes(2); // 1 for created 1 for updated
			expect(map.removeLayer).toBeCalledTimes(2); // 1 for update 1 for delete
		});
	});

	it("clear", () => {
		const map = createLeafletMap() as L.Map;

		// Create the adapter instance with the mocked map
		const lib = {
			geoJSON: jest.fn(),
		} as any;

		// Create the adapter instance with the mocked map
		const adapter = new TerraDrawLeafletAdapter({
			lib,
			map,
			coordinatePrecision: 9,
		});

		adapter.render(
			{
				unchanged: [],
				created: [
					{
						id: "1",
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [1, 1],
						},
						properties: {
							mode: "test",
						},
					},
				],
				deletedIds: [],
				updated: [],
			},
			{
				test: () => ({}) as any,
			},
		);

		adapter.register(callbacks());

		adapter.clear();

		expect(map.removeLayer).toBeCalledTimes(1);
	});
});
