import { FeatureId } from "../../../terra-draw/src/extend";
import {
	TerraDrawPointMode,
	TerraDrawPolygonMode,
	TerraDrawCircleMode,
	TerraDrawRectangleMode,
	TerraDrawAngledRectangleMode,
	TerraDrawSectorMode,
	TerraDrawLineStringMode,
	TerraDrawFreehandLineStringMode,
	TerraDrawFreehandMode,
	TerraDrawSensorMode,
	TerraDraw,
	TerraDrawSelectMode,
	GeoJSONStoreFeatures,
	HexColor,
	TerraDrawMarkerMode,
	setupUndoRedo,
} from "../../../terra-draw/src/terra-draw";
import {
	DefaultSize,
	LocationNewYork,
	DefaultZoom,
	Story,
	DefaultPlay,
} from "./config";

export const DefaultStory = {
	args: {
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
	},
	...DefaultPlay,
};

// Point drawing only story
const Point: Story = {
	...DefaultStory,
	args: {
		id: "point",
		modes: [() => new TerraDrawPointMode()],
		...DefaultStory.args,
	},
};

const MarkerPNG: Story = {
	...DefaultStory,
	args: {
		id: "marker-png",
		modes: [
			() =>
				new TerraDrawMarkerMode({
					styles: {
						markerUrl:
							"https://leafletjs.com/examples/custom-icons/leaf-green.png",
						markerWidth: 25,
						markerHeight: 60,
					},
				}),
		],
		...DefaultStory.args,
	},
};

const MarkerJPG: Story = {
	...DefaultStory,
	args: {
		id: "marker-jpg",
		modes: [
			() =>
				new TerraDrawMarkerMode({
					styles: {
						markerUrl:
							"https://upload.wikimedia.org/wikipedia/commons/1/1e/Marker_location.jpg",
						markerWidth: 226 / 10,
						markerHeight: 393 / 10,
					},
				}),
		],
		...DefaultStory.args,
	},
};

// Opacity drawing story
const Opacity: Story = {
	...DefaultStory,
	args: {
		id: "opacity",
		modes: [
			() =>
				new TerraDrawPointMode({
					styles: {
						pointOpacity: 0.5,
						pointOutlineOpacity: 0.75,
					},
				}),
			() =>
				new TerraDrawLineStringMode({
					styles: {
						lineStringOpacity: 0.5,
						closingPointOpacity: 0.75,
					},
				}),
			() =>
				new TerraDrawPolygonMode({
					styles: {
						fillOpacity: 0.5,
						outlineOpacity: 0.5,
						closingPointOpacity: 0.75,
					},
				}),
		],
		...DefaultStory.args,
	},
};

// Polygon drawing story
const Polygon: Story = {
	...DefaultStory,
	args: {
		id: "polygon",
		modes: [() => new TerraDrawPolygonMode()],
		...DefaultStory.args,
	},
};

// Polygon coordinate count story
const PolygonWithCoordinateCounts: Story = {
	...DefaultStory,
	args: {
		id: "polygon-wtih-coordinate-counts",
		modes: [() => new TerraDrawPolygonMode()],
		instructions:
			"Click to add points, the provisional and committed coordinate counts will appear here",
		afterRender: (draw: TerraDraw) => {
			draw.on("change", (ids) => {
				const feature = draw.getSnapshotFeature(ids[0]);
				if (feature) {
					const provisionalCount =
						feature.properties["provisionalCoordinateCount"];
					const committedCount = feature.properties["committedCoordinateCount"];
					if (provisionalCount === undefined || committedCount === undefined) {
						return;
					}

					const instructions = document.getElementById("instructions");
					if (!instructions) {
						return;
					}
					instructions.textContent = `Provisional Coordinates: ${provisionalCount}, Committed Coordinates: ${committedCount}`;
				}
			});

			draw.on("finish", (_ids) => {
				const instructions = document.getElementById("instructions");
				if (!instructions) {
					return;
				}
				instructions.textContent = `Finished drawing polygon`;
			});
		},
		...DefaultStory.args,
	},
};

// Polygon with coordinate points story
const PolygonWithCoordinatePoints: Story = {
	args: {
		id: "polygon-coordinate-points",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [
			() =>
				new TerraDrawPolygonMode({
					showCoordinatePoints: true,
				}),
		],
	},
	...DefaultPlay,
};

