import { Feature, LineString, Position } from "geojson";
import { JSONObject } from "../../store/store";
import { limitPrecision } from "../limit-decimal-precision";

// Based on - https://github.com/springmeyer/arc.js
// MIT License - Copyright (c) 2019, Dane Springmeyer

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

interface Coord {
	readonly lng: number;
	readonly lat: number;
	readonly x: number;
	readonly y: number;
}

class ArcLineString {
	constructor(coordinatePrecision: number) {
		this.coordinatePrecision = coordinatePrecision;
		this.coords = [];
		this.length = 0;
	}

	private coordinatePrecision: number;
	public coords: [number, number][];
	public length: number;

	moveTo(coord: [number, number]) {
		this.length++;
		this.coords.push([
			limitPrecision(coord[0], this.coordinatePrecision),
			limitPrecision(coord[1], this.coordinatePrecision),
		]);
	}
}

class Arc<Properties extends JSONObject> {
	constructor({ properties }: { properties: Properties }) {
		this.properties = properties || {};
		this.geometries = [];
	}

	public geometries: ArcLineString[];
	public properties: Properties;

	toJSON(): Feature<LineString> | null {
		if (this.geometries.length === 1) {
			const coords = this.geometries[0].coords;

			// TODO: Sometimes coords are NaN?
			if (
				coords[0][0] &&
				!isNaN(coords[0][0]) &&
				coords[0][1] &&
				!isNaN(coords[0][1])
			) {
				return {
					geometry: { type: "LineString", coordinates: coords },
					type: "Feature",
					properties: this.properties,
				};
			}
		}

		// TODO: this.geometries.length can return 0 and also > 1. Do we need to handle this?
		return null;
	}
}

class GreatCircleLine<Properties extends JSONObject> {
	constructor(start: Position, end: Position, properties?: Properties) {
		if (!start || start[0] === undefined || start[1] === undefined) {
			throw new Error(
				"GreatCircle constructor expects two args: start and end objects with x and y properties",
			);
		}
		if (!end || end[0] === undefined || end[1] === undefined) {
			throw new Error(
				"GreatCircle constructor expects two args: start and end objects with x and y properties",
			);
		}
		this.start = {
			lng: start[0],
			lat: start[1],
			x: D2R * start[0],
			y: D2R * start[1],
		};

		this.end = {
			lng: end[0],
			lat: end[1],
			x: D2R * end[0],
			y: D2R * end[1],
		};

		this.properties = properties || ({} as Properties);

		const w = this.start.x - this.end.x;
		const h = this.start.y - this.end.y;
		const z =
			Math.pow(Math.sin(h / 2.0), 2) +
			Math.cos(this.start.y) *
				Math.cos(this.end.y) *
				Math.pow(Math.sin(w / 2.0), 2);
		this.g = 2.0 * Math.asin(Math.sqrt(z));

		if (this.g === Math.PI) {
			throw new Error(
				`it appears ${start} and ${end} are 'antipodal', e.g diametrically opposite, thus there is no single route but rather infinite`,
			);
		} else if (isNaN(this.g)) {
			throw new Error(
				`could not calculate great circle between ${start} and ${end}`,
			);
		}
	}

	private g: number;
	private start: Coord;
	private end: Coord;
	private properties: Properties;

	/*
	 * http://williams.best.vwh.net/avform.htm#Intermediate
	 */
	interpolate(f: number) {
		const A = Math.sin((1 - f) * this.g) / Math.sin(this.g);
		const B = Math.sin(f * this.g) / Math.sin(this.g);
		const x =
			A * Math.cos(this.start.y) * Math.cos(this.start.x) +
			B * Math.cos(this.end.y) * Math.cos(this.end.x);
		const y =
			A * Math.cos(this.start.y) * Math.sin(this.start.x) +
			B * Math.cos(this.end.y) * Math.sin(this.end.x);
		const z = A * Math.sin(this.start.y) + B * Math.sin(this.end.y);
		const lat = R2D * Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
		const lon = R2D * Math.atan2(y, x);
		return [lon, lat];
	}

