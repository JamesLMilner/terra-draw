import { Position } from "geojson";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../project/web-mercator";

export function transformScaleWebMercatorCoordinates({
	coordinates,
	originX,
	originY,
	xScale,
	yScale,
}: {
	coordinates: Position[];
	originX: number;
	originY: number;
	xScale: number;
	yScale: number;
}): void {
	if (xScale === 1 && yScale === 1) {
		// No scaling needed, return early
		return;
	}

	coordinates.forEach((coordinate) => {
		const { x, y } = lngLatToWebMercatorXY(coordinate[0], coordinate[1]);

		const updatedX = originX + (x - originX) * xScale;
		const updatedY = originY + (y - originY) * yScale;

		const { lng, lat } = webMercatorXYToLngLat(updatedX, updatedY);

		coordinate[0] = lng;
		coordinate[1] = lat;
	});
}