// Polygon with coordinate snapping story
const PolygonWithCoordinateSnapping: Story = {
	args: {
		id: "polygon-coordinate-snapping",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [
			() =>
				new TerraDrawPolygonMode({
					snapping: {
						toCoordinate: true,
					},
				}),
		],
	},
	...DefaultPlay,
};

// Polygon with line snapping story
const PolygonWithLineSnapping: Story = {
	args: {
		id: "polygon-line-snapping",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [
			() =>
				new TerraDrawPolygonMode({
					snapping: {
						toLine: true,
					},
				}),
		],
	},
	...DefaultPlay,
};

// Polygon styling story - changes fill color based on a property on the feature
const Styling: Story = {
	...DefaultStory,
	args: {
		id: "polygon-styling",
		modes: [
			() =>
				new TerraDrawPolygonMode({
					styles: {
						fillColor: (feature: GeoJSONStoreFeatures) =>
							(feature.properties.randomColor as HexColor) ||
							("#ff0000" as HexColor),
					},
				}),
		],
		...DefaultStory.args,
		afterRender: (draw: TerraDraw) => {
			setInterval(() => {
				const features = draw.getSnapshot();
				if (features.length === 0) return;
				features.forEach((feature) => {
					draw.updateFeatureProperties(feature.id!, {
						randomColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					});
				});
			}, 2000);
		},
		instructions:
			"Random colors will be applied to each polygon every two seconds based on the 'randomColor' property on the feature.",
	},
};

// Z Index ordering story
const ZIndexOrdering: Story = {
	...DefaultStory,
	args: {
		id: "polygon-z-index",
		modes: [
			() =>
				new TerraDrawPolygonMode({
					snapping: {
						toCoordinate: true,
					},
					showCoordinatePoints: true,
					editable: true,
					styles: {
						coordinatePointColor: "#ff0000",
						closingPointColor: "#00ff00",
					},
				}),
			() => new TerraDrawLineStringMode(),
			() => new TerraDrawPointMode(),
		],
		...DefaultStory.args,
		instructions:
			"Different mode features have different z-indexes, you can experiment by drawing different features on top of each other.",
	},
};

// Polygon with editable enabled story
const PolygonWithEditableEnabled: Story = {
	args: {
		id: "polygon-editable",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [
			() =>
				new TerraDrawPolygonMode({
					editable: true,
				}),
		],
	},
	...DefaultPlay,
};

// Circle drawing story
const Circle: Story = {
	...DefaultStory,
	args: {
		id: "circle",
		modes: [() => new TerraDrawCircleMode()],
		...DefaultStory.args,
	},
};

// Circle drawing with click-drag interaction story
const CircleWithClickDragInteraction: Story = {
	...DefaultStory,
	args: {
		id: "circle-with-click-drag-interaction",
		modes: [
			() =>
				new TerraDrawCircleMode({
					drawInteraction: "click-drag",
				}),
		],
		...DefaultStory.args,
	},
};

// Circle drawing with click-move-or-drag interaction story
const CircleWithClickMoveOrDragInteraction: Story = {
	...DefaultStory,
	args: {
		id: "circle-with-click-move-or-drag-interaction",
		modes: [
			() =>
				new TerraDrawCircleMode({
					drawInteraction: "click-move-or-drag",
				}),
		],
		...DefaultStory.args,
	},
};

// Rectangle drawing story
const Rectangle: Story = {
	...DefaultStory,
	args: {
		id: "rectangle",
		modes: [() => new TerraDrawRectangleMode()],
		...DefaultStory.args,
	},
};

// Rectangle drawing with click-drag interaction story
const RectangleWithClickDragInteraction: Story = {
	...DefaultStory,
	args: {
		id: "rectangle-with-click-drag-interaction",
		modes: [
			() =>
				new TerraDrawRectangleMode({
					drawInteraction: "click-drag",
				}),
		],
		...DefaultStory.args,
	},
};

// Rectangle drawing with click-move-or-drag interaction story
const RectangleWithClickMoveOrDragInteraction: Story = {
	...DefaultStory,
	args: {
		id: "rectangle-with-click-move-or-drag-interaction",
		modes: [
			() =>
				new TerraDrawRectangleMode({
					drawInteraction: "click-move-or-drag",
				}),
		],
		...DefaultStory.args,
	},
};

