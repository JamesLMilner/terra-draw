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
} from "../../../terra-draw/src/terra-draw";
import { DefaultSize, LocationNewYork, DefaultZoom, Story } from "./config";

// Point drawing only story
const Point: Story = {
	args: {
		id: "point",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawPointMode()],
	},
};

// Polygon drawing story
const Polygon: Story = {
	args: {
		id: "polygon",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawPolygonMode()],
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
};

// Circle drawing story
const Circle: Story = {
	args: {
		id: "circle",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawCircleMode()],
	},
};

// Rectangle drawing story
const Rectangle: Story = {
	args: {
		id: "rectangle",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawRectangleMode()],
	},
};

// Angled rectangle drawing story
const AngledRectangle: Story = {
	args: {
		id: "angled-rectangle",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawAngledRectangleMode()],
	},
};

// Sector drawing story
const Sector: Story = {
	args: {
		id: "sector",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawSectorMode()],
	},
};

// Linestring drawing story
const LineString: Story = {
	args: {
		id: "linestring",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawLineStringMode()],
	},
};

// Linestring drawing story
const LineStringEditable: Story = {
	args: {
		id: "linestring-editable",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [
			() =>
				new TerraDrawLineStringMode({
					editable: true,
				}),
		],
	},
};

// Linestring with coordinate snapping  story
const LineStringWithCoordinateSnapping: Story = {
	args: {
		id: "linestring-coordinate-snapping",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [
			() =>
				new TerraDrawLineStringMode({
					snapping: {
						toCoordinate: true,
					},
				}),
		],
	},
};

// Linestring with linestring snapping  story
const LineStringWithLineSnapping: Story = {
	args: {
		id: "linestring-line-snapping",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [
			() =>
				new TerraDrawLineStringMode({
					snapping: {
						toLine: true,
					},
				}),
		],
	},
};

// Freehand linestring drawing story
const FreehandLineString: Story = {
	args: {
		id: "freehand-linestring",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawFreehandLineStringMode()],
	},
};

// Freehand drawing story
const Freehand: Story = {
	args: {
		id: "freehand",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawFreehandMode()],
	},
};

// Freehand autoclose drawing story
const FreehandWithAutoClose: Story = {
	args: {
		id: "freehand-autoclose",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [
			() =>
				new TerraDrawFreehandMode({
					autoClose: true,
				}),
		],
	},
};

// Sensor drawing story
const Sensor: Story = {
	args: {
		id: "sensor",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawSensorMode()],
	},
};

// Programmatic update geometry story
const ProgrammaticUpdate: Story = {
	args: {
		id: "programmatic-update",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
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
	},
};

// Programmatic scale story
const ProgrammaticScale: Story = {
	args: {
		id: "programmatic-scale",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
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
	},
};

// Programmatic scale story
const ProgrammaticRotate: Story = {
	args: {
		id: "programmatic-rotate",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
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
	},
};

const AllStories = {
	Point,
	Polygon,
	PolygonWithCoordinatePoints,
	PolygonWithCoordinateSnapping,
	PolygonWithLineSnapping,
	PolygonWithEditableEnabled,
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
};

export { AllStories };
