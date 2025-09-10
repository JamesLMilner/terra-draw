import { Position } from "geojson";
import { MockModeConfig } from "../../test/mock-mode-config";
import { TerraDrawSelectMode } from "./select.mode";
import { MockCursorEvent } from "../../test/mock-cursor-event";
import { MockKeyboardEvent } from "../../test/mock-keyboard-event";
import { TerraDrawGeoJSONStore, TerraDrawMouseEvent } from "../../common";
import { DefaultPointerEvents } from "../base.mode";

describe("TerraDrawSelectMode", () => {
	let selectMode: TerraDrawSelectMode;
	let store: TerraDrawGeoJSONStore;
	let onChange: jest.Mock;
	let setCursor: jest.Mock;
	let project: jest.Mock;
	let onSelect: jest.Mock;
	let onDeselect: jest.Mock;
	let onFinish: jest.Mock;

	const setSelectMode = (
		options?: ConstructorParameters<typeof TerraDrawSelectMode>[0],
	) => {
		selectMode = new TerraDrawSelectMode(options);
		const mockConfig = MockModeConfig(selectMode.mode);
		onChange = mockConfig.onChange;
		project = mockConfig.project;
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
			selectMode.register(MockModeConfig(selectMode.mode));
			expect(selectMode.state).toBe("registered");
		});

		it("setting state directly throws error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.state = "started";
			}).toThrow();
		});

		it("stopping before not registering throws error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.stop();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.start();
			}).toThrow();
		});

		it("starting before not registering throws error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.start();
			}).toThrow();
		});

		it("registering multiple times throws an error", () => {
			const selectMode = new TerraDrawSelectMode();

			expect(() => {
				selectMode.register(MockModeConfig(selectMode.mode));
				selectMode.register(MockModeConfig(selectMode.mode));
			}).toThrow();
		});

		it("can start correctly", () => {
			const selectMode = new TerraDrawSelectMode();

			selectMode.register(MockModeConfig(selectMode.mode));
			selectMode.start();

			expect(selectMode.state).toBe("selecting");
		});

		it("can stop correctly", () => {
			const selectMode = new TerraDrawSelectMode();

			selectMode.register(MockModeConfig(selectMode.mode));
			selectMode.start();
			selectMode.stop();

			expect(selectMode.state).toBe("stopped");
		});
	});

	describe("onClick", () => {
		describe("left click", () => {
			it("does not select if no features", () => {
				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).not.toHaveBeenCalled();
				expect(onDeselect).not.toHaveBeenCalled();
				expect(onSelect).not.toHaveBeenCalled();
			});

			describe("point", () => {
				it("does select if feature is clicked", () => {
					addPointToStore([0, 0]);

					selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
				});

				it("does not select if feature is not clicked", () => {
					addPointToStore([0, 0]);

					selectMode.onClick(
						MockCursorEvent({
							lng: 50,
							lat: 100,
						}),
					);

					expect(onSelect).toHaveBeenCalledTimes(0);
				});

				it("does not select if selectable flag is false", () => {
					setSelectMode({ flags: { point: {} } });

					addPointToStore([0, 0]);

					selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onSelect).toHaveBeenCalledTimes(0);
				});

				it("deselects selected when click is not on same or different feature", () => {
					addPointToStore([0, 0]);

					selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onSelect).toHaveBeenCalledTimes(1);

					selectMode.onClick(MockCursorEvent({ lng: 50, lat: 50 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onDeselect).toHaveBeenCalledTimes(1);
				});
			});

			describe("linestring", () => {
				it("does select if feature is clicked", () => {
					addLineStringToStore([
						[0, 0],
						[1, 1],
					]);

					selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
				});

				it("does not select if feature is not clicked", () => {
					addLineStringToStore([
						[0, 0],
						[1, 1],
					]);

					selectMode.onClick(
						MockCursorEvent({
							lng: 50,
							lat: 100,
						}),
					);

					expect(onSelect).toHaveBeenCalledTimes(0);
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

					selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
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

					selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

					expect(onSelect).toHaveBeenCalledTimes(1);

					expect(onDeselect).toHaveBeenCalledTimes(0);

					selectMode.onClick(MockCursorEvent({ lng: 59, lat: 59 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onDeselect).toHaveBeenCalledTimes(1);
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

					selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

					expect(onSelect).toHaveBeenCalledTimes(1);

					expect(onDeselect).toHaveBeenCalledTimes(0);

					selectMode.onClick(MockCursorEvent({ lng: 59, lat: 59 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onDeselect).toHaveBeenCalledTimes(0);
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

					selectMode.onClick(MockCursorEvent({ lng: 2, lat: 2 }));

					expect(onSelect).toHaveBeenCalledTimes(0);
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
						undefined,
					);

					// Store the ids of the created feature
					const idOne = onChange.mock.calls[0][0] as string[];

					// Select polygon
					selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

					// Polygon selected set to true
					expect(onChange).toHaveBeenNthCalledWith(
						2,
						idOne,
						"update",
						undefined,
					);

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
						undefined,
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
						undefined,
					);

					// Store the ids of the created feature
					const idOne = onChange.mock.calls[0][0] as string[];

					// Select polygon
					selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

					// Polygon selected set to true
					expect(onChange).toHaveBeenNthCalledWith(
						2,
						idOne,
						"update",
						undefined,
					);

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
						undefined,
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
						undefined,
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
							undefined,
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
							undefined,
						);

						// Store the ids of the created features
						const idOne = onChange.mock.calls[0][0] as string[];
						const idTwo = onChange.mock.calls[1][0] as string[];

						// Select polygon
						selectMode.onClick(
							MockCursorEvent({
								lng: 0.5,
								lat: 0.5,
							}),
						);

						expect(onSelect).toHaveBeenCalledTimes(1);
						expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

						// First polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(
							3,
							idOne,
							"update",
							undefined,
						);

						// Deselect first polygon, select second
						selectMode.onClick(
							MockCursorEvent({
								lng: 2.5,
								lat: 2.5,
							}),
						);

						// Second polygon selected
						expect(onSelect).toHaveBeenCalledTimes(2);
						expect(onSelect).toHaveBeenNthCalledWith(2, idTwo[0]);

						// Deselect first polygon
						expect(onDeselect).toHaveBeenCalledTimes(1);
						expect(onDeselect).toHaveBeenNthCalledWith(1, idOne[0]);

						// First polygon selected set to false
						expect(onChange).toHaveBeenNthCalledWith(
							4,
							idOne,
							"update",
							undefined,
						);

						// Second polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(
							5,
							idTwo,
							"update",
							undefined,
						);
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
							undefined,
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
							undefined,
						);

						// Store the ids of the created features
						const idOne = onChange.mock.calls[0][0] as string[];
						const idTwo = onChange.mock.calls[1][0] as string[];

						// Select polygon
						selectMode.onClick(
							MockCursorEvent({
								lng: 0.5,
								lat: 0.5,
							}),
						);

						expect(onSelect).toHaveBeenCalledTimes(1);
						expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

						// First polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(
							3,
							idOne,
							"update",
							undefined,
						);

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
							undefined,
						);

						// Deselect first polygon, select second
						selectMode.onClick(
							MockCursorEvent({
								lng: 2.5,
								lat: 2.5,
							}),
						);

						// Second polygon selected
						expect(onSelect).toHaveBeenCalledTimes(2);
						expect(onSelect).toHaveBeenNthCalledWith(2, idTwo[0]);

						// Deselect first polygon selected set to false
						expect(onDeselect).toHaveBeenCalledTimes(1);
						expect(onDeselect).toHaveBeenNthCalledWith(1, idOne[0]);

						expect(onChange).toHaveBeenNthCalledWith(
							5,
							idOne,
							"update",
							undefined,
						);

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
							undefined,
						);

						// Second polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(
							7,
							idTwo,
							"update",
							undefined,
						);
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
							undefined,
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
							undefined,
						);

						// Store the ids of the created features
						const idOne = onChange.mock.calls[0][0] as string[];
						const idTwo = onChange.mock.calls[1][0] as string[];

						// Select polygon
						selectMode.onClick(
							MockCursorEvent({
								lng: 0.5,
								lat: 0.5,
							}),
						);

						expect(onSelect).toHaveBeenCalledTimes(1);
						expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

						// First polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(
							3,
							idOne,
							"update",
							undefined,
						);

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
							undefined,
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
							undefined,
						);

						// Deselect first polygon, select second
						selectMode.onClick(
							MockCursorEvent({
								lng: 2.5,
								lat: 2.5,
							}),
						);

						// Second polygon selected
						expect(onSelect).toHaveBeenCalledTimes(2);
						expect(onSelect).toHaveBeenNthCalledWith(2, idTwo[0]);

						// Deselect first polygon selected set to false
						expect(onDeselect).toHaveBeenCalledTimes(1);
						expect(onDeselect).toHaveBeenNthCalledWith(1, idOne[0]);

						expect(onChange).toHaveBeenNthCalledWith(
							6,
							idOne,
							"update",
							undefined,
						);

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
							undefined,
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
							undefined,
						);

						// Second polygon selected set to true
						expect(onChange).toHaveBeenNthCalledWith(
							9,
							idTwo,
							"update",
							undefined,
						);
					});
				});
			});
		});

		describe("right click", () => {
			let event: Partial<TerraDrawMouseEvent> = {
				button: "right",
				isContextMenu: false,
			};

			it("does not select if no features", () => {
				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).not.toHaveBeenCalled();
				expect(onDeselect).not.toHaveBeenCalled();
				expect(onSelect).not.toHaveBeenCalled();
			});

			it("returns if different feature than selected is clicked on", () => {
				setSelectMode({
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
					undefined,
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
					undefined,
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				// Select polygon
				selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update", undefined);

				jest.spyOn(store, "getGeometryCopy");
				jest.spyOn(store, "getPropertiesCopy");

				selectMode.onClick(
					MockCursorEvent({
						lng: 80.5,
						lat: 80.5,
						...event,
					}),
				);

				expect(store.getGeometryCopy).toHaveBeenCalledTimes(4);
				expect(onDeselect).toHaveBeenCalledTimes(0);
				expect(store.getPropertiesCopy).toHaveBeenCalledTimes(0);
			});

			it("does not delete coordinate if coordinate is clicked on but deletable is set to false", () => {
				setSelectMode({
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
					undefined,
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				// Select polygon
				selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update", undefined);

				jest.spyOn(store, "getGeometryCopy");
				jest.spyOn(store, "updateGeometry");
				jest.spyOn(store, "delete");

				// Deselect first polygon, select second
				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0, ...event }));

				expect(store.delete).toHaveBeenCalledTimes(0);
				expect(store.updateGeometry).toHaveBeenCalledTimes(0);

				// Only called for checking distance to selection points,
				// should hit early return otherwise
				expect(store.getGeometryCopy).toHaveBeenCalledTimes(4);
			});

			it("returns early if creates a invalid polygon by deleting coordinate", () => {
				setSelectMode({
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
					undefined,
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				// Select polygon
				selectMode.onClick(
					MockCursorEvent({
						lng: 0.322723,
						lat: 0.672897,
					}),
				);

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update", undefined);

				jest.spyOn(store, "delete");
				jest.spyOn(store, "updateGeometry");

				// Deselect first polygon, select second
				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0, ...event }));

				expect(store.delete).toHaveBeenCalledTimes(0);
				expect(store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("deletes a coordinate in deletable set to true and a coordinate is clicked on", () => {
				setSelectMode({
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
					undefined,
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				// Select polygon
				selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update", undefined);

				jest.spyOn(store, "delete");
				jest.spyOn(store, "updateGeometry");

				// Deselect first polygon, select second
				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0, ...event }));

				expect(store.delete).toHaveBeenCalledTimes(1);
				expect(store.updateGeometry).toHaveBeenCalledTimes(1);
			});
		});

		describe("context menu", () => {
			let event: Partial<TerraDrawMouseEvent> = {
				button: "left",
				isContextMenu: true,
			};

			it("does not select if no features", () => {
				selectMode.updateOptions({
					pointerEvents: {
						...DefaultPointerEvents,
						rightClick: false,
						contextMenu: true,
					},
				});

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).not.toHaveBeenCalled();
				expect(onDeselect).not.toHaveBeenCalled();
				expect(onSelect).not.toHaveBeenCalled();
			});

			it("returns if different feature than selected is clicked on", () => {
				setSelectMode({
					pointerEvents: {
						...DefaultPointerEvents,
						rightClick: false,
						contextMenu: true,
					},
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
					undefined,
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
					undefined,
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				// Select polygon
				selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(3, idOne, "update", undefined);

				jest.spyOn(store, "getGeometryCopy");
				jest.spyOn(store, "getPropertiesCopy");

				selectMode.onClick(
					MockCursorEvent({
						lng: 80.5,
						lat: 80.5,
						...event,
					}),
				);

				expect(store.getGeometryCopy).toHaveBeenCalledTimes(4);
				expect(onDeselect).toHaveBeenCalledTimes(0);
				expect(store.getPropertiesCopy).toHaveBeenCalledTimes(0);
			});

			it("does not delete coordinate if coordinate is clicked on but deletable is set to false", () => {
				setSelectMode({
					pointerEvents: {
						...DefaultPointerEvents,
						rightClick: false,
						contextMenu: true,
					},
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
					undefined,
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				// Select polygon
				selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update", undefined);

				jest.spyOn(store, "getGeometryCopy");
				jest.spyOn(store, "updateGeometry");
				jest.spyOn(store, "delete");

				// Deselect first polygon, select second
				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0, ...event }));

				expect(store.delete).toHaveBeenCalledTimes(0);
				expect(store.updateGeometry).toHaveBeenCalledTimes(0);

				// Only called for checking distance to selection points,
				// should hit early return otherwise
				expect(store.getGeometryCopy).toHaveBeenCalledTimes(4);
			});

			it("returns early if creates a invalid polygon by deleting coordinate", () => {
				setSelectMode({
					pointerEvents: {
						rightClick: false,
						contextMenu: true,
						leftClick: true,
						onDragStart: true,
						onDrag: true,
						onDragEnd: true,
					},
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
					undefined,
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				// Select polygon
				selectMode.onClick(
					MockCursorEvent({
						lng: 0.322723,
						lat: 0.672897,
					}),
				);

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update", undefined);

				jest.spyOn(store, "delete");
				jest.spyOn(store, "updateGeometry");

				// Deselect first polygon, select second
				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0, ...event }));

				expect(store.delete).toHaveBeenCalledTimes(0);
				expect(store.updateGeometry).toHaveBeenCalledTimes(0);
			});

			it("deletes a coordinate in deletable set to true and a coordinate is clicked on", () => {
				setSelectMode({
					pointerEvents: {
						...DefaultPointerEvents,
						rightClick: false,
						contextMenu: true,
					},
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
					undefined,
				);

				// Store the ids of the created features
				const idOne = onChange.mock.calls[0][0] as string[];

				// Select polygon
				selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// First polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update", undefined);

				jest.spyOn(store, "delete");
				jest.spyOn(store, "updateGeometry");

				// Deselect first polygon, select second
				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0, ...event }));

				expect(store.delete).toHaveBeenCalledTimes(1);
				expect(store.updateGeometry).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("onKeyUp", () => {
		describe("Delete", () => {
			it("does nothing with no features selected", () => {
				selectMode.onKeyUp(
					MockKeyboardEvent({ key: "Delete", heldKeys: ["Delete"] }),
				);

				expect(onChange).not.toHaveBeenCalled();
				expect(onDeselect).not.toHaveBeenCalled();
			});

			it("deletes when feature is selected", () => {
				addPointToStore([0, 0]);

				// Select created feature
				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onChange).toHaveBeenCalledTimes(2);
				expect(onChange).toHaveBeenNthCalledWith(
					2,
					[expect.any(String)],
					"update",
					undefined,
				);

				expect(onSelect).toHaveBeenCalledTimes(1);

				selectMode.onKeyUp(MockKeyboardEvent({ key: "Delete" }));

				expect(onDeselect).toHaveBeenCalledTimes(1);

				expect(onChange).toHaveBeenCalledTimes(3);
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"delete",
					undefined,
				);
			});
		});

		describe("Escape", () => {
			it("does nothing with no features selected", () => {
				selectMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				expect(onChange).not.toHaveBeenCalled();
				expect(onDeselect).not.toHaveBeenCalled();
			});

			it("does nothing with no features selected", () => {
				addPointToStore([0, 0]);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);

				selectMode.onKeyUp(MockKeyboardEvent({ key: "Escape" }));

				expect(onChange).toHaveBeenCalledTimes(3);
				expect(onDeselect).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("onDragStart", () => {
		it("nothing selected, nothing changes", () => {
			selectMode.onDragStart(MockCursorEvent({ lng: 0, lat: 0 }), jest.fn());

			expect(onChange).toHaveBeenCalledTimes(0);
			expect(onDeselect).toHaveBeenCalledTimes(0);
			expect(onSelect).toHaveBeenCalledTimes(0);
			expect(project).toHaveBeenCalledTimes(0);
		});

		it("does not trigger starting of drag events if mode not draggable", () => {
			addPointToStore([0, 0]);

			selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			// Pointer set to move when the cursor is
			expect(setCursor).toHaveBeenCalledTimes(1);
			expect(setCursor).toHaveBeenCalledWith("move");

			expect(onSelect).toHaveBeenCalledTimes(1);

			const setMapDraggability = jest.fn();
			selectMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(setMapDraggability).not.toHaveBeenCalled();
		});

		it("does trigger onDragStart events if mode is draggable", () => {
			selectMode = new TerraDrawSelectMode({
				flags: { point: { feature: { draggable: true } } },
			});

			const mockConfig = MockModeConfig(selectMode.mode);
			onChange = mockConfig.onChange;
			project = mockConfig.project;
			onSelect = mockConfig.onSelect;
			onDeselect = mockConfig.onDeselect;
			setCursor = mockConfig.setCursor;
			store = mockConfig.store;
			selectMode.register(mockConfig);

			addPointToStore([0, 0]);

			selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onSelect).toHaveBeenCalledTimes(1);

			const setMapDraggability = jest.fn();
			selectMode.onDragStart(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);
			expect(setCursor).toHaveBeenCalled();
			expect(setMapDraggability).toHaveBeenCalled();
		});
	});

	describe("onDrag", () => {
		it("nothing selected, nothing changes", () => {
			const setMapDraggability = jest.fn();
			selectMode.onDrag(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(onChange).toHaveBeenCalledTimes(0);
			expect(onDeselect).toHaveBeenCalledTimes(0);
			expect(onSelect).toHaveBeenCalledTimes(0);
			expect(project).toHaveBeenCalledTimes(0);
		});

		it("does not trigger drag events if mode not draggable", () => {
			addPointToStore([0, 0]);

			selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledTimes(2);

			const setMapDraggability = jest.fn();
			selectMode.onDrag(
				MockCursorEvent({ lng: 0, lat: 0 }),
				setMapDraggability,
			);

			expect(onChange).toHaveBeenCalledTimes(2);
		});

		describe("drag feature", () => {
			describe("point", () => {
				it("does not trigger dragging updates if dragging flags disabled", () => {
					addPointToStore([0, 0]);

					selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledTimes(2);

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(2);
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

					selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledTimes(2);

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(2);
				});

				it("does trigger drag events if mode is draggable for point", () => {
					setSelectMode({
						flags: {
							point: { feature: { draggable: true } },
						},
					});

					addPointToStore([0, 0]);

					selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledTimes(2);

					selectMode.onDragStart(
						MockCursorEvent({ lng: 0, lat: 0 }),
						jest.fn(),
					);

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(3);
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

					expect(onChange).toHaveBeenCalledTimes(1);
					const idOne = onChange.mock.calls[0][0] as string[];

					selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onSelect).toHaveBeenNthCalledWith(1, id);
					expect(onChange).toHaveBeenCalledTimes(2);

					selectMode.onDragStart(
						MockCursorEvent({ lng: 1, lat: 1 }),
						jest.fn(),
					);

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						MockCursorEvent({ lng: 1, lat: 1 }),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(3);
					expect(onChange).toHaveBeenNthCalledWith(
						3,
						idOne,
						"update",
						undefined,
					);
				});
			});

			describe("polygon", () => {
				it("does trigger drag events if feature draggable flag set", () => {
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

					expect(onChange).toHaveBeenCalledTimes(1);
					const idOne = onChange.mock.calls[0][0] as string[];

					selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

					expect(onSelect).toHaveBeenCalledTimes(1);
					expect(onChange).toHaveBeenCalledTimes(2);

					selectMode.onDragStart(
						MockCursorEvent({ lng: 0.5, lat: 0.5 }),
						jest.fn(),
					);

					const setMapDraggability = jest.fn();
					selectMode.onDrag(
						MockCursorEvent({
							lng: 0.5,
							lat: 0.5,
						}),
						setMapDraggability,
					);

					expect(onChange).toHaveBeenCalledTimes(3);
					expect(onChange).toHaveBeenNthCalledWith(
						3,
						idOne,
						"update",
						undefined,
					);
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
				expect(onChange).toHaveBeenCalledTimes(1);

				addLineStringToStore([
					[0, 0],
					[1, 1],
				]);
				expect(onChange).toHaveBeenCalledTimes(2);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledTimes(4);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
					undefined,
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String), expect.any(String)],
					"create",
					undefined,
				);

				selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 1, lat: 1 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(5);

				// Update linestring position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[expect.any(String), expect.any(String)],
					"update",
					undefined,
				);
			});

			it("does trigger drag events if mode is draggable for polygon", () => {
				setSelectMode({
					flags: { polygon: { feature: { coordinates: { draggable: true } } } },
				});

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);

				expect(onChange).toHaveBeenCalledTimes(1);

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(onChange).toHaveBeenCalledTimes(2);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledTimes(4);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
					undefined,
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
					undefined,
				);

				selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 1, lat: 1 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(5);

				// Update linestring position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[expect.any(String), expect.any(String)],
					"update",
					undefined,
				);
			});

			it("can snap to nearby polygon coordinates if snappable (toCoordinate) is enabled", () => {
				setSelectMode({
					flags: {
						polygon: {
							feature: { coordinates: { draggable: true, snappable: true } },
						},
					},
				});

				jest.spyOn(store, "updateGeometry");

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);

				expect(onChange).toHaveBeenCalledTimes(1);

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				addPolygonToStore([
					[2, 2],
					[2, 3],
					[3, 3],
					[3, 2],
					[2, 2],
				]);

				expect(onChange).toHaveBeenCalledTimes(3);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledTimes(5);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String)],
					"update",
					undefined,
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"create",
					undefined,
				);

				selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 1.5, lat: 1.5 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(6);

				expect(store.updateGeometry).toHaveBeenCalledTimes(1);
				expect(store.updateGeometry).toHaveBeenNthCalledWith(1, [
					{
						geometry: {
							coordinates: [
								[
									[0, 0],
									[0, 1],
									[2, 2],
									[1, 0],
									[0, 0],
								],
							],
							type: "Polygon",
						},
						id: expect.any(String),
					},
					{
						geometry: {
							coordinates: [2, 2],
							type: "Point",
						},
						id: expect.any(String),
					},
				]);

				// Update polygon position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					6,
					[expect.any(String), expect.any(String)],
					"update",
					undefined,
				);
			});

			it("can snap to nearby linestring coordinates if snappable (toCoordinate) is enabled", () => {
				setSelectMode({
					flags: {
						linestring: {
							feature: { coordinates: { draggable: true, snappable: true } },
						},
					},
				});

				jest.spyOn(store, "updateGeometry");

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);

				expect(onChange).toHaveBeenCalledTimes(1);

				addLineStringToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				addLineStringToStore([
					[2, 2],
					[2, 3],
					[3, 3],
					[3, 2],
				]);

				expect(onChange).toHaveBeenCalledTimes(3);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledTimes(5);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String)],
					"update",
					undefined,
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"create",
					undefined,
				);

				selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 1.5, lat: 1.5 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(6);

				expect(store.updateGeometry).toHaveBeenCalledTimes(1);
				expect(store.updateGeometry).toHaveBeenNthCalledWith(1, [
					{
						geometry: {
							coordinates: [
								[0, 0],
								[0, 1],
								[2, 2],
								[1, 0],
							],
							type: "LineString",
						},
						id: expect.any(String),
					},
					{
						geometry: {
							coordinates: [2, 2],
							type: "Point",
						},
						id: expect.any(String),
					},
				]);

				// Update linestring position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					6,
					[expect.any(String), expect.any(String)],
					"update",
					undefined,
				);
			});

			it("can snap to nearby polygon line if snappable toLine is enabled", () => {
				setSelectMode({
					flags: {
						polygon: {
							feature: {
								coordinates: {
									draggable: true,
									snappable: {
										toLine: true,
									},
								},
							},
						},
					},
				});

				jest.spyOn(store, "updateGeometry");

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);

				expect(onChange).toHaveBeenCalledTimes(1);

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				addPolygonToStore([
					[2, 2],
					[2, 3],
					[3, 3],
					[3, 2],
					[2, 2],
				]);

				expect(onChange).toHaveBeenCalledTimes(3);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledTimes(5);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String)],
					"update",
					undefined,
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"create",
					undefined,
				);

				selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 1.5, lat: 1.5 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(6);

				expect(store.updateGeometry).toHaveBeenCalledTimes(1);
				expect(store.updateGeometry).toHaveBeenNthCalledWith(1, [
					{
						geometry: {
							coordinates: [
								[
									[0, 0],
									[0, 1],
									[2, 2],
									[1, 0],
									[0, 0],
								],
							],
							type: "Polygon",
						},
						id: expect.any(String),
					},
					{
						geometry: {
							coordinates: [2, 2],
							type: "Point",
						},
						id: expect.any(String),
					},
				]);

				// Update polygon position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					6,
					[expect.any(String), expect.any(String)],
					"update",
					undefined,
				);
			});

			it("can snap to nearby linestring coordinates if snappable toLine is enabled", () => {
				setSelectMode({
					flags: {
						linestring: {
							feature: {
								coordinates: {
									draggable: true,
									snappable: {
										toLine: true,
									},
								},
							},
						},
					},
				});

				jest.spyOn(store, "updateGeometry");

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);

				expect(onChange).toHaveBeenCalledTimes(1);

				addLineStringToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
				]);

				addLineStringToStore([
					[2, 2],
					[2, 3],
					[3, 3],
					[3, 2],
				]);

				expect(onChange).toHaveBeenCalledTimes(3);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledTimes(5);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String)],
					"update",
					undefined,
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"create",
					undefined,
				);

				selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 1.5, lat: 1.5 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(6);

				expect(store.updateGeometry).toHaveBeenCalledTimes(1);
				expect(store.updateGeometry).toHaveBeenNthCalledWith(1, [
					{
						geometry: {
							coordinates: [
								[0, 0],
								[0, 1],
								[2, 2],
								[1, 0],
							],
							type: "LineString",
						},
						id: expect.any(String),
					},
					{
						geometry: {
							coordinates: [2, 2],
							type: "Point",
						},
						id: expect.any(String),
					},
				]);

				// Update linestring position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					6,
					[expect.any(String), expect.any(String)],
					"update",
					undefined,
				);
			});

			it("can snap to nearby polygon line if snappable toCustom is enabled", () => {
				setSelectMode({
					flags: {
						polygon: {
							feature: {
								coordinates: {
									draggable: true,
									snappable: {
										toCustom: () => [45, 45],
									},
								},
							},
						},
					},
				});

				jest.spyOn(store, "updateGeometry");

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);

				expect(onChange).toHaveBeenCalledTimes(1);

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				addPolygonToStore([
					[2, 2],
					[2, 3],
					[3, 3],
					[3, 2],
					[2, 2],
				]);

				expect(onChange).toHaveBeenCalledTimes(3);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledTimes(5);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String)],
					"update",
					undefined,
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"create",
					undefined,
				);

				selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 1.5, lat: 1.5 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(6);

				expect(store.updateGeometry).toHaveBeenCalledTimes(1);
				expect(store.updateGeometry).toHaveBeenNthCalledWith(1, [
					{
						geometry: {
							coordinates: [
								[
									[0, 0],
									[0, 1],
									[45, 45],
									[1, 0],
									[0, 0],
								],
							],
							type: "Polygon",
						},
						id: expect.any(String),
					},
					{
						geometry: {
							coordinates: [45, 45],
							type: "Point",
						},
						id: expect.any(String),
					},
				]);

				// Update polygon position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					6,
					[expect.any(String), expect.any(String)],
					"update",
					undefined,
				);
			});
		});

		describe("drag resizing with center", () => {
			it("does trigger drag events if mode is draggable for linestring", () => {
				setSelectMode({
					flags: {
						linestring: {
							feature: {
								coordinates: {
									draggable: true,
									resizable: "center",
								},
							},
						},
					},
				});

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);
				expect(onChange).toHaveBeenCalledTimes(1);

				addLineStringToStore([
					[0, 0],
					[1, 1],
				]);
				expect(onChange).toHaveBeenCalledTimes(2);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledTimes(4);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
					undefined,
				);

				// Create selection points
				expect(onChange).toHaveBeenNthCalledWith(
					4,
					[expect.any(String), expect.any(String)],
					"create",
					undefined,
				);

				selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 1, lat: 1 }),
					setMapDraggability,
				);

				selectMode.onDrag(
					MockCursorEvent({ lng: 1, lat: 1 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(6);

				// Update linestring position and 1 selection points
				// that gets moved
				expect(onChange).toHaveBeenNthCalledWith(
					5,
					[expect.any(String), expect.any(String), expect.any(String)],
					"update",
					undefined,
				);
			});

			it("CreateCursorEvent({ lng: 0, lat: 0 })", () => {
				setSelectMode({
					flags: {
						polygon: {
							feature: {
								coordinates: {
									draggable: true,
									resizable: "center",
								},
							},
						},
					},
				});

				// We want to account for ignoring points branch
				addPointToStore([100, 89]);

				expect(onChange).toHaveBeenCalledTimes(1);

				addPolygonToStore([
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				]);

				expect(onChange).toHaveBeenCalledTimes(2);

				selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledTimes(4);

				// Select feature
				expect(onChange).toHaveBeenNthCalledWith(
					3,
					[expect.any(String)],
					"update",
					undefined,
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
					undefined,
				);

				selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 1, lat: 1 }),
					setMapDraggability,
				);

				selectMode.onDrag(
					MockCursorEvent({ lng: 1, lat: 1 }),
					setMapDraggability,
				);

				expect(onChange).toHaveBeenCalledTimes(6);

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
					undefined,
				);
			});
		});

		describe("drag midpoint", () => {
			it("does trigger when midpoints draggable flag enabled", () => {
				setSelectMode({
					flags: {
						polygon: {
							feature: {
								draggable: false,
								coordinates: {
									draggable: false,
									midpoints: {
										draggable: true,
									},
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
					undefined,
				);

				// Store the ids of the created feature
				const idOne = onChange.mock.calls[0][0] as string[];

				// Select polygon
				selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

				expect(onSelect).toHaveBeenCalledTimes(1);
				expect(onSelect).toHaveBeenNthCalledWith(1, idOne[0]);

				// Polygon selected set to true
				expect(onChange).toHaveBeenNthCalledWith(2, idOne, "update", undefined);

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
					undefined,
				);

				expect(onChange).toHaveBeenCalledTimes(4);

				selectMode.onDragStart(
					MockCursorEvent({ lng: 0, lat: 0.5 }),
					jest.fn(),
				);

				expect(onChange).toHaveBeenCalledTimes(8);

				expect(onChange).toHaveBeenNthCalledWith(5, idOne, "update", undefined);

				// Delete existing midpoints and selection points
				expect(onChange).toHaveBeenNthCalledWith(
					6,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"delete",
					undefined,
				);

				// Mid points
				expect(onChange).toHaveBeenNthCalledWith(
					7,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"create",
					undefined,
				);

				// Selection points
				expect(onChange).toHaveBeenNthCalledWith(
					8,
					[
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
						expect.any(String),
					],
					"create",
					undefined,
				);

				const setMapDraggability = jest.fn();
				selectMode.onDrag(
					MockCursorEvent({ lng: 0, lat: 0.5 }),
					setMapDraggability,
				);
			});
		});
	});

	describe("onDragEnd", () => {
		it("sets map draggability back to false, sets cursor to default", () => {
			setSelectMode();

			const setMapDraggability = jest.fn();
			selectMode.onDragEnd(
				MockCursorEvent({ lng: 1, lat: 1 }),
				setMapDraggability,
			);

			expect(setMapDraggability).toHaveBeenCalledTimes(1);
			expect(setMapDraggability).toHaveBeenCalledWith(true);
			expect(setCursor).toHaveBeenCalledTimes(1);
			expect(setCursor).toHaveBeenCalledWith("move");
		});

		it("fires onFinish for dragged coordinate if it is currently being dragged", () => {
			setSelectMode({
				flags: { polygon: { feature: { coordinates: { draggable: true } } } },
			});

			// We want to account for ignoring points branch
			addPointToStore([100, 89]);

			expect(onChange).toHaveBeenCalledTimes(1);

			addPolygonToStore([
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
				[0, 0],
			]);

			expect(onChange).toHaveBeenCalledTimes(2);

			selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledTimes(4);

			// Select feature
			expect(onChange).toHaveBeenNthCalledWith(
				3,
				[expect.any(String)],
				"update",
				undefined,
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
				undefined,
			);

			selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

			const setMapDraggability = jest.fn();
			selectMode.onDrag(
				MockCursorEvent({ lng: 1, lat: 1 }),
				setMapDraggability,
			);

			selectMode.onDragEnd(
				MockCursorEvent({ lng: 1, lat: 1 }),
				setMapDraggability,
			);

			expect(onFinish).toHaveBeenCalledTimes(1);
			expect(onFinish).toHaveBeenCalledWith(expect.any(String), {
				action: "dragCoordinate",
				mode: "select",
			});
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

			expect(onChange).toHaveBeenCalledTimes(1);

			selectMode.onClick(MockCursorEvent({ lng: 0.5, lat: 0.5 }));

			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledTimes(2);

			selectMode.onDragStart(
				MockCursorEvent({ lng: 0.5, lat: 0.5 }),
				jest.fn(),
			);

			const setMapDraggability = jest.fn();
			selectMode.onDrag(
				MockCursorEvent({ lng: 0.5, lat: 0.5 }),
				setMapDraggability,
			);

			expect(onChange).toHaveBeenCalledTimes(3);

			selectMode.onDragEnd(
				MockCursorEvent({ lng: 1, lat: 1 }),
				setMapDraggability,
			);

			expect(onFinish).toHaveBeenCalledTimes(1);
			expect(onFinish).toHaveBeenCalledWith(expect.any(String), {
				action: "dragFeature",
				mode: "select",
			});
		});

		it("fires onFinish for resizable if it is currently being dragged", () => {
			setSelectMode({
				flags: {
					polygon: {
						feature: {
							coordinates: { resizable: "center" },
						},
					},
				},
			});
			// We want to account for ignoring points branch
			addPointToStore([100, 89]);

			expect(onChange).toHaveBeenCalledTimes(1);

			addPolygonToStore([
				[0, 0],
				[0, 1],
				[1, 1],
				[1, 0],
				[0, 0],
			]);

			expect(onChange).toHaveBeenCalledTimes(2);

			selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledTimes(4);

			// Select feature
			expect(onChange).toHaveBeenNthCalledWith(
				3,
				[expect.any(String)],
				"update",
				undefined,
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
				undefined,
			);

			selectMode.onDragStart(MockCursorEvent({ lng: 1, lat: 1 }), jest.fn());

			const setMapDraggability = jest.fn();
			selectMode.onDrag(
				MockCursorEvent({ lng: 1, lat: 1 }),
				setMapDraggability,
			);

			selectMode.onDragEnd(
				MockCursorEvent({ lng: 1, lat: 1 }),
				setMapDraggability,
			);

			expect(onFinish).toHaveBeenCalledTimes(1);
			expect(onFinish).toHaveBeenCalledWith(expect.any(String), {
				action: "dragCoordinateResize",
				mode: "select",
			});
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

			const mockConfig = MockModeConfig(selectMode.mode);
			onChange = mockConfig.onChange;
			project = mockConfig.project;
			onSelect = mockConfig.onSelect;
			onDeselect = mockConfig.onDeselect;

			selectMode.register(mockConfig);
		});

		it("does nothing", () => {
			selectMode.onMouseMove(
				MockCursorEvent({
					lng: 1,
					lat: 1,
				}),
			);

			expect(onChange).toHaveBeenCalledTimes(0);
			expect(onDeselect).toHaveBeenCalledTimes(0);
			expect(onSelect).toHaveBeenCalledTimes(0);
			expect(project).toHaveBeenCalledTimes(0);
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
			selectMode.register(MockModeConfig(selectMode.mode));
			expect(selectMode.styles).toStrictEqual({});
		});

		it("set fails if non valid styling", () => {
			const selectMode = new TerraDrawSelectMode();
			selectMode.register(MockModeConfig(selectMode.mode));

			expect(() => {
				(selectMode.styles as unknown) = "test";
			}).toThrow();

			expect(selectMode.styles).toStrictEqual({});
		});

		it("sets", () => {
			const selectMode = new TerraDrawSelectMode();
			selectMode.register(MockModeConfig(selectMode.mode));

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
					zIndex: 42,
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
				zIndex: 42,
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
				zIndex: 0,
			});
		});

		it("returns the correct styles for polygon from polygon mode when using a function", () => {
			const polygonMode = new TerraDrawSelectMode({
				styles: {
					selectedPolygonOutlineWidth: () => 4,
					selectedPolygonColor: () => "#222222",
					selectedPolygonOutlineColor: () => "#111111",
					selectedPolygonFillOpacity: () => 1,
					zIndex: () => 42,
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
				zIndex: 42,
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
				zIndex: 0,
			});
		});

		it("it returns default zIndex when not customized", () => {
			const polygonMode = new TerraDrawSelectMode({ styles: {} });
			expect(
				polygonMode.styleFeature({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [] },
					properties: { mode: "polygon", selected: true },
				}),
			).toMatchObject({
				zIndex: 10,
			});
		});
	});

	describe("afterFeatureUpdated", () => {
		it("does nothing if a feature is not selected", () => {
			const selectMode = new TerraDrawSelectMode();

			const mockConfig = MockModeConfig(selectMode.mode);
			selectMode.register(mockConfig);

			selectMode.afterFeatureUpdated({
				id: "test-id",
				type: "Feature",
				geometry: { type: "Point", coordinates: [0, 0] },
				properties: { mode: "point" },
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(0);
		});

		it("recreates selection points", () => {
			const selectMode = new TerraDrawSelectMode({
				flags: { polygon: { feature: { coordinates: { draggable: true } } } },
			});

			const mockConfig = MockModeConfig(selectMode.mode);
			selectMode.register(mockConfig);

			// Create a polygon to select
			const [id] = mockConfig.store.create([
				{
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[1, 0],
								[1, 1],
								[0, 1],
								[0, 0],
							],
						],
					},
					properties: { mode: "polygon" },
				},
			]);

			selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(mockConfig.onSelect).toHaveBeenCalledWith(id);

			mockConfig.onChange.mockClear();

			selectMode.afterFeatureUpdated({
				id,
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[0, 0],
							[1, 0],
							[0, 1],
							[0, 0],
						],
					],
				},
				properties: { mode: "polygon" },
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(2);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[
					expect.any(String),
					expect.any(String),
					expect.any(String),
					expect.any(String),
				],
				"delete",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				2,
				[expect.any(String), expect.any(String), expect.any(String)],
				"create",
				undefined,
			);
		});

		it("recreates selection and midpoints points", () => {
			const selectMode = new TerraDrawSelectMode({
				flags: {
					polygon: {
						feature: { coordinates: { draggable: true, midpoints: true } },
					},
				},
			});

			const mockConfig = MockModeConfig(selectMode.mode);
			selectMode.register(mockConfig);

			// Create a polygon to select
			const [id] = mockConfig.store.create([
				{
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[0, 0],
								[1, 0],
								[1, 1],
								[0, 1],
								[0, 0],
							],
						],
					},
					properties: { mode: "polygon" },
				},
			]);

			selectMode.onClick(MockCursorEvent({ lng: 0, lat: 0 }));

			expect(mockConfig.onSelect).toHaveBeenCalledWith(id);

			mockConfig.onChange.mockClear();

			selectMode.afterFeatureUpdated({
				id,
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[0, 0],
							[1, 0],
							[0, 1],
							[0, 0],
						],
					],
				},
				properties: { mode: "polygon" },
			});

			expect(mockConfig.onChange).toHaveBeenCalledTimes(4);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				1,
				[
					expect.any(String),
					expect.any(String),
					expect.any(String),
					expect.any(String),
				],
				"delete",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				2,
				[
					expect.any(String),
					expect.any(String),
					expect.any(String),
					expect.any(String),
				],
				"delete",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				3,
				[expect.any(String), expect.any(String), expect.any(String)],
				"create",
				undefined,
			);
			expect(mockConfig.onChange).toHaveBeenNthCalledWith(
				4,
				[expect.any(String), expect.any(String), expect.any(String)],
				"create",
				undefined,
			);
		});
	});
});
