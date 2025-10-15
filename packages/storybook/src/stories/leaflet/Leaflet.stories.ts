import { AllStories } from "../../common/stories";
import { DefaultMeta } from "../../common/meta";
import { SetupLeaflet } from "./setup";

const meta = {
	...DefaultMeta,
	title: "Terra Draw/Leaflet",
	tags: ["leaflet"],
	render: SetupLeaflet,
};

export default meta;

// Ensure the names are set correctly for the stories
export const Point = AllStories.Point;
export const MarkerPNG = AllStories.MarkerPNG;
export const MarkerJPG = AllStories.MarkerJPG;
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
