import { getMockPointerEvent } from "../test/mock-pointer-event";
import { TerraDrawMaptalksAdapter } from "./maptalks.adapter";

const createMap = () => {
	return {
		coordinateToContainerPoint: jest.fn(() => ({ x: 0, y: 0 } as any)),
		containerPointToCoordinate: jest.fn(() => ({ lng: 0, lat: 0 } as any)),
		resetCursor: jest.fn(),
		setCursor: jest.fn(),
		getContainer: jest.fn(
			() =>
				({
					getBoundingClientRect: jest.fn().mockReturnValue({
						left: 0,
						top: 0,
					} as DOMRect),
				} as unknown as HTMLElement)
		),
		getPanels: jest.fn(() => {
			return {
				mapWrapper: {
					style: { removeProperty: jest.fn(), cursor: "default" },
				},
			};
		}),
		config: jest.fn(() => {}),
		on: jest.fn(),
		off: jest.fn(),
	} as Partial<any>;
};

describe("TerraDrawMaptalksAdapter", () => {
	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawMaptalksAdapter({
				map: createMap() as any,
			});

			expect(adapter).toBeDefined();
			expect(adapter.getMapContainer).toBeDefined();
			expect(adapter.render).toBeDefined();
			expect(adapter.register).toBeDefined();
			expect(adapter.unregister).toBeDefined();
			expect(adapter.project).toBeDefined();
			expect(adapter.unproject).toBeDefined();
			expect(adapter.setCursor).toBeDefined();
		});
	});

	describe("getLngLatFromEvent", () => {
		let adapter: TerraDrawMaptalksAdapter;
		const map = createMap();
		beforeEach(() => {
			adapter = new TerraDrawMaptalksAdapter({
				map: map as any,
			});
		});
		it("getLngLatFromEvent returns correct coordinates", () => {
			// Mock the containerPointToLatLng function
			map.containerPointToCoordinate = jest.fn((point) => ({
				y: 51.507222,
				x: -0.1275,
			})) as unknown as (point: any) => any;

			const result = adapter.getLngLatFromEvent(getMockPointerEvent());
			expect(result).toEqual({ lat: 51.507222, lng: -0.1275 });
		});
	});

	describe("getMapContainer", () => {
		let adapter: TerraDrawMaptalksAdapter;
		const map = createMap();
		beforeEach(() => {
			adapter = new TerraDrawMaptalksAdapter({
				map: map as any,
			});
		});

		it("returns the container", () => {
			const container = adapter.getMapContainer();
			expect(container.getBoundingClientRect).toBeDefined();
		});
	});

	describe("setDraggability", () => {
		it("setDraggability enables and disables map dragging", () => {
			const map = createMap();
			const adapter = new TerraDrawMaptalksAdapter({
				map: map as any,
			});

			const config: {
				draggable: boolean;
			} = {
				draggable: true,
			};

			map.config = jest.fn((key: "draggable", v) => {
				config[key] = v;
			});

			// Test enabling dragging
			adapter.setDraggability(true);
			expect(map.config).toHaveBeenCalledTimes(1);

			expect(config.draggable).toBe(true);

			// Test disabling dragging
			adapter.setDraggability(false);

			expect(map.config).toHaveBeenCalledTimes(2);

			expect(config.draggable).toBe(false);
		});
	});

	it("project", () => {
		const map = createMap();
		const adapter = new TerraDrawMaptalksAdapter({
			map: map as any,
		});

		// Test enabling dragging
		adapter.project(0, 0);
		expect(map.coordinateToContainerPoint).toHaveBeenCalledTimes(1);
		expect(map.coordinateToContainerPoint).toBeCalledWith({ x: 0, y: 0 });
	});

	it("unproject", () => {
		const map = createMap();
		const adapter = new TerraDrawMaptalksAdapter({
			map: map as any,
		});

		// Test enabling dragging
		adapter.unproject(0, 0);
		expect(map.containerPointToCoordinate).toHaveBeenCalledTimes(1);
		expect(map.containerPointToCoordinate).toBeCalledWith({ x: 0, y: 0 });
	});

	it("setCursor", () => {
		const map = createMap();
		const adapter = new TerraDrawMaptalksAdapter({
			map: map as any,
		});

		const container = {
			offsetLeft: 0,
			offsetTop: 0,
			style: { removeProperty: jest.fn(), cursor: "default" },
		} as any;

		map.getPanels = jest.fn(() => ({
			mapWrapper: container,
		}));

		map.resetCursor = jest.fn();

		adapter.setCursor("unset");

		expect(map.resetCursor).toHaveBeenCalledTimes(1);

		adapter.setCursor("pointer");

		expect(map.setCursor).toHaveBeenCalledTimes(1);
	});

	it("setDoubleClickToZoom", () => {
		const map = createMap();
		const adapter = new TerraDrawMaptalksAdapter({
			map: map as any,
		});

		let config: any = {
			doubleClickZoom: true,
		};

		map.config = jest.fn((v) => {
			config = v;
		});

		adapter.setDoubleClickToZoom(true);

		expect(map.config).toHaveBeenCalledTimes(1);

		expect(config.doubleClickZoom).toBe(true);

		adapter.setDoubleClickToZoom(false);

		expect(map.config).toHaveBeenCalledTimes(2);

		expect(config.doubleClickZoom).toBe(false);
	});
});
