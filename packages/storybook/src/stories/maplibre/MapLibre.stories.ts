import { AllStories } from "../../common/stories";
import { DefaultMeta } from "../../common/meta";
import { SetupMapLibre } from "./setup";
import { TerraDrawPolygonMode } from "../../../../terra-draw/src/terra-draw";
import {
	Story,
	DefaultSize,
	LocationNewYork,
	DefaultZoom,
	DefaultPlay,
} from "../../common/config";

const meta = {
	...DefaultMeta,
	title: "Terra Draw/MapLibre",
	tags: ["maplibre"],
	render: SetupMapLibre,
};

export default meta;

// Polygon with coordinate points story
export const PolygonWithChangeLayer: Story = {
	args: {
		id: "polygon-layer-change",
		...DefaultSize,
		...LocationNewYork,
		...DefaultZoom,
		modes: [() => new TerraDrawPolygonMode()],
	},
	...DefaultPlay,
};

// Ensure the names are set correctly for the stories
export const Point = AllStories.Point;
export const Marker = AllStories.Marker;
export const Polygon = AllStories.Polygon;
export const PolygonWithCoordinatePoints =
	AllStories.PolygonWithCoordinatePoints;
export const PolygonWithCoordinateSnapping =
	AllStories.PolygonWithCoordinateSnapping;
export const PolygonWithLineSnapping = AllStories.PolygonWithLineSnapping;
export const PolygonWithEditableEnabled = AllStories.PolygonWithEditableEnabled;
export const PolygonWithCoordinateCounts =
	AllStories.PolygonWithCoordinateCounts;
export const ZIndexOrdering = AllStories.ZIndexOrdering;
export const Styling = AllStories.Styling;
export const Circle = AllStories.Circle;
export const Rectangle = AllStories.Rectangle;
export const AngledRectangle = AllStories.AngledRectangle;
export const Sector = AllStories.Sector;
export const LineString = AllStories.LineString;
export const LineStringWithCoordinateSnapping =
	AllStories.LineStringWithCoordinateSnapping;
export const LineStringWithLineSnapping = AllStories.LineStringWithLineSnapping;
export const LineStringEditable = AllStories.LineStringEditable;
export const FreehandLineString = AllStories.FreehandLineString;
export const Freehand = AllStories.Freehand;
export const FreehandWithAutoClose = AllStories.FreehandWithAutoClose;
export const Sensor = AllStories.Sensor;
export const Select = AllStories.Select;
export const SelectWithSelectionPoints = AllStories.SelectWithSelectionPoints;
export const SelectWithMidPoints = AllStories.SelectWithMidPoints;
export const ProgrammaticRotate = AllStories.ProgrammaticRotate;
export const ProgrammaticScale = AllStories.ProgrammaticScale;
export const ProgrammaticUpdate = AllStories.ProgrammaticUpdate;
