import { Position } from "geojson";
import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { TerraDrawGreatCircleMode } from "./great-circle.mode";

describe("TerraDrawGreatCircleMode", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();
			expect(greatCircleMode.mode).toBe("greatcircle");
			expect(greatCircleMode.styles).toStrictEqual({});
		});

		it("constructs with options", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: { cancel: "Backspace", finish: "Enter" },
			});
			expect(greatCircleMode.styles).toStrictEqual({
				lineStringColor: "#ffffff",
			});
		});

		it("constructs with null key events", () => {
			new TerraDrawGreatCircleMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: null,
			});

			new TerraDrawGreatCircleMode({
				styles: { lineStringColor: "#ffffff" },
				keyEvents: { cancel: null, finish: null },
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();
			expect(greatCircleMode.state).toBe("unregistered");
			greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
			expect(greatCircleMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();

			expect(() => {
				greatCircleMode.state = "started";
			}).toThrowError();
		});

		it("stopping before not registering throws error", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();

			expect(() => {
				greatCircleMode.stop();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();

			expect(() => {
				greatCircleMode.start();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();

			expect(() => {
				greatCircleMode.start();
			}).toThrowError();
		});

		it("registering multiple times throws an error", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();

			expect(() => {
				greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
				greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
			}).toThrowError();
		});

		it("can start correctly", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();

			greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
			greatCircleMode.start();

			expect(greatCircleMode.state).toBe("started");
		});

		it("can stop correctly", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();

			greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
			greatCircleMode.start();
			greatCircleMode.stop();

			expect(greatCircleMode.state).toBe("stopped");
		});
	});

	describe("onMouseMove", () => {
		let greatCircleMode: TerraDrawGreatCircleMode;
		let onChange: jest.Mock;
		let store: GeoJSONStore;
		let project: jest.Mock;

		beforeEach(() => {
			greatCircleMode = new TerraDrawGreatCircleMode();
			const mockConfig = getMockModeConfig(greatCircleMode.mode);
			onChange = mockConfig.onChange;
			store = mockConfig.store;
			project = mockConfig.project;
			greatCircleMode.register(mockConfig);
			greatCircleMode.start();
		});

		it("does nothing if no click has been performed", () => {
			greatCircleMode.onMouseMove({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(0);
		});

		it("moves the ending point of great circle on move", () => {
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 50, y: 50 });
			project.mockReturnValueOnce({ x: 50, y: 50 });

			greatCircleMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();
			expect(features.length).toBe(2);

			greatCircleMode.onMouseMove({
				lng: 20,
				lat: 20,
				containerX: 100,
				containerY: 100,
				button: "left",
				heldKeys: [],
			});

			features = store.copyAll();
			expect(features.length).toBe(2);

			const before = JSON.stringify(features[0].geometry.coordinates);

			expect(features[0].geometry.coordinates.length).toBe(100);

			greatCircleMode.onMouseMove({
				lng: 50,
				lat: 50,
				containerX: 200,
				containerY: 200,
				button: "left",
				heldKeys: [],
			});

			features = store.copyAll();
			expect(features.length).toBe(2);

			const after = JSON.stringify(features[0].geometry.coordinates);

			expect(features[0].geometry.coordinates.length).toBe(100);

			expect(before).not.toBe(after);
		});
	});

	describe("onClick", () => {
		let greatCircleMode: TerraDrawGreatCircleMode;
		let onChange: jest.Mock;
		let store: GeoJSONStore;
		let project: jest.Mock;

		beforeEach(() => {
			greatCircleMode = new TerraDrawGreatCircleMode();
			const mockConfig = getMockModeConfig(greatCircleMode.mode);
			onChange = mockConfig.onChange;
			store = mockConfig.store;
			project = mockConfig.project;
			greatCircleMode.register(mockConfig);
			greatCircleMode.start();
		});

		it("creates two identical coordinates on click, and also creates the ending point", () => {
			greatCircleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(2);

			const features = store.copyAll();
			expect(features.length).toBe(2);

			expect(features[0].geometry.coordinates).toStrictEqual([
				[0, 0],
				[0, 0],
			]);

			expect(features[1].geometry.coordinates).toStrictEqual([0, 0]);
		});

		it("creates line on second click", () => {
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 0, y: 0 });
			project.mockReturnValueOnce({ x: 50, y: 50 });
			project.mockReturnValueOnce({ x: 50, y: 50 });

			greatCircleMode.onClick({
				lng: 1,
				lat: 1,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			let features = store.copyAll();
			expect(features.length).toBe(2);

			greatCircleMode.onMouseMove({
				lng: 20,
				lat: 20,
				containerX: 100,
				containerY: 100,
				button: "left",
				heldKeys: [],
			});

			features = store.copyAll();
			expect(features.length).toBe(2);

			expect(features[0].geometry.coordinates.length).toBe(100);

			greatCircleMode.onClick({
				lng: 20,
				lat: 20,
				containerX: 100,
				containerY: 100,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(5);
			features = store.copyAll();

			expect(features.length).toBe(1);
			expect(features[0].geometry.coordinates.length).toBe(100);
			features[0].geometry.coordinates.forEach((coordinate) => {
				expect(typeof (coordinate as Position)[0]).toBe("number");
				expect(typeof (coordinate as Position)[1]).toBe("number");
			});
		});
	});

	describe("onKeyUp", () => {
		let greatCircleMode: TerraDrawGreatCircleMode;
		let onChange: jest.Mock;
		let onFinish: jest.Mock;
		let store: GeoJSONStore;
		let project: jest.Mock;

		beforeEach(() => {
			greatCircleMode = new TerraDrawGreatCircleMode();
			const mockConfig = getMockModeConfig(greatCircleMode.mode);
			onChange = mockConfig.onChange;
			onFinish = mockConfig.onFinish;
			store = mockConfig.store;
			project = mockConfig.project;
			greatCircleMode.register(mockConfig);
			greatCircleMode.start();
		});

		describe("cancel", () => {
			it("does nothing when no line is present", () => {
				greatCircleMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});
				expect(onChange).toBeCalledTimes(0);
			});

			it("deletes the line when currently editing", () => {
				greatCircleMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(2);

				greatCircleMode.onKeyUp({
					key: "Escape",
					heldKeys: [],
					preventDefault: jest.fn(),
				});

				features = store.copyAll();
				expect(features.length).toBe(0);
			});
		});

		describe("finish", () => {
			it("does nothing if no drawing is happening", () => {
				greatCircleMode.onKeyUp({
					key: "Enter",
					heldKeys: [],
					preventDefault: jest.fn(),
				});

				expect(onChange).toBeCalledTimes(0);
			});

			it("finishes the great circle on finish key press", () => {
				project.mockReturnValueOnce({ x: 0, y: 0 });
				project.mockReturnValueOnce({ x: 0, y: 0 });
				project.mockReturnValueOnce({ x: 50, y: 50 });
				project.mockReturnValueOnce({ x: 50, y: 50 });

				greatCircleMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(2);

				greatCircleMode.onMouseMove({
					lng: 20,
					lat: 20,
					containerX: 100,
					containerY: 100,
					button: "left",
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(2);

				expect(features[0].geometry.coordinates.length).toBe(100);

				greatCircleMode.onKeyUp({
					key: "Enter",
					heldKeys: [],
					preventDefault: jest.fn(),
				});

				expect(onChange).toBeCalledTimes(5);
				features = store.copyAll();

				expect(features.length).toBe(1);
				expect(features[0].geometry.coordinates.length).toBe(100);
				features[0].geometry.coordinates.forEach((coordinate) => {
					expect(typeof (coordinate as Position)[0]).toBe("number");
					expect(typeof (coordinate as Position)[1]).toBe("number");
				});

				expect(onFinish).toBeCalledTimes(1);
			});

			it("does not finish great circle when finish is set to null", () => {
				greatCircleMode = new TerraDrawGreatCircleMode({ keyEvents: null });
				const mockConfig = getMockModeConfig(greatCircleMode.mode);
				onChange = mockConfig.onChange;
				store = mockConfig.store;
				project = mockConfig.project;
				greatCircleMode.register(mockConfig);
				greatCircleMode.start();

				project.mockReturnValueOnce({ x: 0, y: 0 });
				project.mockReturnValueOnce({ x: 0, y: 0 });
				project.mockReturnValueOnce({ x: 50, y: 50 });
				project.mockReturnValueOnce({ x: 50, y: 50 });

				greatCircleMode.onClick({
					lng: 1,
					lat: 1,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				let features = store.copyAll();
				expect(features.length).toBe(2);

				greatCircleMode.onMouseMove({
					lng: 20,
					lat: 20,
					containerX: 100,
					containerY: 100,
					button: "left",
					heldKeys: [],
				});

				features = store.copyAll();
				expect(features.length).toBe(2);

				expect(features[0].geometry.coordinates.length).toBe(100);

				greatCircleMode.onKeyUp({
					key: "Enter",
					heldKeys: [],
					preventDefault: jest.fn(),
				});

				expect(onChange).toBeCalledTimes(4);
			});
		});
	});

	describe("cleanUp", () => {
		let greatCircleMode: TerraDrawGreatCircleMode;
		let store: GeoJSONStore;

		beforeEach(() => {
			greatCircleMode = new TerraDrawGreatCircleMode();
			const mockConfig = getMockModeConfig(greatCircleMode.mode);
			store = mockConfig.store;
			greatCircleMode.register(mockConfig);
			greatCircleMode.start();
		});

		it("does not throw error if feature has not been created ", () => {
			expect(() => {
				greatCircleMode.cleanUp();
			}).not.toThrowError();
		});

		it("cleans up correctly if drawing has started", () => {
			greatCircleMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(store.copyAll().length).toBe(2);

			greatCircleMode.cleanUp();

			// Removes the LineString that was being created
			expect(store.copyAll().length).toBe(0);
		});
	});

	describe("styling", () => {
		it("gets", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();
			greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));
			expect(greatCircleMode.styles).toStrictEqual({});
		});

		it("set fails if non valid styling", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();
			greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));

			expect(() => {
				(greatCircleMode.styles as unknown) = "test";
			}).toThrowError();

			expect(greatCircleMode.styles).toStrictEqual({});
		});

		it("sets", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode();
			greatCircleMode.register(getMockModeConfig(greatCircleMode.mode));

			greatCircleMode.styles = {
				lineStringColor: "#ffffff",
			};

			expect(greatCircleMode.styles).toStrictEqual({
				lineStringColor: "#ffffff",
			});
		});
	});

	describe("styleFeature", () => {
		it("can default styles", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode({
				styles: {
					lineStringWidth: 2,
					lineStringColor: "#ffffff",
				},
			});

			expect(
				greatCircleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "greatcircle" },
				}),
			).toMatchObject({
				lineStringColor: "#3f97e0",
				lineStringWidth: 4,
			});
		});

		it("returns the correct styles for polygon", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode({
				styles: {
					lineStringWidth: 2,
					lineStringColor: "#ffffff",
				},
			});

			expect(
				greatCircleMode.styleFeature({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties: { mode: "greatcircle" },
				}),
			).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 2,
			});
		});

		it("returns the correct styles for polygon using function", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode({
				styles: {
					lineStringWidth: () => 2,
					lineStringColor: () => "#ffffff",
				},
			});

			expect(
				greatCircleMode.styleFeature({
					type: "Feature",
					geometry: { type: "LineString", coordinates: [] },
					properties: { mode: "greatcircle" },
				}),
			).toMatchObject({
				lineStringColor: "#ffffff",
				lineStringWidth: 2,
			});
		});

		it("returns the correct styles for point", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode({
				styles: {
					closingPointColor: "#1111111",
					closingPointWidth: 3,
					closingPointOutlineColor: "#333333",
					closingPointOutlineWidth: 2,
				},
			});

			expect(
				greatCircleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "greatcircle" },
				}),
			).toMatchObject({
				pointColor: "#1111111",
				pointOutlineColor: "#333333",
				pointOutlineWidth: 2,
				pointWidth: 3,
				zIndex: 0,
			});
		});

		it("returns the correct styles for point using function", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode({
				styles: {
					closingPointColor: () => "#1111111",
					closingPointWidth: () => 3,
					closingPointOutlineColor: () => "#333333",
					closingPointOutlineWidth: () => 2,
				},
			});

			expect(
				greatCircleMode.styleFeature({
					type: "Feature",
					geometry: { type: "Point", coordinates: [] },
					properties: { mode: "greatcircle" },
				}),
			).toMatchObject({
				pointColor: "#1111111",
				pointOutlineColor: "#333333",
				pointOutlineWidth: 2,
				pointWidth: 3,
				zIndex: 0,
			});
		});
	});

	describe("validateFeature", () => {
		it("returns false for invalid great circle feature", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode({
				styles: {
					lineStringColor: "#ffffff",
				},
			});
			greatCircleMode.register(getMockModeConfig("greatcircle"));

			expect(
				greatCircleMode.validateFeature({
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

		it("returns true for valid great circle feature", () => {
			const greatCircleMode = new TerraDrawGreatCircleMode({
				styles: {
					lineStringColor: "#ffffff",
				},
			});
			greatCircleMode.register(getMockModeConfig("greatcircle"));

			expect(
				greatCircleMode.validateFeature({
					id: "8375c1e1-79af-4870-8cbc-57bcf323f2e0",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[-2.559814453, 52.536273041],
							[-2.519973128, 52.545235198],
							[-2.480115543, 52.554183976],
							[-2.440241709, 52.563119364],
							[-2.400351638, 52.572041353],
							[-2.360445344, 52.580949932],
							[-2.32052284, 52.589845092],
							[-2.280584137, 52.598726824],
							[-2.240629248, 52.607595117],
							[-2.200658186, 52.616449962],
							[-2.160670965, 52.625291349],
							[-2.120667597, 52.634119268],
							[-2.080648094, 52.642933709],
							[-2.040612471, 52.651734663],
							[-2.000560739, 52.660522121],
							[-1.960492913, 52.669296071],
							[-1.920409005, 52.678056506],
							[-1.880309029, 52.686803414],
							[-1.840192997, 52.695536786],
							[-1.800060924, 52.704256613],
							[-1.759912823, 52.712962884],
							[-1.719748708, 52.721655591],
							[-1.679568591, 52.730334723],
							[-1.639372486, 52.739000271],
							[-1.599160408, 52.747652225],
							[-1.55893237, 52.756290575],
							[-1.518688386, 52.764915312],
							[-1.478428469, 52.773526426],
							[-1.438152634, 52.782123908],
							[-1.397860895, 52.790707748],
							[-1.357553265, 52.799277935],
							[-1.317229759, 52.807834462],
							[-1.276890391, 52.816377317],
							[-1.236535175, 52.824906492],
							[-1.196164125, 52.833421976],
							[-1.155777257, 52.841923761],
							[-1.115374584, 52.850411836],
							[-1.07495612, 52.858886192],
							[-1.034521881, 52.867346819],
							[-0.99407188, 52.875793709],
							[-0.953606134, 52.88422685],
							[-0.913124655, 52.892646235],
							[-0.87262746, 52.901051852],
							[-0.832114563, 52.909443694],
							[-0.791585978, 52.917821749],
							[-0.751041722, 52.926186009],
							[-0.710481808, 52.934536464],
							[-0.669906252, 52.942873104],
							[-0.62931507, 52.951195921],
							[-0.588708276, 52.959504904],
							[-0.548085885, 52.967800044],
							[-0.507447914, 52.976081332],
							[-0.466794377, 52.984348757],
							[-0.42612529, 52.992602312],
							[-0.385440668, 53.000841985],
							[-0.344740527, 53.009067768],
							[-0.304024883, 53.017279652],
							[-0.263293752, 53.025477626],
							[-0.222547148, 53.033661682],
							[-0.181785089, 53.041831809],
							[-0.141007589, 53.049988],
							[-0.100214666, 53.058130243],
							[-0.059406334, 53.06625853],
							[-0.01858261, 53.074372851],
							[0.022256489, 53.082473198],
							[0.063110948, 53.09055956],
							[0.103980751, 53.098631928],
							[0.14486588, 53.106690293],
							[0.18576632, 53.114734645],
							[0.226682054, 53.122764976],
							[0.267613066, 53.130781276],
							[0.308559339, 53.138783535],
							[0.349520856, 53.146771744],
							[0.390497601, 53.154745894],
							[0.431489557, 53.162705976],
							[0.472496707, 53.17065198],
							[0.513519033, 53.178583897],
							[0.554556521, 53.186501717],
							[0.595609151, 53.194405432],
							[0.636676907, 53.202295033],
							[0.677759773, 53.210170509],
							[0.718857729, 53.218031852],
							[0.759970761, 53.225879052],
							[0.801098849, 53.233712101],
							[0.842241978, 53.241530988],
							[0.883400128, 53.249335706],
							[0.924573283, 53.257126244],
							[0.965761426, 53.264902593],
							[1.006964537, 53.272664745],
							[1.048182601, 53.28041269],
							[1.089415598, 53.288146419],
							[1.130663512, 53.295865922],
							[1.171926324, 53.303571191],
							[1.213204016, 53.311262217],
							[1.25449657, 53.31893899],
							[1.295803969, 53.326601501],
							[1.337126194, 53.334249741],
							[1.378463226, 53.341883702],
							[1.419815048, 53.349503373],
							[1.461181641, 53.357108746],
						],
					},
					properties: {
						mode: "greatcircle",
						createdAt: 1685654356961,
						updatedAt: 1685654358553,
					},
				}),
			).toBe(true);
		});
	});
});