// Angled rectangle drawing story
const AngledRectangle: Story = {
	...DefaultStory,
	args: {
		id: "angled-rectangle",
		modes: [() => new TerraDrawAngledRectangleMode()],
		...DefaultStory.args,
	},
};

// Sector drawing story
const Sector: Story = {
	...DefaultStory,
	args: {
		id: "sector",
		modes: [() => new TerraDrawSectorMode()],
		...DefaultStory.args,
	},
};

// Linestring drawing story
const LineString: Story = {
	...DefaultStory,
	args: {
		id: "linestring",
		modes: [() => new TerraDrawLineStringMode()],
		...DefaultStory.args,
	},
};

// Linestring drawing story
const LineStringFinishOnNthCoordinate: Story = {
	...DefaultStory,
	args: {
		id: "linestring-finish-on-nth-coordinate",
		modes: [
			() =>
				new TerraDrawLineStringMode({
					finishOnNthCoordinate: 2,
				}),
		],
		...DefaultStory.args,
	},
};

// Linestring drawing story
const LineStringWithCoordinatePoints: Story = {
	...DefaultStory,
	args: {
		id: "linestring",
		modes: [
			() =>
				new TerraDrawLineStringMode({
					showCoordinatePoints: true,
				}),
		],
		...DefaultStory.args,
	},
};

// Linestring drawing story
const LineStringEditable: Story = {
	...DefaultStory,
	args: {
		id: "linestring-editable",
		modes: [
			() =>
				new TerraDrawLineStringMode({
					editable: true,
				}),
		],
		...DefaultStory.args,
	},
};

// Linestring with coordinate snapping  story
const LineStringWithCoordinateSnapping: Story = {
	...DefaultStory,
	args: {
		id: "linestring-coordinate-snapping",
		modes: [
			() =>
				new TerraDrawLineStringMode({
					snapping: {
						toCoordinate: true,
					},
				}),
		],
		...DefaultStory.args,
	},
};

// Linestring with linestring snapping  story
const LineStringWithLineSnapping: Story = {
	...DefaultStory,
	args: {
		id: "linestring-line-snapping",
		modes: [
			() =>
				new TerraDrawLineStringMode({
					snapping: {
						toLine: true,
					},
				}),
		],
		...DefaultStory.args,
	},
};

// Freehand linestring drawing story
const FreehandLineString: Story = {
	...DefaultStory,
	args: {
		id: "freehand-linestring",
		modes: [() => new TerraDrawFreehandLineStringMode()],
		...DefaultStory.args,
	},
};

// Freehand drawing story
const Freehand: Story = {
	...DefaultStory,
	args: {
		id: "freehand",
		modes: [() => new TerraDrawFreehandMode()],
		...DefaultStory.args,
	},
};

// Freehand drawing story
const FreehandWithSmoothing: Story = {
	...DefaultStory,
	args: {
		id: "freehand-with-smoothing",
		modes: [
			() =>
				new TerraDrawFreehandMode({
					smoothing: 0.5,
					preventPointsNearClose: false,
				}),
		],
		...DefaultStory.args,
	},
};

// Freehand autoclose drawing story
const FreehandWithAutoClose: Story = {
	...DefaultStory,
	args: {
		id: "freehand-autoclose",
		modes: [
			() =>
				new TerraDrawFreehandMode({
					autoClose: true,
				}),
		],
		...DefaultStory.args,
	},
};

// Sensor drawing story
const Sensor: Story = {
	...DefaultStory,
	args: {
		id: "sensor",
		modes: [() => new TerraDrawSensorMode()],
		...DefaultStory.args,
	},
};

// Select mode story
const Select: Story = {
	...DefaultStory,
	args: {
		id: "select",
		modes: [
			() =>
				new TerraDrawPolygonMode({
					showCoordinatePoints: true,
					styles: {
						coordinatePointColor: "#ff0000",
					},
				}),
			() =>
				new TerraDrawSelectMode({
					styles: {
						selectionPointColor: "#0000ff",
					},
					flags: {
						polygon: {
							feature: {
								draggable: true,
								coordinates: {
									draggable: true,
									midpoints: {
										draggable: true,
									},
								},
							},
						},
					},
				}),
		],
		afterRender: (draw: TerraDraw) => {
			const undoButton = document.createElement("button");
			undoButton.textContent = "Undo";

			const redoButton = document.createElement("button");
			redoButton.textContent = "Redo";

			redoButton.disabled = true;
			undoButton.disabled = true;

			const { undo, redo } = setupUndoRedo(draw, {
				onStackChange: (undoStackSize: number, redoStackSize: number) => {
					console.log("undoSize", undoStackSize, "redoSize", redoStackSize);
					undoButton.disabled = undoStackSize === 0;
					redoButton.disabled = redoStackSize === 0;
				},
			});

			const element = document.querySelector('[data-testid="container"]');

			undoButton.onclick = () => {
				undo();
			};
			redoButton.onclick = () => {
				redo();
			};
			element?.appendChild(undoButton);
			element?.appendChild(redoButton);
		},
		...DefaultStory.args,
	},
};