	/*
	 * Generate points along the great circle
	 */
	arc(
		numberOfPoints: number,
		options: { offset: number; coordinatePrecision: number },
	) {
		const firstPass = [];
		if (!numberOfPoints || numberOfPoints <= 2) {
			firstPass.push([this.start.lng, this.start.lat]);
			firstPass.push([this.end.lng, this.end.lat]);
		} else {
			const delta = 1.0 / (numberOfPoints - 1);
			for (let i = 0; i < numberOfPoints; ++i) {
				const step = delta * i;
				const pair = this.interpolate(step);
				firstPass.push(pair);
			}
		}
		/* partial port of dateline handling from:
            gdal/ogr/ogrgeometryfactory.cpp
    
            TODO - does not handle all wrapping scenarios yet
        */
		let bHasBigDiff = false;
		let dfMaxSmallDiffLong = 0;
		// from http://www.gdal.org/ogr2ogr.html
		// -datelineoffset:
		// (starting with GDAL 1.10) offset from dateline in degrees (default long. = +/- 10deg, geometries within 170deg to -170deg will be splited)
		const dfDateLineOffset = options && options.offset ? options.offset : 10;
		const dfLeftBorderX = 180 - dfDateLineOffset;
		const dfRightBorderX = -180 + dfDateLineOffset;
		const dfDiffSpace = 360 - dfDateLineOffset;

		// https://github.com/OSGeo/gdal/blob/7bfb9c452a59aac958bff0c8386b891edf8154ca/gdal/ogr/ogrgeometryfactory.cpp#L2342
		for (let j = 1; j < firstPass.length; ++j) {
			const dfPrevX = firstPass[j - 1][0];
			const dfX = firstPass[j][0];
			const dfDiffLong = Math.abs(dfX - dfPrevX);
			if (
				dfDiffLong > dfDiffSpace &&
				((dfX > dfLeftBorderX && dfPrevX < dfRightBorderX) ||
					(dfPrevX > dfLeftBorderX && dfX < dfRightBorderX))
			) {
				bHasBigDiff = true;
			} else if (dfDiffLong > dfMaxSmallDiffLong) {
				dfMaxSmallDiffLong = dfDiffLong;
			}
		}

		const poMulti = [];
		if (bHasBigDiff && dfMaxSmallDiffLong < dfDateLineOffset) {
			let poNewLS: [number, number][] = [];
			poMulti.push(poNewLS);

			for (let k = 0; k < firstPass.length; ++k) {
				const dfX0 = firstPass[k][0];
				if (k > 0 && Math.abs(dfX0 - firstPass[k - 1][0]) > dfDiffSpace) {
					let dfX1 = firstPass[k - 1][0];
					let dfY1 = firstPass[k - 1][1];
					let dfX2 = firstPass[k][0];
					let dfY2 = firstPass[k][1];
					if (
						dfX1 > -180 &&
						dfX1 < dfRightBorderX &&
						dfX2 === 180 &&
						k + 1 < firstPass.length &&
						firstPass[k - 1][0] > -180 &&
						firstPass[k - 1][0] < dfRightBorderX
					) {
						poNewLS.push([-180, firstPass[k][1]]);
						k++;
						poNewLS.push([firstPass[k][0], firstPass[k][1]]);
						continue;
					} else if (
						dfX1 > dfLeftBorderX &&
						dfX1 < 180 &&
						dfX2 === -180 &&
						k + 1 < firstPass.length &&
						firstPass[k - 1][0] > dfLeftBorderX &&
						firstPass[k - 1][0] < 180
					) {
						poNewLS.push([180, firstPass[k][1]]);
						k++;
						poNewLS.push([firstPass[k][0], firstPass[k][1]]);
						continue;
					}

					if (dfX1 < dfRightBorderX && dfX2 > dfLeftBorderX) {
						// swap dfX1, dfX2
						const tmpX = dfX1;
						dfX1 = dfX2;
						dfX2 = tmpX;

						// swap dfY1, dfY2
						const tmpY = dfY1;
						dfY1 = dfY2;
						dfY2 = tmpY;
					}
					if (dfX1 > dfLeftBorderX && dfX2 < dfRightBorderX) {
						dfX2 += 360;
					}

					if (dfX1 <= 180 && dfX2 >= 180 && dfX1 < dfX2) {
						const dfRatio = (180 - dfX1) / (dfX2 - dfX1);
						const dfY = dfRatio * dfY2 + (1 - dfRatio) * dfY1;
						poNewLS.push([
							firstPass[k - 1][0] > dfLeftBorderX ? 180 : -180,
							dfY,
						]);
						poNewLS = [];
						poNewLS.push([
							firstPass[k - 1][0] > dfLeftBorderX ? -180 : 180,
							dfY,
						]);
						poMulti.push(poNewLS);
					} else {
						poNewLS = [];
						poMulti.push(poNewLS);
					}
					poNewLS.push([dfX0, firstPass[k][1]]);
				} else {
					poNewLS.push([firstPass[k][0], firstPass[k][1]]);
				}
			}
		} else {
			// add normally
			const poNewLS0: [number, number][] = [];
			poMulti.push(poNewLS0);
			for (let l = 0; l < firstPass.length; ++l) {
				poNewLS0.push([firstPass[l][0], firstPass[l][1]]);
			}
		}

		const arc = new Arc({ properties: this.properties });
		for (let m = 0; m < poMulti.length; ++m) {
			const line = new ArcLineString(options.coordinatePrecision);
			arc.geometries.push(line);
			const points = poMulti[m];
			for (let j0 = 0; j0 < points.length; ++j0) {
				line.moveTo(points[j0]);
			}
		}
		return arc;
	}
}

export function greatCircleLine<Properties extends JSONObject>({
	start,
	end,
	options,
}: {
	start: Position;
	end: Position;
	options?: {
		numberOfPoints?: number;
		offset?: number;
		properties?: Properties;
		coordinatePrecision?: number;
	};
}) {
	const opts = options || {};
	if (typeof opts !== "object") {
		throw new Error("options argument is invalid, must be of type object");
	}

	const {
		properties = {},
		numberOfPoints = 100,
		offset = 10,
		coordinatePrecision = 9,
	} = opts;
	const circle = new GreatCircleLine(start, end, properties);
	const line = circle.arc(numberOfPoints, {
		offset: offset,
		coordinatePrecision,
	});

	return line.toJSON();
}
