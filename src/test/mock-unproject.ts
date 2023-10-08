import { Feature, LineString, Polygon, Point } from "geojson";
import { createPolygon } from "../util/geoms";

export function mockUnproject(
	unproject: jest.Mock,
	feature: Feature<Polygon> | Feature<LineString> | Feature<Point>,
) {
	if (feature.geometry.type === "Polygon") {
		feature.geometry.coordinates[0].forEach((coordinate) => {
			unproject.mockImplementationOnce(() => ({
				lng: coordinate[0],
				lat: coordinate[1],
			}));
		});
	} else if (feature.geometry.type === "LineString") {
		feature.geometry.coordinates.forEach((coordinate) => {
			unproject.mockImplementationOnce(() => ({
				lng: coordinate[0],
				lat: coordinate[1],
			}));
		});
	} else if (feature.geometry.type === "Point") {
		unproject.mockImplementationOnce(() => ({
			lng: feature.geometry.coordinates[0],
			lat: feature.geometry.coordinates[1],
		}));
	}
}

export function mockBoundingBoxUnproject(
	unproject: jest.Mock,
	bbox: Feature<Polygon> = createPolygon([
		[
			[0, 0],
			[0, 1],
			[1, 1],
			[1, 0],
			[0, 0],
		],
	]),
) {
	return mockUnproject(unproject, bbox);
}
