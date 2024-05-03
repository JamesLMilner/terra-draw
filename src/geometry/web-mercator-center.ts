import { Feature, LineString, Polygon, Position } from "geojson";
import { lngLatToWebMercatorXY } from "./project/web-mercator";

function bbox(coords: Position[]) {
	const result = [Infinity, Infinity, -Infinity, -Infinity];
	for (let i = 0; i < coords.length; i++) {
		const coord = coords[i];
		if (result[0] > coord[0]) {
			result[0] = coord[0];
		}
		if (result[1] > coord[1]) {
			result[1] = coord[1];
		}
		if (result[2] < coord[0]) {
			result[2] = coord[0];
		}
		if (result[3] < coord[1]) {
			result[3] = coord[1];
		}
	}
	return result;
}

export function webMercatorCenter(feature: Feature<Polygon | LineString>) {
	const coordinates =
		feature.geometry.type === "Polygon"
			? feature.geometry.coordinates[0]
			: feature.geometry.coordinates;

	const webMercatorCoordinates = coordinates.map((coord) => {
		const { x, y } = lngLatToWebMercatorXY(coord[0], coord[1]);
		return [x, y];
	});

	const ext = bbox(webMercatorCoordinates);
	const x = (ext[0] + ext[2]) / 2;
	const y = (ext[1] + ext[3]) / 2;
	return { x, y };
}