const SelectWithSelectionPoints: Story = {
	...DefaultStory,
	args: {
		id: "select-with-selection-points",
		modes: [
			() => new TerraDrawPolygonMode(),
			() =>
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								draggable: true,
								coordinates: {},
							},
						},
					},
				}),
		],
		...DefaultStory.args,
	},
};

const SelectWithScaleAndRotate: Story = {
	...DefaultStory,
	args: {
		id: "select-with-scale-and-rotate",
		modes: [
			() => new TerraDrawPolygonMode(),
			() =>
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								rotateable: true,
								scaleable: true,
								coordinates: {},
							},
						},
					},
				}),
		],
		...DefaultStory.args,
	},
};

const SelectWithResizable: Story = {
	...DefaultStory,
	args: {
		id: "select-with-resizable",
		modes: [
			() => new TerraDrawPolygonMode(),
			() =>
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								coordinates: {
									resizable: "opposite-fixed",
								},
							},
						},
					},
				}),
		],
		...DefaultStory.args,
	},
};

const SelectWithMidPoints: Story = {
	...DefaultStory,
	args: {
		id: "select-with-midpoints",
		modes: [
			() => new TerraDrawPolygonMode(),
			() =>
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								draggable: true,
								coordinates: {
									draggable: true,
									midpoints: {
										draggable: true,
									},
								},
							},
						},
					},
				}),
		],
		...DefaultStory.args,
	},
};

const SelectWithMultiSelect: Story = {
	...DefaultStory,
	args: {
		id: "select-with-multiselect",
		modes: [
			() => new TerraDrawPolygonMode(),
			() =>
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								draggable: true,
								coordinates: {},
							},
						},
					},
				}),
		],
		instructions:
			"Draw a few polygons, then hold Shift and click each feature to multi-select. Shift-click a selected feature to deselect it.",
		...DefaultStory.args,
	},
};

const SelectWithMultipleSelectModes: Story = {
	...DefaultStory,
	args: {
		id: "select-with-multiple-select-modes",
		modes: [
			() => new TerraDrawPolygonMode(),
			() =>
				new TerraDrawSelectMode({
					styles: {
						selectionPointColor: "#0000ff",
						midPointColor: "#00ffff",
					},
					flags: {
						polygon: {
							feature: {
								draggable: true,
								coordinates: {
									draggable: true,
									midpoints: {
										draggable: true,
									},
								},
							},
						},
					},
				}),
			() =>
				new TerraDrawSelectMode({
					modeName: "alternate-select",
					styles: {
						selectionPointColor: "#ff00ff",
						midPointColor: "#ffff00",
					},
					flags: {
						polygon: {
							feature: {
								draggable: true,
								coordinates: {
									draggable: true,
								},
							},
						},
					},
				}),
		],
		...DefaultStory.args,
	},
};

// Programmatic update geometry story
const ProgrammaticUpdate: Story = {
	...DefaultStory,
	args: {
		id: "programmatic-update",
		modes: [() => new TerraDrawPolygonMode()],
		showButtons: false,
		instructions:
			"After 2 seconds, the pre-added polygon will be updated to a new geometry in the same space.",
		afterRender: (draw: TerraDraw) => {
			const [{ id }] = draw.addFeatures([
				{
					type: "Feature",
					properties: {
						mode: "polygon",
					},
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-74.006, 40.7128],
								[-73.996, 40.7128],
								[-73.996, 40.7228],
								[-74.006, 40.7228],
								[-74.006, 40.7128],
							],
						],
					},
				},
			]);

			setTimeout(() => {
				draw.updateFeatureGeometry(id!, {
					type: "Polygon",
					coordinates: [
						// Update to a new polygon in the same space
						[
							[-74.006, 40.7128],
							[-73.996, 40.7128],
							[-73.996, 40.7228],
							[-74.036, 40.7228],
							[-74.006, 40.7128],
						],
					],
				});
			}, 2000);
		},
		...DefaultStory.args,
	},
};

