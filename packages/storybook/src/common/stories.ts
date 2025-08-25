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
		id: "polygon",
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
					draw.updateFeatureProperty(
						feature.id!,
						"randomColor",
						`#${Math.floor(Math.random() * 16777215).toString(16)}`,
					);
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

// Rectangle drawing story
const Rectangle: Story = {
	...DefaultStory,
	args: {
		id: "rectangle",
		modes: [() => new TerraDrawRectangleMode()],
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

// Sensor drawing story
const Select: Story = {
	...DefaultStory,
	args: {
		id: "select",
		modes: [
			() => new TerraDrawPolygonMode(),
			() =>
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								draggable: true,
							},
						},
					},
				}),
		],
		...DefaultStory.args,
	},
};

const SelectWithSelectionPoints: Story = {
	...DefaultStory,
	args: {
		id: "select",
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

const SelectWithMidPoints: Story = {
	...DefaultStory,
	args: {
		id: "select",
		modes: [
			() => new TerraDrawPolygonMode(),
			() =>
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								draggable: true,
								coordinates: {
									midpoints: true,
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

const AllStories = {
	Point,
	Polygon,
	PolygonWithCoordinatePoints,
	PolygonWithCoordinateSnapping,
	PolygonWithLineSnapping,
	PolygonWithEditableEnabled,
	PolygonWithCoordinateCounts,
	Styling,
	ZIndexOrdering,
	Circle,
	Rectangle,
	AngledRectangle,
	Sector,
	LineString,
	LineStringEditable,
	LineStringWithCoordinateSnapping,
	LineStringWithLineSnapping,
	FreehandLineString,
	Freehand,
	FreehandWithAutoClose,
	Sensor,
	ProgrammaticScale,
	ProgrammaticRotate,
	ProgrammaticUpdate,
	Select,
	SelectWithSelectionPoints,
	SelectWithMidPoints,
};

export { AllStories };
