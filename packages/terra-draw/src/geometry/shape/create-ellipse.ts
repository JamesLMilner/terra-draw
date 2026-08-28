import { Feature, Polygon, Position } from "geojson";
import { limitPrecision } from "../limit-decimal-precision";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../project/web-mercator";
import { destination } from "../measure/destination";

function ellipseRadius(
	xRadiusKilometers: number,
	yRadiusKilometers: number,
	angle: number,
): number {
	xRadiusKilometers = Math.max(xRadiusKilometers, Number.EPSILON);
	yRadiusKilometers = Math.max(yRadiusKilometers, Number.EPSILON);
	return (
		(xRadiusKilometers * yRadiusKilometers) /
		Math.sqrt(
			yRadiusKilometers ** 2 * Math.sin(angle) ** 2 +
				xRadiusKilometers ** 2 * Math.cos(angle) ** 2,
		)
	);
}

export function ellipse(options: {
	center: Position;
	xRadiusKilometers: number;
	yRadiusKilometers: number;
	coordinatePrecision: number;
	steps?: number;
}): Feature<Polygon> {
	const { center, xRadiusKilometers, yRadiusKilometers, coordinatePrecision } =
		options;
	const steps = options.steps ?? 64;
	const coordinates: Position[] = [];

	for (let i = 0; i < steps; i++) {
		const angle = (i * 2 * Math.PI) / steps;
		const coordinate = destination(
			center,
			ellipseRadius(xRadiusKilometers, yRadiusKilometers, angle),
			(i * 360) / steps,
		);
		coordinates.push([
			limitPrecision(coordinate[0], coordinatePrecision),
			limitPrecision(coordinate[1], coordinatePrecision),
		]);
	}

	coordinates.push(coordinates[0]);
	return {
		type: "Feature",
		geometry: { type: "Polygon", coordinates: [coordinates] },
		properties: {},
	};
}

export function ellipseWebMercator(options: {
	center: Position;
	xRadiusKilometers: number;
	yRadiusKilometers: number;
	coordinatePrecision: number;
	steps?: number;
}): Feature<Polygon> {
	const { center, xRadiusKilometers, yRadiusKilometers, coordinatePrecision } =
		options;
	const steps = options.steps ?? 64;
	const radiusX = xRadiusKilometers * 1000;
	const radiusY = yRadiusKilometers * 1000;
	const { x, y } = lngLatToWebMercatorXY(center[0], center[1]);
	const coordinates: Position[] = [];

	for (let i = 0; i < steps; i++) {
		const angle = (i * 2 * Math.PI) / steps;
		const coordinate = webMercatorXYToLngLat(
			x + radiusX * Math.cos(angle),
			y + radiusY * Math.sin(angle),
		);
		coordinates.push([
			limitPrecision(coordinate.lng, coordinatePrecision),
			limitPrecision(coordinate.lat, coordinatePrecision),
		]);
	}

	coordinates.push(coordinates[0]);
	return {
		type: "Feature",
		geometry: { type: "Polygon", coordinates: [coordinates] },
		properties: {},
	};
}
