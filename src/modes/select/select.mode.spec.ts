import { Position } from "geojson";
import { GeoJSONStore } from "../../store/store";
import { getMockModeConfig } from "../../test/mock-config";
import { mockProject } from "../../test/mock-project";
import { TerraDrawSelectMode } from "./select.mode";

describe("TerraDrawSelectMode", () => {
	let selectMode: TerraDrawSelectMode;
	let store: GeoJSONStore;
	let onChange: jest.Mock;
	let setCursor: jest.Mock;
	let project: jest.Mock;
	let unproject: jest.Mock;
	let onSelect: jest.Mock;
	let onDeselect: jest.Mock;
	let onFinish: jest.Mock;

	const setSelectMode = (
		options?: ConstructorParameters<typeof TerraDrawSelectMode>[0],
	) => {
		selectMode = new TerraDrawSelectMode(options);
		const mockConfig = getMockModeConfig(selectMode.mode);
		onChange = mockConfig.onChange;
		project = mockConfig.project;
		unproject = mockConfig.unproject;
		onSelect = mockConfig.onSelect;
		onDeselect = mockConfig.onDeselect;
		setCursor = mockConfig.setCursor;
		onFinish = mockConfig.onFinish;
		store = mockConfig.store;
		selectMode.register(mockConfig);

		return mockConfig;
	};

	const addPolygonToStore = (coords: Position[]) => {
		store.create([
			{
				geometry: {
					type: "Polygon",
					coordinates: [coords],
				},
				properties: {
					mode: "polygon",
				},
			},
		]);
	};

	const addLineStringToStore = (coords: Position[]) => {
		return store.create([
			{
				geometry: {
					type: "LineString",
					coordinates: coords,
				},
				properties: {
					mode: "linestring",
				},
			},
		])[0];
	};

	const addPointToStore = (coords: Position) => {
		store.create([
			{
				geometry: {
					type: "Point",
					coordinates: coords,
				},
				properties: {
					mode: "point",
				},
			},
		]);
	};

	beforeEach(() => {
		setSelectMode({
			flags: {
				polygon: {
					feature: {},
				},
				linestring: {
					feature: {},
				},
				point: {
					feature: {},
				},
			},
		});
	});

	const mockMouseEventBoundingBox = (
		bbox: [
			[number, number],
			[number, number],
			[number, number],
			[number, number],
		] = [
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 0],
		],
	) => {
		unproject
			.mockReturnValueOnce({ lng: bbox[0][0], lat: bbox[0][1] })
			.mockReturnValueOnce({ lng: bbox[1][0], lat: bbox[1][1] })
			.mockReturnValueOnce({ lng: bbox[2][0], lat: bbox[2][1] })
			.mockReturnValueOnce({ lng: bbox[3][0], lat: bbox[3][1] })
			.mockReturnValueOnce({ lng: bbox[0][0], lat: bbox[0][1] });
	};

	describe("constructor", () => {
		it("constructs", () => {
			const selectMode = new TerraDrawSelectMode();
			expect(selectMode.mode).toBe("select");
		});

		it("constructs with options", () => {
			new TerraDrawSelectMode({
				pointerDistance: 40,
				keyEvents: {
					deselect: "Backspace",
					delete: "d",
					rotate: ["r"],
					scale: ["s"],
				},
			});
		});

		it("constructs with null keyEvents", () => {
			new TerraDrawSelectMode({
				pointerDistance: 40,
				keyEvents: null,
			});

			new TerraDrawSelectMode({
				pointerDistance: 40,
				keyEvents: {
					deselect: null,
					delete: null,
					rotate: null,
					scale: null,
				},
			});
		});
	});

	describe("lifecycle", () => {
		it("registers correctly", () => {
			const selectMode = new TerraDrawSelectMode();
			expect(selectMode.state).toBe("unregistered");
			selectMode.register(getMockModeConfig(selectMode.mode));
			expect(selectMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.state = "started";
			}).toThrowError();
		});

		it("stopping before not registering throws error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.stop();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.start();
			}).toThrowError();
		});

		it("starting before not registering throws error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.start();
			}).toThrowError();
		});

		it("registering multiple times throws an error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.register(getMockModeConfig(selectMode.mode));
				selectMode.register(getMockModeConfig(selectMode.mode));
			}).toThrowError();
		});

		it("can start correctly", () => {
			const selectMode = new TerraDrawSelectMode();

			selectMode.register(getMockModeConfig(selectMode.mode));
			selectMode.start();

			expect(selectMode.state).toBe("selecting");
		});

		it("can stop correctly", () => {
			const selectMode = new TerraDrawSelectMode();

			selectMode.register(getMockModeConfig(selectMode.mode));
			selectMode.start();
			selectMode.stop();

			expect(selectMode.state).toBe("stopped");
		});
	});

	describe("onClick", () => {
		describe("left click", () => {
			it("does not select if no features", () => {
				mockMouseEventBoundingBox();

				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onChange).not.toBeCalled();
				expect(onDeselect).not.toBeCalled();
				expect(onSelect).not.toBeCalled();
			});

			describe("point", () => {
				it("does select if feature is clicked", () => {
					addPointToStore([0, 0]);
					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					project.mockReturnValueOnce({
						x: 0,
						y: 0,
					});

					selectMode.onClick({
						lng: 0,
						lat: 0,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
				});

				it("does not select if feature is not clicked", () => {
					addPointToStore([0, 0]);
					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					project.mockReturnValueOnce({
						x: 0,
						y: 0,
					});

					selectMode.onClick({
						lng: 50,
						lat: 100,
						containerX: 100,
						containerY: 100,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(0);
				});

				it("does not select if selectable flag is false", () => {
					setSelectMode({ flags: { point: {} } });

					addPointToStore([0, 0]);
					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					project.mockReturnValueOnce({
						x: 0,
						y: 0,
					});

					selectMode.onClick({
						lng: 0,
						lat: 0,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(0);
				});

				it("deselects selected when click is not on same or different feature", () => {
					addPointToStore([0, 0]);

					mockMouseEventBoundingBox();

					project
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						});

					selectMode.onClick({
						lng: 0,
						lat: 0,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);

					mockMouseEventBoundingBox();

					selectMode.onClick({
						lng: 50,
						lat: 50,
						containerX: 50,
						containerY: 50,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onDeselect).toBeCalledTimes(1);
				});
			});

			describe("linestring", () => {
				it("does select if feature is clicked", () => {
					addLineStringToStore([
						[0, 0],
						[1, 1],
					]);

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					project
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						});

					selectMode.onClick({
						lng: 0,
						lat: 0,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
				});

				it("does not select if feature is not clicked", () => {
					addLineStringToStore([
						[0, 0],
						[1, 1],
					]);

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					project
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						});

					selectMode.onClick({
						lng: 50,
						lat: 100,
						containerX: 100,
						containerY: 100,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(0);
				});
			});

			describe("polygon", () => {
				it("does select if feature is clicked", () => {
					// Square Polygon
					addPolygonToStore([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					]);

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					selectMode.onClick({
						lng: 0.5,
						lat: 0.5,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
				});

				it("does deselect if feature is clicked then map area is clicked and allowManualDeselection is true", () => {
					setSelectMode({
						allowManualDeselection: true,
						flags: {
							polygon: { feature: {} },
						},
					});

					// Square Polygon
					addPolygonToStore([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					]);

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					selectMode.onClick({
						lng: 0.5,
						lat: 0.5,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);

					expect(onDeselect).toBeCalledTimes(0);

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					selectMode.onClick({
						lng: 50.0,
						lat: 59.0,
						containerX: 100,
						containerY: 100,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onDeselect).toBeCalledTimes(1);
				});

				it("does not deselect if feature is clicked then map area is clicked but allowManualDeselection is false", () => {
					setSelectMode({
						allowManualDeselection: false,
						flags: {
							polygon: { feature: {} },
						},
					});

					// Square Polygon
					addPolygonToStore([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					]);

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					selectMode.onClick({
						lng: 0.5,
						lat: 0.5,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);

					expect(onDeselect).toBeCalledTimes(0);

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					selectMode.onClick({
						lng: 50.0,
						lat: 59.0,
						containerX: 100,
						containerY: 100,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onDeselect).toBeCalledTimes(0);
				});

				it("does not select if feature is not clicked", () => {
					// Square Polygon
					addPolygonToStore([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					]);

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					selectMode.onClick({
						lng: 2,
						lat: 2,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(0);
				});

				it("creates selection points when feature selection flag enabled", () => {
					setSelectMode({
						flags: {
							polygon: {
								feature: {
									coordinates: {
										draggable: false,
									},
								},
							},
						},
					});

					addPolygonToStore([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					]);

					expect(onChange).toHaveBeenNthCalledWith(
						1,
						[expect.any(String)],
						"create",
					);

					// Store the ids of the created feature
					const idOne = onChange.mock.calls[0][0] as string[];

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					// Select polygon
					selectMode.onClick({
						lng: 0.5,
						lat: 0.5,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

					// Polygon selected set to true
					expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update");

					// Create selection points
					expect(onChange).toHaveBeenNthCalledWith(
						3,
						[
							expect.any(String),
							expect.any(String),
							expect.any(String),
							expect.any(String),
							// We only create 4, not one for the closing coord
							// as it is identical to to the first
						],
						"create",
					);
				});

				it("creates midpoints when flag enabled", () => {
					setSelectMode({
						flags: {
							polygon: {
								feature: {
									draggable: false,
									coordinates: { draggable: false, midpoints: true },
								},
							},
						},
					});

					project.mockImplementation((lng: number, lat: number) => ({
						x: lng * 100,
						y: lat * 100,
					}));

					unproject.mockImplementation((x: number, y: number) => ({
						lng: x / 100,
						lat: y / 100,
					}));

					addPolygonToStore([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					]);

					expect(onChange).toHaveBeenNthCalledWith(
						1,
						[expect.any(String)],
						"create",
					);

					// Store the ids of the created feature
					const idOne = onChange.mock.calls[0][0] as string[];

					mockMouseEventBoundingBox([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
					]);

					// Select polygon
					selectMode.onClick({
						lng: 0.5,
						lat: 0.5,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

					// Polygon selected set to true
					expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update");

					// Create selection points
					expect(onChange).toHaveBeenNthCalledWith(
						3,
						[
							expect.any(String),
							expect.any(String),
							expect.any(String),
							expect.any(String),
							// We only create 4, not one for the closing coord
							// as it is identical to to the first
						],
						"create",
					);

					// Create mid points
					expect(onChange).toHaveBeenNthCalledWith(
						4,
						[
							expect.any(String),
							expect.any(String),
							expect.any(String),
							expect.any(String),
						],
						"create",
					);
				});

				describe("switch selected", () => {
					it("without selection points flag", () => {
						setSelectMode({
							flags: {
								polygon: { feature: { draggable: false } },
							},
						});

						addPolygonToStore([
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						]);

						expect(onChange).toHaveBeenNthCalledWith(
							1,
							[expect.any(String)],
							"create",
						);

						addPolygonToStore([
							[2, 2],
							[2, 3],
							[3, 3],
							[3, 2],
							[2, 2],
						]);

						expect(onChange).toHaveBeenNthCalledWith(
							2,
							[expect.any(String)],
							"create",
						);

						// Store the ids of the created features
						const idOne = onChange.mock.calls[0][0] as string[];
						const idTwo = onChange.mock.calls[1][0] as string[];

						mockMouseEventBoundingBox([
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
						]);

						// Select polygon
						selectMode.onClick({
							lng: 0.5,
							lat: 0.5,
							containerX: 0,
							containerY: 0,
							button: "left",
							heldKeys: [],
						});

						expect(onSelect).toBeCalledTimes(1);
						expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

						// First polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update");

						mockMouseEventBoundingBox([
							[2, 2],
							[2, 3],
							[3, 3],
							[3, 2],
						]);

						// Deselect first polygon, select second
						selectMode.onClick({
							lng: 2.5,
							lat: 2.5,
							containerX: 0,
							containerY: 0,
							button: "left",
							heldKeys: [],
						});

						// Second polygon selected
						expect(onSelect).toBeCalledTimes(2);
						expect(onSelect).toHaveBeenNthCalledWith(2, idTwo[0]);

						// Deselect first polygon
						expect(onDeselect).toBeCalledTimes(1);
						expect(onDeselect).toHaveBeenNthCalledWith(1, idOne[0]);

						// First polygon selected set to false
						expect(onChange).toHaveBeenNthCalledWith(4, idOne, "update");

						// Second polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(5, idTwo, "update");
					});

					it("with selection points flag", () => {
						setSelectMode({
							flags: {
								polygon: {
									feature: {
										draggable: false,
										coordinates: { draggable: false },
									},
								},
							},
						});

						addPolygonToStore([
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						]);

						expect(onChange).toHaveBeenNthCalledWith(
							1,
							[expect.any(String)],
							"create",
						);

						addPolygonToStore([
							[2, 2],
							[2, 3],
							[3, 3],
							[3, 2],
							[2, 2],
						]);

						expect(onChange).toHaveBeenNthCalledWith(
							2,
							[expect.any(String)],
							"create",
						);

						// Store the ids of the created features
						const idOne = onChange.mock.calls[0][0] as string[];
						const idTwo = onChange.mock.calls[1][0] as string[];

						mockMouseEventBoundingBox([
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
						]);

						// Select polygon
						selectMode.onClick({
							lng: 0.5,
							lat: 0.5,
							containerX: 0,
							containerY: 0,
							button: "left",
							heldKeys: [],
						});

						expect(onSelect).toBeCalledTimes(1);
						expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

						// First polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update");

						// Create selection points
						expect(onChange).toHaveBeenNthCalledWith(
							4,
							[
								expect.any(String),
								expect.any(String),
								expect.any(String),
								expect.any(String),
								// We only create 4, not one for the closing coord
								// as it is identical to to the first
							],
							"create",
						);

						mockMouseEventBoundingBox([
							[2, 2],
							[2, 3],
							[3, 3],
							[3, 2],
						]);

						// Deselect first polygon, select second
						selectMode.onClick({
							lng: 2.5,
							lat: 2.5,
							containerX: 0,
							containerY: 0,
							button: "left",
							heldKeys: [],
						});

						// Second polygon selected
						expect(onSelect).toBeCalledTimes(2);
						expect(onSelect).toHaveBeenNthCalledWith(2, idTwo[0]);

						// Deselect first polygon selected set to false
						expect(onDeselect).toBeCalledTimes(1);
						expect(onDeselect).toHaveBeenNthCalledWith(1, idOne[0]);

						expect(onChange).toHaveBeenNthCalledWith(5, idOne, "update");

						// Delete first polygon selection points
						expect(onChange).toHaveBeenNthCalledWith(
							6,
							[
								expect.any(String),
								expect.any(String),
								expect.any(String),
								expect.any(String),
								// Again only 4 points as we skip closing coord
							],
							"delete",
						);

						// Second polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(7, idTwo, "update");
					});

					it("with mid points flag", () => {
						setSelectMode({
							flags: {
								polygon: {
									feature: {
										draggable: false,
										coordinates: { draggable: false, midpoints: true },
									},
								},
							},
						});

						project.mockImplementation((lng: number, lat: number) => ({
							x: lng * 100,
							y: lat * 100,
						}));

						unproject.mockImplementation((x: number, y: number) => ({
							lng: x / 100,
							lat: y / 100,
						}));

						addPolygonToStore([
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
							[0, 0],
						]);

						expect(onChange).toHaveBeenNthCalledWith(
							1,
							[expect.any(String)],
							"create",
						);

						addPolygonToStore([
							[2, 2],
							[2, 3],
							[3, 3],
							[3, 2],
							[2, 2],
						]);

						expect(onChange).toHaveBeenNthCalledWith(
							2,
							[expect.any(String)],
							"create",
						);

						// Store the ids of the created features
						const idOne = onChange.mock.calls[0][0] as string[];
						const idTwo = onChange.mock.calls[1][0] as string[];

						mockMouseEventBoundingBox([
							[0, 0],
							[0, 1],
							[1, 1],
							[1, 0],
						]);

						// Select polygon
						selectMode.onClick({
							lng: 0.5,
							lat: 0.5,
							containerX: 0,
							containerY: 0,
							button: "left",
							heldKeys: [],
						});

						expect(onSelect).toBeCalledTimes(1);
						expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

						// First polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update");

						// Create selection points
						expect(onChange).toHaveBeenNthCalledWith(
							4,
							[
								expect.any(String),
								expect.any(String),
								expect.any(String),
								expect.any(String),
								// We only create 4, not one for the closing coord
								// as it is identical to to the first
							],
							"create",
						);

						// Create mid points
						expect(onChange).toHaveBeenNthCalledWith(
							5,
							[
								expect.any(String),
								expect.any(String),
								expect.any(String),
								expect.any(String),
							],
							"create",
						);

						mockMouseEventBoundingBox([
							[2, 2],
							[2, 3],
							[3, 3],
							[3, 2],
						]);

						// Mock midpoint distance check
						project
							.mockReturnValueOnce({
								x: 0,
								y: 0,
							})
							.mockReturnValueOnce({
								x: 0,
								y: 0,
							})
							.mockReturnValueOnce({
								x: 0,
								y: 0,
							})
							.mockReturnValueOnce({
								x: 0,
								y: 0,
							});

						// Deselect first polygon, select second
						selectMode.onClick({
							lng: 2.5,
							lat: 2.5,
							containerX: 0,
							containerY: 0,
							button: "left",
							heldKeys: [],
						});

						// Second polygon selected
						expect(onSelect).toBeCalledTimes(2);
						expect(onSelect).toHaveBeenNthCalledWith(2, idTwo[0]);

						// Deselect first polygon selected set to false
						expect(onDeselect).toBeCalledTimes(1);
						expect(onDeselect).toHaveBeenNthCalledWith(1, idOne[0]);

						expect(onChange).toHaveBeenNthCalledWith(6, idOne, "update");

						// Delete first polygon selection points
						expect(onChange).toHaveBeenNthCalledWith(
							7,
							[
								expect.any(String),
								expect.any(String),
								expect.any(String),
								expect.any(String),
								// Again only 4 points as we skip closing coord
							],
							"delete",
						);

						// Delete first polygon mid points
						expect(onChange).toHaveBeenNthCalledWith(
							8,
							[
								expect.any(String),
								expect.any(String),
								expect.any(String),
								expect.any(String),
							],
							"delete",
						);

						// Second polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(9, idTwo, "update");
					});
				});
			});
		});

		describe("right click", () => {
			it("does not select if no features", () => {
				mockMouseEventBoundingBox();

				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "right",
					heldKeys: [],
				});

				expect(onChange).not.toBeCalled();
				expect(onDeselect).not.toBeCalled();
				expect(onSelect).not.toBeCalled();
			});

			it("returns if different feature than selected is clicked on", () => {
				const config = setSelectMode({
					flags: {
						polygon: { feature: { draggable: false, coordinates: {} } },
					},
				});

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String)],
					"create",
				);

				addPolygonToStore([
					[80, 80],
					[80, 81],
					[81, 81],
					[81, 80],
					[81, 81],
				]);

				expect(onChange).toHaveBeenNthCalledWith(
					2,
					[expect.any(String)],
					"create",
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				mockMouseEventBoundingBox([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				// Select polygon
				selectMode.onClick({
					lng: 0.5,
					lat: 0.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update");

				mockMouseEventBoundingBox([
					[80, 80],
					[80, 81],
					[81, 81],
					[81, 80],
				]);

				jest.spyOn(store, "getGeometryCopy");
				jest.spyOn(store, "getPropertiesCopy");

				// Mock selection point locations
				mockProject(config.project, [
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				selectMode.onClick({
					lng: 80.5,
					lat: 80.5,
					containerX: 80.5,
					containerY: 80.5,
					button: "right",
					heldKeys: [],
				});

				expect(store.getGeometryCopy).toBeCalledTimes(4);
				expect(onDeselect).toBeCalledTimes(0);
				expect(store.getPropertiesCopy).toBeCalledTimes(0);
			});

			it("returns if selected feature is clicked on but deleteable is false", () => {
				const config = setSelectMode({
					flags: {
						polygon: {
							feature: { draggable: false, coordinates: { deletable: false } },
						},
					},
				});

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String)],
					"create",
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				mockMouseEventBoundingBox([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				// Select polygon
				selectMode.onClick({
					lng: 0.5,
					lat: 0.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update");

				mockMouseEventBoundingBox([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				jest.spyOn(store, "getGeometryCopy");

				mockProject(config.project);

				// Deselect first polygon, select second
				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "right",
					heldKeys: [],
				});

				// Only called for checking distance to selection points,
				// should hit early return otherwise
				expect(store.getGeometryCopy).toBeCalledTimes(4);
			});

			it("returns if selected feature is clicked on but deleteable is false", () => {
				const config = setSelectMode({
					flags: {
						polygon: {
							feature: { draggable: false, coordinates: { deletable: false } },
						},
					},
				});

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String)],
					"create",
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				mockMouseEventBoundingBox([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				// Select polygon
				selectMode.onClick({
					lng: 0.5,
					lat: 0.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update");

				mockMouseEventBoundingBox([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				jest.spyOn(store, "getGeometryCopy");

				mockProject(config.project);

				// Deselect first polygon, select second
				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "right",
					heldKeys: [],
				});

				// Only called for checking distance to selection points,
				// should hit early return otherwise
				expect(store.getGeometryCopy).toBeCalledTimes(4);
			});

			it("returns early if creates a invalid polygon by deleting coordinate", () => {
				const config = setSelectMode({
					flags: {
						polygon: {
							feature: { draggable: false, coordinates: { deletable: true } },
						},
					},
				});

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[0, 0],
				]);

				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String)],
					"create",
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				mockMouseEventBoundingBox([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				// Select polygon
				selectMode.onClick({
					lng: 0.322723,
					lat: 0.672897,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update");

				mockMouseEventBoundingBox([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				jest.spyOn(store, "delete");
				jest.spyOn(store, "updateGeometry");

				mockProject(config.project);

				// Deselect first polygon, select second
				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "right",
					heldKeys: [],
				});

				expect(store.delete).toBeCalledTimes(0);
				expect(store.updateGeometry).toBeCalledTimes(0);
			});

			it("deletes a coordinate in deleteable set to true and a coordinate is clicked on", () => {
				const config = setSelectMode({
					flags: {
						polygon: {
							feature: { draggable: false, coordinates: { deletable: true } },
						},
					},
				});

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(onChange).toHaveBeenNthCalledWith(
					1,
					[expect.any(String)],
					"create",
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				mockMouseEventBoundingBox([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				// Select polygon
				selectMode.onClick({
					lng: 0.5,
					lat: 0.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update");

				mockMouseEventBoundingBox([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				jest.spyOn(store, "delete");
				jest.spyOn(store, "updateGeometry");

				mockProject(config.project);

				// Deselect first polygon, select second
				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "right",
					heldKeys: [],
				});

				expect(store.delete).toBeCalledTimes(1);
				expect(store.updateGeometry).toBeCalledTimes(1);
			});
		});
	});

	describe("onKeyUp", () => {
		describe("Delete", () => {
			it("does nothing with no features selected", () => {
				selectMode.onKeyUp({
					key: "Delete",
					preventDefault: jest.fn(),
					heldKeys: ["Delete"],
				});

				expect(onChange).not.toBeCalled();
				expect(onDeselect).not.toBeCalled();
			});

			it("deletes when feature is selected", () => {
				addPointToStore([0, 0]);

				mockMouseEventBoundingBox();

				project.mockReturnValueOnce({
					x: 0,
					y: 0,
				});

				// Select created feature
				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onChange).toBeCalledTimes(2);
				expect(onChange).toHaveBeenNthCalledWith(
					2,
					[expect.any(String)],
					"update",
				);

				expect(onSelect).toBeCalledTimes(1);

				selectMode.onKeyUp({
					key: "Delete",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				expect(onDeselect).toBeCalledTimes(1);

				expect(onChange).toBeCalledTimes(3);
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"delete",
				);
			});
		});

		describe("Escape", () => {
			it("does nothing with no features selected", () => {
				selectMode.onKeyUp({
					key: "Escape",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				expect(onChange).not.toBeCalled();
				expect(onDeselect).not.toBeCalled();
			});

			it("does nothing with no features selected", () => {
				addPointToStore([0, 0]);

				mockMouseEventBoundingBox();

				project.mockReturnValueOnce({
					x: 0,
					y: 0,
				});

				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);

				selectMode.onKeyUp({
					key: "Escape",
					preventDefault: jest.fn(),
					heldKeys: [],
				});

				expect(onChange).toBeCalledTimes(3);
				expect(onDeselect).toBeCalledTimes(1);
			});
		});
	});

	describe("onDragStart", () => {
		it("nothing selected, nothing changes", () => {
			selectMode.onDragStart(
				{
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				},
				jest.fn(),
			);

			expect(onChange).toBeCalledTimes(0);
			expect(onDeselect).toBeCalledTimes(0);
			expect(onSelect).toBeCalledTimes(0);
			expect(project).toBeCalledTimes(0);
		});

		it("does not trigger starting of drag events if mode not draggable", () => {
			addPointToStore([0, 0]);

			mockMouseEventBoundingBox();

			project.mockReturnValueOnce({
				x: 0,
				y: 0,
			});

			selectMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			// Pointer set to move when teh cursor is
			expect(setCursor).toHaveBeenCalledTimes(1);
			expect(setCursor).toBeCalledWith("move");

			expect(onSelect).toBeCalledTimes(1);

			const setMapDraggability = jest.fn();
			selectMode.onDragStart(
				{
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				},
				setMapDraggability,
			);

			expect(setMapDraggability).not.toBeCalled();
		});

		it("does trigger onDragStart events if mode is draggable", () => {
			selectMode = new TerraDrawSelectMode({
				flags: { point: { feature: { draggable: true } } },
			});

			const mockConfig = getMockModeConfig(selectMode.mode);
			onChange = mockConfig.onChange;
			project = mockConfig.project;
			unproject = mockConfig.unproject;
			onSelect = mockConfig.onSelect;
			onDeselect = mockConfig.onDeselect;
			setCursor = mockConfig.setCursor;
			store = mockConfig.store;
			selectMode.register(mockConfig);

			addPointToStore([0, 0]);

			// canDrag
			mockMouseEventBoundingBox();
			project.mockReturnValueOnce({
				x: 0,
				y: 0,
			});

			// drag
			mockMouseEventBoundingBox();
			project.mockReturnValueOnce({
				x: 0,
				y: 0,
			});

			selectMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onSelect).toBeCalledTimes(1);

			const setMapDraggability = jest.fn();
			selectMode.onDragStart(
				{
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				},
				setMapDraggability,
			);
			expect(setCursor).toBeCalled();
			expect(setMapDraggability).toBeCalled();
		});
	});

	describe("onDrag", () => {
		it("nothing selected, nothing changes", () => {
			const setMapDraggability = jest.fn();
			selectMode.onDrag(
				{
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				},
				setMapDraggability,
			);

			expect(onChange).toBeCalledTimes(0);
			expect(onDeselect).toBeCalledTimes(0);
			expect(onSelect).toBeCalledTimes(0);
			expect(project).toBeCalledTimes(0);
		});

		it("does not trigger drag events if mode not draggable", () => {
			addPointToStore([0, 0]);
			project.mockReturnValueOnce({
				x: 0,
				y: 0,
			});

			mockMouseEventBoundingBox();

			selectMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onSelect).toBeCalledTimes(1);
			expect(onChange).toBeCalledTimes(2);

			const setMapDraggability = jest.fn();
			selectMode.onDrag(
				{
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				},
				setMapDraggability,
			);

			expect(onChange).toBeCalledTimes(2);
		});

		describe("drag feature", () => {
			describe("point", () => {
				it("does not trigger dragging updates if dragging flags disabled", () => {
					addPointToStore([0, 0]);

					mockMouseEventBoundingBox();

					project.mockReturnValueOnce({
						x: 0,
						y: 0,
					});

					selectMode.onClick({
						lng: 0,
						lat: 0,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onChange).toBeCalledTimes(2);

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						{
							lng: 1,
							lat: 1,
							containerX: 1,
							containerY: 1,
							button: "left",
							heldKeys: [],
						},
						setMapDraggability,
					);

					expect(onChange).toBeCalledTimes(2);
				});

				it("coordinate draggable flag has no effect for points", () => {
					setSelectMode({
						flags: {
							point: { feature: { coordinates: { draggable: true } } },
						},
					});

					store.create([
						{
							geometry: { type: "Point", coordinates: [0, 0] },
							properties: { mode: "point" },
						},
					]);

					mockMouseEventBoundingBox();

					project.mockReturnValueOnce({
						x: 0,
						y: 0,
					});

					selectMode.onClick({
						lng: 0,
						lat: 0,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onChange).toBeCalledTimes(2);

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						{
							lng: 1,
							lat: 1,
							containerX: 1,
							containerY: 1,
							button: "left",
							heldKeys: [],
						},
						setMapDraggability,
					);

					expect(onChange).toBeCalledTimes(2);
				});

				it("does trigger drag events if mode is draggable for point", () => {
					setSelectMode({
						flags: {
							point: { feature: { draggable: true } },
						},
					});

					addPointToStore([0, 0]);

					project.mockReturnValueOnce({
						x: 0,
						y: 0,
					});
					mockMouseEventBoundingBox();

					selectMode.onClick({
						lng: 0,
						lat: 0,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onChange).toBeCalledTimes(2);

					project.mockReturnValueOnce({
						x: 0,
						y: 0,
					});
					mockMouseEventBoundingBox();

					selectMode.onDragStart(
						{
							lng: 0,
							lat: 0,
							containerX: 0,
							containerY: 0,
							button: "left",
							heldKeys: [],
						},
						jest.fn(),
					);

					project.mockReturnValueOnce({
						x: 0,
						y: 0,
					});
					mockMouseEventBoundingBox();

					project.mockReturnValueOnce({
						x: 0,
						y: 0,
					});
					mockMouseEventBoundingBox();

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						{
							lng: 1,
							lat: 1,
							containerX: 1,
							containerY: 1,
							button: "left",
							heldKeys: [],
						},
						setMapDraggability,
					);

					expect(onChange).toBeCalledTimes(3);
				});
			});

			describe("linestring", () => {
				it("does trigger drag events if feature draggable flag set", () => {
					setSelectMode({
						flags: { linestring: { feature: { draggable: true } } },
					});

					const id = addLineStringToStore([
						[0, 0],
						[1, 1],
					]);

					expect(onChange).toBeCalledTimes(1);
					const idOne = onChange.mock.calls[0][0] as string[];

					mockMouseEventBoundingBox();
					mockMouseEventBoundingBox();
					project
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						})
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						})
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						});

					selectMode.onClick({
						lng: 0,
						lat: 0,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onSelect).toHaveBeenNthCalledWith(1, id);
					expect(onChange).toBeCalledTimes(2);

					selectMode.onDragStart(
						{
							lng: 1,
							lat: 1,
							containerX: 1,
							containerY: 1,
							button: "left",
							heldKeys: [],
						},
						jest.fn(),
					);

					mockMouseEventBoundingBox();
					mockMouseEventBoundingBox();

					project
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						})
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						});

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						{
							lng: 1,
							lat: 1,
							containerX: 1,
							containerY: 1,
							button: "left",
							heldKeys: [],
						},
						setMapDraggability,
					);

					expect(onChange).toBeCalledTimes(3);
					expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update");
				});
			});

			describe("polygon", () => {
				it("does trigger drag events if mode is draggable for polygon", () => {
					setSelectMode({
						flags: { polygon: { feature: { draggable: true } } },
					});

					addPolygonToStore([
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0],
					]);

					expect(onChange).toBeCalledTimes(1);
					const idOne = onChange.mock.calls[0][0] as string[];

					// mock for both drag coordinate and drag feature
					mockMouseEventBoundingBox();
					mockMouseEventBoundingBox();
					project
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						})
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						})
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						});

					selectMode.onClick({
						lng: 0.5,
						lat: 0.5,
						containerX: 0,
						containerY: 0,
						button: "left",
						heldKeys: [],
					});

					expect(onSelect).toBeCalledTimes(1);
					expect(onChange).toBeCalledTimes(2);

					selectMode.onDragStart(
						{
							lng: 0.5,
							lat: 0.5,
							containerX: 1,
							containerY: 1,
							button: "left",
							heldKeys: [],
						},
						jest.fn(),
					);

					// mock for both drag coordinate and drag feature
					mockMouseEventBoundingBox();
					mockMouseEventBoundingBox();
					project
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						})
						.mockReturnValueOnce({
							x: 0,
							y: 0,
						})
						.mockReturnValueOnce({
							x: 1,
							y: 1,
						});

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						{
							lng: 0.5,
							lat: 0.5,
							containerX: 0,
							containerY: 0,
							button: "left",
							heldKeys: [],
						},
						setMapDraggability,
					);

					expect(onChange).toBeCalledTimes(3);
					expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update");
				});
			});
		});

		describe("drag coordinate", () => {
			it("does trigger drag events if mode is draggable for linestring", () => {
				setSelectMode({
					flags: {
						linestring: { feature: { coordinates: { draggable: true } } },
					},
				});

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);
				expect(onChange).toBeCalledTimes(1);

				addLineStringToStore([
					[0, 0],
					[1, 1],
				]);
				expect(onChange).toBeCalledTimes(2);

				mockMouseEventBoundingBox();
				project
					.mockReturnValueOnce({
						x: 100,
						y: 100,
					})
					.mockReturnValue({
						x: 0,
						y: 0,
					});

				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);
				expect(onChange).toBeCalledTimes(4);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String), expect.any(String)],
					"create",
				);

				mockMouseEventBoundingBox();
				project
					.mockReturnValueOnce({
						x: 100,
						y: 100,
					})
					.mockReturnValue({
						x: 0,
						y: 0,
					});

				selectMode.onDragStart(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					jest.fn(),
				);

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					setMapDraggability,
				);

				expect(onChange).toBeCalledTimes(5);

				// Update linestring position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[expect.any(String), expect.any(String)],
					"update",
				);
			});

			it("does trigger drag events if mode is draggable for polygon", () => {
				setSelectMode({
					flags: { polygon: { feature: { coordinates: { draggable: true } } } },
				});

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);

				expect(onChange).toBeCalledTimes(1);

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(onChange).toBeCalledTimes(2);

				mockMouseEventBoundingBox();

				project
					.mockReturnValueOnce({
						x: 100,
						y: 100,
					})
					.mockReturnValue({
						x: 0,
						y: 0,
					});

				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);
				expect(onChange).toBeCalledTimes(4);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"create",
				);

				mockMouseEventBoundingBox();
				project
					.mockReturnValueOnce({
						x: 100,
						y: 100,
					})
					.mockReturnValue({
						x: 0,
						y: 0,
					});

				selectMode.onDragStart(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					jest.fn(),
				);

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					setMapDraggability,
				);

				expect(onChange).toBeCalledTimes(5);

				// Update linestring position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[expect.any(String), expect.any(String)],
					"update",
				);
			});
		});

		describe("drag maintaining shape", () => {
			it("does trigger drag events if mode is draggable for linestring", () => {
				setSelectMode({
					flags: {
						linestring: {
							feature: {
								coordinates: { draggable: true, resizable: "center-fixed" },
							},
						},
					},
				});

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);
				expect(onChange).toBeCalledTimes(1);

				addLineStringToStore([
					[0, 0],
					[1, 1],
				]);
				expect(onChange).toBeCalledTimes(2);

				mockMouseEventBoundingBox();
				project
					.mockReturnValueOnce({
						x: 100,
						y: 100,
					})
					.mockReturnValue({
						x: 0,
						y: 0,
					});

				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);
				expect(onChange).toBeCalledTimes(4);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String), expect.any(String)],
					"create",
				);

				mockMouseEventBoundingBox();
				project
					.mockReturnValueOnce({
						x: 100,
						y: 100,
					})
					.mockReturnValue({
						x: 0,
						y: 0,
					});

				selectMode.onDragStart(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					jest.fn(),
				);

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					setMapDraggability,
				);

				selectMode.onDrag(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					setMapDraggability,
				);

				expect(onChange).toBeCalledTimes(5);

				// Update linestring position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[expect.any(String), expect.any(String), expect.any(String)],
					"update",
				);
			});

			it("does trigger drag events if mode is draggable for polygon", () => {
				setSelectMode({
					flags: {
						polygon: {
							feature: {
								coordinates: { draggable: true, resizable: "center-fixed" },
							},
						},
					},
				});

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);

				expect(onChange).toBeCalledTimes(1);

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(onChange).toBeCalledTimes(2);

				mockMouseEventBoundingBox();

				project
					.mockReturnValueOnce({
						x: 100,
						y: 100,
					})
					.mockReturnValue({
						x: 0,
						y: 0,
					});

				selectMode.onClick({
					lng: 0,
					lat: 0,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				});

				expect(onSelect).toBeCalledTimes(1);
				expect(onChange).toBeCalledTimes(4);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"create",
				);

				mockMouseEventBoundingBox();
				project
					.mockReturnValueOnce({
						x: 100,
						y: 100,
					})
					.mockReturnValue({
						x: 0,
						y: 0,
					});

				selectMode.onDragStart(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					jest.fn(),
				);

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					setMapDraggability,
				);

				selectMode.onDrag(
					{
						lng: 1,
						lat: 1,
						containerX: 1,
						containerY: 1,
						button: "left",
						heldKeys: [],
					},
					setMapDraggability,
				);

				expect(onChange).toBeCalledTimes(5);

				// Update polygon position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"update",
				);
			});
		});
	});

	describe("onDragEnd", () => {
		it("sets map draggability back to false, sets cursor to default", () => {
			setSelectMode();

			const setMapDraggability = jest.fn();
			selectMode.onDragEnd(
				{
					lng: 1,
					lat: 1,
					containerX: 1,
					containerY: 1,
					button: "left",
					heldKeys: [],
				},
				setMapDraggability,
			);

			expect(setMapDraggability).toBeCalledTimes(1);
			expect(setMapDraggability).toBeCalledWith(true);
			expect(setCursor).toBeCalledTimes(1);
			expect(setCursor).toBeCalledWith("move");
		});

		it("fires onFinish for dragged coordinate if it is currently being dragged", () => {
			setSelectMode({
				flags: { polygon: { feature: { coordinates: { draggable: true } } } },
			});

			// We want to account for ignoring points branch
			addPointToStore([100, 89]);

			expect(onChange).toBeCalledTimes(1);

			addPolygonToStore([
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
				[0, 0],
			]);

			expect(onChange).toBeCalledTimes(2);

			mockMouseEventBoundingBox();

			project
				.mockReturnValueOnce({
					x: 100,
					y: 100,
				})
				.mockReturnValue({
					x: 0,
					y: 0,
				});

			selectMode.onClick({
				lng: 0,
				lat: 0,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onSelect).toBeCalledTimes(1);
			expect(onChange).toBeCalledTimes(4);

			// Select feature
			expect(onChange).toHaveBeenNthCalledWith(
				3,
				[expect.any(String)],
				"update",
			);

			// Create selection points
			expect(onChange).toHaveBeenNthCalledWith(
				4,
				[
					expect.any(String),
					expect.any(String),
					expect.any(String),
					expect.any(String),
				],
				"create",
			);

			mockMouseEventBoundingBox();
			project
				.mockReturnValueOnce({
					x: 100,
					y: 100,
				})
				.mockReturnValue({
					x: 0,
					y: 0,
				});

			selectMode.onDragStart(
				{
					lng: 1,
					lat: 1,
					containerX: 1,
					containerY: 1,
					button: "left",
					heldKeys: [],
				},
				jest.fn(),
			);

			const setMapDraggability = jest.fn();
			selectMode.onDrag(
				{
					lng: 1,
					lat: 1,
					containerX: 1,
					containerY: 1,
					button: "left",
					heldKeys: [],
				},
				setMapDraggability,
			);

			selectMode.onDragEnd(
				{
					lng: 1,
					lat: 1,
					containerX: 1,
					containerY: 1,
					button: "left",
					heldKeys: [],
				},
				setMapDraggability,
			);

			expect(onFinish).toBeCalledTimes(1);
			expect(onFinish).toBeCalledWith(expect.any(String));
		});

		it("fires onFinish for dragged feature if it is currently being dragged", () => {
			setSelectMode({
				flags: { polygon: { feature: { draggable: true } } },
			});

			addPolygonToStore([
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
				[0, 0],
			]);

			expect(onChange).toBeCalledTimes(1);

			// mock for both drag coordinate and drag feature
			mockMouseEventBoundingBox();
			mockMouseEventBoundingBox();
			project
				.mockReturnValueOnce({
					x: 0,
					y: 0,
				})
				.mockReturnValueOnce({
					x: 1,
					y: 1,
				})
				.mockReturnValueOnce({
					x: 0,
					y: 0,
				})
				.mockReturnValueOnce({
					x: 1,
					y: 1,
				})
				.mockReturnValueOnce({
					x: 0,
					y: 0,
				})
				.mockReturnValueOnce({
					x: 1,
					y: 1,
				});

			selectMode.onClick({
				lng: 0.5,
				lat: 0.5,
				containerX: 0,
				containerY: 0,
				button: "left",
				heldKeys: [],
			});

			expect(onSelect).toBeCalledTimes(1);
			expect(onChange).toBeCalledTimes(2);

			selectMode.onDragStart(
				{
					lng: 0.5,
					lat: 0.5,
					containerX: 0.5,
					containerY: 0.5,
					button: "left",
					heldKeys: [],
				},
				jest.fn(),
			);

			// mock for both drag coordinate and drag feature
			mockMouseEventBoundingBox();
			mockMouseEventBoundingBox();
			project
				.mockReturnValueOnce({
					x: 0,
					y: 0,
				})
				.mockReturnValueOnce({
					x: 1,
					y: 1,
				})
				.mockReturnValueOnce({
					x: 0,
					y: 0,
				})
				.mockReturnValueOnce({
					x: 1,
					y: 1,
				});

			const setMapDraggability = jest.fn();
			selectMode.onDrag(
				{
					lng: 0.5,
					lat: 0.5,
					containerX: 0,
					containerY: 0,
					button: "left",
					heldKeys: [],
				},
				setMapDraggability,
			);

			expect(onChange).toBeCalledTimes(3);

			selectMode.onDragEnd(
				{
					lng: 1,
					lat: 1,
					containerX: 1,
					containerY: 1,
					button: "left",
					heldKeys: [],
				},
				setMapDraggability,
			);

			expect(onFinish).toBeCalledTimes(1);
			expect(onFinish).toBeCalledWith(expect.any(String));
		});
	});

	describe("onMouseMove", () => {
		let selectMode: TerraDrawSelectMode;
		let onChange: jest.Mock;
		let project: jest.Mock;
		let onSelect: jest.Mock;
		let onDeselect: jest.Mock;

		beforeEach(() => {
			selectMode = new TerraDrawSelectMode();

			const mockConfig = getMockModeConfig(selectMode.mode);
			onChange = mockConfig.onChange;
			project = mockConfig.project;
			onSelect = mockConfig.onSelect;
			onDeselect = mockConfig.onDeselect;

			selectMode.register(mockConfig);
		});

		it("does nothing", () => {
			selectMode.onMouseMove({
				lng: 1,
				lat: 1,
				containerX: 1,
				containerY: 1,
				button: "left",
				heldKeys: [],
			});

			expect(onChange).toBeCalledTimes(0);
			expect(onDeselect).toBeCalledTimes(0);
			expect(onSelect).toBeCalledTimes(0);
			expect(project).toBeCalledTimes(0);
		});
	});

	describe("onSelect", () => {
		let selectMode: TerraDrawSelectMode;

		beforeEach(() => {
			selectMode = new TerraDrawSelectMode();
		});
		it("no op for unregistered onSelect function", () => {
			selectMode.onSelect("test-id");
		});
	});

	describe("onDeselect", () => {
		let selectMode: TerraDrawSelectMode;

		beforeEach(() => {
			selectMode = new TerraDrawSelectMode();
		});
		it("no op for unregistered onSelect function", () => {
			selectMode.onDeselect("id");
		});
	});

	describe("styling", () => {
		it("gets", () => {
			const selectMode = new TerraDrawSelectMode();
			selectMode.register(getMockModeConfig(selectMode.mode));
			expect(selectMode.styles).toStrictEqual({});
		});

		it("set fails if non valid styling", () => {
			const selectMode = new TerraDrawSelectMode();
			selectMode.register(getMockModeConfig(selectMode.mode));

			expect(() => {
				(selectMode.styles as unknown) = "test";
			}).toThrowError();

			expect(selectMode.styles).toStrictEqual({});
		});

		it("sets", () => {
			const selectMode = new TerraDrawSelectMode();
			selectMode.register(getMockModeConfig(selectMode.mode));

			selectMode.styles = {
				selectedLineStringColor: "#ffffff",
			};

			expect(selectMode.styles).toStrictEqual({
				selectedLineStringColor: "#ffffff",
			});
		});
	});

	describe("styleFeature", () => {
		it("returns the correct styles for polygon from polygon mode", () => {
			const polygonMode = new TerraDrawSelectMode({
				styles: {
					selectedPolygonOutlineWidth: 4,
					selectedPolygonColor: "#222222",
					selectedPolygonOutlineColor: "#111111",
					selectedPolygonFillOpacity: 1,
				},
			});

			expect(
				polygonMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "polygon", selected: true },
				}),
			).toMatchObject({
				polygonFillColor: "#222222",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 4,
				polygonFillOpacity: 1,
			});

			expect(
				polygonMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "polygon" },
				}),
			).toMatchObject({
				polygonFillColor: "#3f97e0",
				polygonFillOpacity: 0.3,
				polygonOutlineColor: "#3f97e0",
			});
		});

		it("returns the correct styles for polygon from polygon mode when using a function", () => {
			const polygonMode = new TerraDrawSelectMode({
				styles: {
					selectedPolygonOutlineWidth: () => 4,
					selectedPolygonColor: () => "#222222",
					selectedPolygonOutlineColor: () => "#111111",
					selectedPolygonFillOpacity: () => 1,
				},
			});

			expect(
				polygonMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "polygon", selected: true },
				}),
			).toMatchObject({
				polygonFillColor: "#222222",
				polygonOutlineColor: "#111111",
				polygonOutlineWidth: 4,
				polygonFillOpacity: 1,
			});

			expect(
				polygonMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "polygon" },
				}),
			).toMatchObject({
				polygonFillColor: "#3f97e0",
				polygonFillOpacity: 0.3,
				polygonOutlineColor: "#3f97e0",
			});
		});
	});
});
