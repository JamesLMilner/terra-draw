import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawCircleMode } from "./circle.mode";

describe("TerraDrawCircleMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const circleMode = new TerraDrawCircleMode();
			expect(circleMode.mode).toBe("circle");
			expect(circleMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: {
					cancel: "Backspace",
					finish: "Enter",
				},
			});
			expect(circleMode.styles).toStrictEqual({
				fillColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawCircleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawCircleMode({
				styles: { fillColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const circleMode = new TerraDrawCircleMode();
			expect(circleMode.state).toBe("unregistered");
			circleMode.register(getMockModeConfig(circleMode.mode));
			expect(circleMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.state = "started";
			}).toThrowError();
		});

		it("stopping before not registering throws error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.stop();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.start();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.start();
			}).toThrowError();
		});

		it("registering multiple times throws an error", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.register(getMockModeConfig(circleMode.mode));
				circleMode.register(getMockModeConfig(circleMode.mode));
			}).toThrowError();
		});

		it("can start correctly", () => {
			const circleMode = new TerraDrawCircleMode();

			circleMode.register(getMockModeConfig(circleMode.mode));
			circleMode.start();

			expect(circleMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const circleMode = new TerraDrawCircleMode();

			circleMode.register(getMockModeConfig(circleMode.mode));
			circleMode.start();
			circleMode.stop();

			expect(circleMode.state).toBe("stopped");
		});
	});

	describe("onClick", () => {
		let circleMode: TerraDrawCircleMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			circleMode = new TerraDrawCircleMode();
			store = new GeoJSONStore();
			onChange = jest.fn();
		});

		it("throws an error if not registered", () => {
			expect(() => {
				circleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});
			}).toThrowError();
		});

		describe("registered", () => {
			beforeEach(() => {
				const mockConfig = getMockModeConfig(circleMode.mode);

				store = mockConfig.store;
				onChange = mockConfig.onChange;
				onFinish = mockConfig.onFinish;

				circleMode.register(mockConfig);
				circleMode.start();
			});

			it("adds a circle to store if registered", () => {
				circleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onChange).toBeCalledTimes(1);
				expect(onChange).toBeCalledWith([expect.any(String)], "create");
			});

			it("finishes drawing circle on second click", () => {
				circleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				circleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(1);

				expect(onChange).toBeCalledTimes(2);
				expect(onChange).toBeCalledWith([expect.any(String)], "create");

				expect(onFinish).toBeCalledTimes(1);
			});
		});
	});

	describe("onKeyUp", () => {
		let circleMode: TerraDrawCircleMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;

		beforeEach(() => {
			circleMode = new TerraDrawCircleMode();

			const mockConfig = getMockModeConfig(circleMode.mode);
			store = new GeoJSONStore();
			store = mockConfig.store;
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;

			circleMode.register(mockConfig);
			circleMode.start();
		});

		it("finishes drawing circle on finish key press", () => {
			circleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();
			expect(features.length).toBe(1);

			circleMode.onKeyUp({
				key: "Enter",
				heldKeys: [],
				preventDefault: jest.fn(),
			});

			features = store.copyAll();
			expect(features.length).toBe(1);

			expect(onChange).toBeCalledTimes(1);
			expect(onChange).toBeCalledWith([expect.any(String)], "create");
			expect(onFinish).toBeCalledTimes(1);
		});
	});

	describe("onMouseMove", () => {
		let circleMode: TerraDrawCircleMode;
		let store: GeoJSONStore;
		let onChange: jest.Mock;

		beforeEach(() => {
			circleMode = new TerraDrawCircleMode();

			const mockConfig = getMockModeConfig(circleMode.mode);

			store = mockConfig.store;
			onChange = mockConfig.onChange;

			circleMode.register(mockConfig);
			circleMode.start();
		});

		it("updates the circle size", () => {
			circleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(1);
			expect(onChange).toHaveBeenNthCalledWith(
				1,
				[expect.any(String)],
				"create",
			);

			const feature = store.copyAll()[0];

			circleMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 1,
				containerY: 1,
				button: "left",
				heldKeys: [],
			});
			expect(onChange).toBeCalledTimes(2);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"update",
			);

			const updatedFeature = store.copyAll()[0];

			expect(feature.id).toBe(updatedFeature.id);
			expect(feature.geometry.coordinates).not.toStrictEqual(
				updatedFeature.geometry.coordinates,
			);
		});
	});

	describe("cleanUp", () => {
		let circleMode: TerraDrawCircleMode;
		let onChange: jest.Mock;

		beforeEach(() => {
			circleMode = new TerraDrawCircleMode();

			const mockConfig = getMockModeConfig(circleMode.mode);

			onChange = mockConfig.onChange;

			circleMode.register(mockConfig);
			circleMode.start();
		});

		it("does not delete if no circle has been created", () => {
			circleMode.cleanUp();
			expect(onChange).toBeCalledTimes(0);
		});

		it("does delete if a circle has been created", () => {
			circleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			circleMode.cleanUp();

			expect(onChange).toBeCalledTimes(2);
			expect(onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String)],
				"delete",
			);
		});
	});

	describe("onKeyUp", () => {
		let store: GeoJSONStore;
		let circleMode: TerraDrawCircleMode;

		beforeEach(() => {
			jest.resetAllMocks();
			circleMode = new TerraDrawCircleMode();

			const mockConfig = getMockModeConfig(circleMode.mode);
			store = mockConfig.store;
			circleMode.register(mockConfig);
			circleMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no circle is present", () => {
				circleMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});
			});

			it("deletes the circle when currently editing", () => {
				circleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				circleMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});

				features = store.copyAll();
				expect(features.length).toBe(0);
			});

			it("does not delete the circle when currently editing if keyEvents is null", () => {
				jest.resetAllMocks();
				circleMode = new TerraDrawCircleMode({ keyEvents: null });

				const mockConfig = getMockModeConfig(circleMode.mode);
				store = mockConfig.store;
				circleMode.register(mockConfig);
				circleMode.start();

				circleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(1);

				circleMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});

				features = store.copyAll();
				expect(features.length).toBe(1);
			});
		});
	});

	describe("onDrag", () => {
		it("does nothing", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.onDrag();
			}).not.toThrowError();
		});
	});

	describe("onDragStart", () => {
		it("does nothing", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.onDragStart();
			}).not.toThrowError();
		});
	});

	describe("onDragEnd", () => {
		it("does nothing", () => {
			const circleMode = new TerraDrawCircleMode();

			expect(() => {
				circleMode.onDragEnd();
			}).not.toThrowError();
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});

			expect(
				circleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "circle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});

		it("returns the correct styles for polygon", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: {
					fillColor: () => "#ffffff",
					outlineColor: () => "#ffffff",
					outlineWidth: () => 2,
					fillOpacity: () => 0.5,
				},
			});

			expect(
				circleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "circle" },
				}),
			).toMatchObject({
				polygonFillColor: "#ffffff",
				polygonOutlineColor: "#ffffff",
				polygonOutlineWidth: 2,
				polygonFillOpacity: 0.5,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid circle feature", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			circleMode.register(getMockModeConfig("circle"));

			expect(
				circleMode.validateFeature({
					id: "29da86c2-92e2-4095-a1b3-22103535ebfa",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [[]],
					},
					properties: {
						mode: "circle",
						createdAt: 1685568434891,
						updatedAt: 1685568435434,
					},
				}),
			).toBe(false);
		});

		it("returns true for valid circle feature", () => {
			const circleMode = new TerraDrawCircleMode({
				styles: {
					fillColor: "#ffffff",
					outlineColor: "#ffffff",
					outlineWidth: 2,
					fillOpacity: 0.5,
				},
			});
			circleMode.register(getMockModeConfig("circle"));

			expect(
				circleMode.validateFeature({
					id: "29da86c2-92e2-4095-a1b3-22103535ebfa",
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-0.494384766, 52.581606375],
								[-0.506010566, 52.581258762],
								[-0.517523856, 52.580219286],
								[-0.528813228, 52.578498007],
								[-0.539769474, 52.576111581],
								[-0.550286655, 52.573083097],
								[-0.560263136, 52.56944185],
								[-0.56960258, 52.565223055],
								[-0.578214884, 52.560467503],
								[-0.586017056, 52.555221157],
								[-0.592934012, 52.54953471],
								[-0.598899299, 52.543463084],
								[-0.603855731, 52.537064901],
								[-0.607755924, 52.530401907],
								[-0.610562743, 52.523538376],
								[-0.612249642, 52.516540485],
								[-0.612800901, 52.509475676],
								[-0.612211758, 52.502412002],
								[-0.61048843, 52.495417474],
								[-0.607648039, 52.488559404],
								[-0.60371842, 52.481903758],
								[-0.598737838, 52.47551453],
								[-0.592754606, 52.469453122],
								[-0.5858266, 52.46377776],
								[-0.578020696, 52.458542943],
								[-0.569412123, 52.453798919],
								[-0.56008373, 52.44959121],
								[-0.550125193, 52.44596018],
								[-0.539632162, 52.44294065],
								[-0.528705342, 52.440561574],
								[-0.517449543, 52.438845755],
								[-0.505972682, 52.437809642],
								[-0.494384766, 52.437463165],
								[-0.48279685, 52.437809642],
								[-0.471319989, 52.438845755],
								[-0.46006419, 52.440561574],
								[-0.44913737, 52.44294065],
								[-0.438644339, 52.44596018],
								[-0.428685802, 52.44959121],
								[-0.419357409, 52.453798919],
								[-0.410748836, 52.458542943],
								[-0.402942932, 52.46377776],
								[-0.396014926, 52.469453122],
								[-0.390031694, 52.47551453],
								[-0.385051112, 52.481903758],
								[-0.381121493, 52.488559404],
								[-0.378281102, 52.495417474],
								[-0.376557774, 52.502412002],
								[-0.375968631, 52.509475676],
								[-0.37651989, 52.516540485],
								[-0.378206789, 52.523538376],
								[-0.381013608, 52.530401907],
								[-0.384913801, 52.537064901],
								[-0.389870233, 52.543463084],
								[-0.39583552, 52.54953471],
								[-0.402752476, 52.555221157],
								[-0.410554648, 52.560467503],
								[-0.419166952, 52.565223055],
								[-0.428506396, 52.56944185],
								[-0.438482877, 52.573083097],
								[-0.449000058, 52.576111581],
								[-0.459956304, 52.578498007],
								[-0.471245676, 52.580219286],
								[-0.482758966, 52.581258762],
								[-0.494384766, 52.581606375],
							],
						],
					},
					properties: {
						mode: "circle",
						createdAt: 1685568434891,
						updatedAt: 1685568435434,
					},
				}),
			).toBe(true);
		});
	});
});
