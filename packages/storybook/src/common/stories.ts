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
};

export { AllStories };