// Programmatic scale story
const ProgrammaticScale: Story = {
	...DefaultStory,
	args: {
		id: "programmatic-scale",
		modes: [() => new TerraDrawPolygonMode()],
		showButtons: false,
		instructions:
			"After 2 seconds, the pre-added polygon will be updated to a scaled geometry in the same space.",
		afterRender: (draw: TerraDraw) => {
			const [{ id }] = draw.addFeatures([
				{
					type: "Feature",
					properties: {
						mode: "polygon",
					},
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-74.006, 40.7128],
								[-73.996, 40.7128],
								[-73.996, 40.7228],
								[-74.006, 40.7228],
								[-74.006, 40.7128],
							],
						],
					},
				},
			]);

			setTimeout(() => {
				draw.transformFeatureGeometry(id!, {
					projection: "web-mercator",
					origin: [LocationNewYork.centerLng, LocationNewYork.centerLat],
					type: "scale",
					options: {
						xScale: 2,
						yScale: 2,
					},
				});
			}, 2000);
		},
		...DefaultStory.args,
	},
};

// Programmatic scale story
const ProgrammaticRotate: Story = {
	...DefaultStory,
	args: {
		id: "programmatic-rotate",
		modes: [() => new TerraDrawPolygonMode()],
		showButtons: false,
		instructions:
			"After 2 seconds, the pre-added polygon will be updated to a rotated geometry in the same space.",
		afterRender: (draw: TerraDraw) => {
			const [{ id }] = draw.addFeatures([
				{
					type: "Feature",
					properties: {
						mode: "polygon",
					},
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[-74.006, 40.7128],
								[-73.996, 40.7128],
								[-73.996, 40.7228],
								[-74.006, 40.7228],
								[-74.006, 40.7128],
							],
						],
					},
				},
			]);

			setTimeout(() => {
				draw.transformFeatureGeometry(id!, {
					projection: "web-mercator",
					origin: [LocationNewYork.centerLng, LocationNewYork.centerLat],
					type: "rotate",
					options: {
						angle: 45,
					},
				});
			}, 2000);
		},
		...DefaultStory.args,
	},
};

const SelectWithMultipleOfSameModes: Story = {
	...DefaultStory,
	args: {
		id: "select-with-multiple-of-same-modes",
		modes: [
			() => new TerraDrawPolygonMode(),
			() => new TerraDrawPolygonMode({ modeName: "polygon2" }),
			() =>
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								draggable: true,
							},
						},
						polygon2: {
							feature: {
								draggable: true,
								coordinates: {
									midpoints: true,
									draggable: true,
								},
							},
						},
					},
				}),
		],
		...DefaultStory.args,
	},
};

const AllStories = {
	Point,
	MarkerPNG,
	MarkerJPG,
	Opacity,
	Polygon,
	PolygonWithCoordinatePoints,
	PolygonWithCoordinateSnapping,
	PolygonWithLineSnapping,
	PolygonWithEditableEnabled,
	PolygonWithCoordinateCounts,
	Styling,
	ZIndexOrdering,
	Circle,
	CircleWithClickDragInteraction,
	CircleWithClickMoveOrDragInteraction,
	Rectangle,
	RectangleWithClickDragInteraction,
	RectangleWithClickMoveOrDragInteraction,
	AngledRectangle,
	Sector,
	LineString,
	LineStringFinishOnNthCoordinate,
	LineStringWithCoordinatePoints,
	LineStringEditable,
	LineStringWithCoordinateSnapping,
	LineStringWithLineSnapping,
	FreehandLineString,
	Freehand,
	FreehandWithAutoClose,
	FreehandWithSmoothing,
	Sensor,
	ProgrammaticScale,
	ProgrammaticRotate,
	ProgrammaticUpdate,
	Select,
	SelectWithSelectionPoints,
	SelectWithScaleAndRotate,
	SelectWithResizable,
	SelectWithMidPoints,
	SelectWithMultiSelect,
	SelectWithMultipleOfSameModes,
	SelectWithMultipleSelectModes,
};

export { AllStories };
