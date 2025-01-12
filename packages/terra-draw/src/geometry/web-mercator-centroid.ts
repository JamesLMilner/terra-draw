import { Feature, LineString, Polygon, Position } from "geojson";
import { lngLatToWebMercatorXY } from "./project/web-mercator";
import { CartesianPoint } from "../common";

/**
 * Calculates the centroid of a GeoJSON Polygon or LineString in Web Mercator

 * @param {Feature<Polygon | LineString>} feature - The GeoJSON Feature containing either a Polygon or LineString
 * @returns {{ x: number, y: number }} The centroid of the polygon or line string in Web Mercator coordinates.
 */
export function webMercatorCentroid(feature: Feature<Polygon | LineString>) {
	const coordinates =
		feature.geometry.type === "Polygon"
			? feature.geometry.coordinates[0]
			: feature.geometry.coordinates;

	const webMercatorCoordinates = coordinates.map((coord) => {
		const { x, y } = lngLatToWebMercatorXY(coord[0], coord[1]);
		return [x, y];
	});

	if (feature.geometry.type === "Polygon") {
		return calculatePolygonCentroid(webMercatorCoordinates);
	} else {
		return calculateLineStringMidpoint(webMercatorCoordinates);
	}
}

function calculatePolygonCentroid(
	webMercatorCoordinates: Position[],
): CartesianPoint {
	let area = 0;
	let centroidX = 0;
	let centroidY = 0;

	const n = webMercatorCoordinates.length;

	for (let i = 0; i < n - 1; i++) {
		const [x1, y1] = webMercatorCoordinates[i];
		const [x2, y2] = webMercatorCoordinates[i + 1];

		const crossProduct = x1 * y2 - x2 * y1;
		area += crossProduct;
		centroidX += (x1 + x2) * crossProduct;
		centroidY += (y1 + y2) * crossProduct;
	}

	area /= 2;
	centroidX /= 6 * area;
	centroidY /= 6 * area;

	return { x: centroidX, y: centroidY };
}

function calculateLineStringMidpoint(lineString: Position[]): CartesianPoint {
	const n = lineString.length;
	let totalX = 0;
	let totalY = 0;

	for (let i = 0; i < n; i++) {
		const [x, y] = lineString[i];
		totalX += x;
		totalY += y;
	}

	return { x: totalX / n, y: totalY / n };
}
