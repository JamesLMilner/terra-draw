import { LineString, Polygon, Position } from "geojson";
import { CartesianPoint, SnapToDegree, TerraDrawMouseEvent } from "../common";
import { destination } from "../geometry/measure/destination";
import { bearing } from "../geometry/measure/bearing";
import { haversineDistanceKilometers } from "../geometry/measure/haversine-distance";
import {
	lngLatToWebMercatorXY,
	webMercatorXYToLngLat,
} from "../geometry/project/web-mercator";
import { limitPrecision } from "../geometry/limit-decimal-precision";
import { BehaviorConfig, TerraDrawModeBehavior } from "./base.behavior";

export class DegreeSnappingBehavior extends TerraDrawModeBehavior {
	constructor(readonly config: BehaviorConfig) {
		super(config);
	}

	private EPSILON = 1e-9;
	private DEFAULT_DEGREE = 90;

	public getSnappableCoordinate(
		event: TerraDrawMouseEvent,
		geometry: LineString | Polygon,
		currentCoordinate: number,
		options: SnapToDegree = {},
	): Position | undefined {
		if (currentCoordinate < 2) {
			return undefined;
		}

		const coordinates =
			geometry.type === "Polygon"
				? geometry.coordinates[0]
				: geometry.coordinates;
		const previous = coordinates[currentCoordinate - 2];
		const current = coordinates[currentCoordinate - 1];

		if (!previous || !current) {
			return undefined;
		}

		const degree = this.getDegree(options.degree);
		const cursor: Position = [event.lng, event.lat];
		const allowBackTracking = options.backTracking === true;

		let snapped =
			this.projection === "globe"
				? this.snapOnGlobe(previous, current, cursor, degree, allowBackTracking)
				: this.snapOnWebMercator(
						previous,
						current,
						cursor,
						degree,
						allowBackTracking,
					);

		// Once a polygon can be closed, also offer a point whose incoming and
		// closing segments form the configured angle. It only takes over when it
		// is within the normal snapping tolerance of the pointer.
		if (geometry.type === "Polygon" && currentCoordinate >= 3) {
			const closing = this.getClosingCandidate(
				previous,
				current,
				coordinates[0],
				cursor,
				degree,
				allowBackTracking,
			);

			if (
				closing &&
				this.pixelDistance(cursor, closing) < this.pointerDistance
			) {
				snapped = closing;
			}
		}

		return snapped
			? [
					limitPrecision(snapped[0], this.coordinatePrecision),
					limitPrecision(snapped[1], this.coordinatePrecision),
				]
			: undefined;
	}

	private getDegree(degree?: number) {
		return typeof degree === "number" &&
			Number.isFinite(degree) &&
			degree > 0 &&
			degree <= 180 &&
			360 / degree <= 10_000
			? degree
			: this.DEFAULT_DEGREE;
	}

	private offsets(degree: number, allowBackTracking: boolean) {
		const offsets: number[] = [];
		for (let offset = 0; offset < 360 - this.EPSILON; offset += degree) {
			const normalized = ((offset % 360) + 360) % 360;
			if (!allowBackTracking && Math.abs(normalized - 180) < this.EPSILON) {
				continue;
			}
			offsets.push(normalized);
		}
		return offsets;
	}

	private snapOnWebMercator(
		previous: Position,
		current: Position,
		cursor: Position,
		degree: number,
		allowBackTracking: boolean,
	) {
		const start = lngLatToWebMercatorXY(previous[0], previous[1]);
		const end = lngLatToWebMercatorXY(current[0], current[1]);
		const target = lngLatToWebMercatorXY(cursor[0], cursor[1]);
		const candidates = this.projectedCandidates(
			start,
			end,
			target,
			degree,
			allowBackTracking,
		);
		const closest = this.closestPoint(target, candidates);
		if (!closest) return undefined;
		const result = webMercatorXYToLngLat(closest.x, closest.y);
		return [result.lng, result.lat];
	}

	private snapOnGlobe(
		previous: Position,
		current: Position,
		cursor: Position,
		degree: number,
		allowBackTracking: boolean,
	) {
		// The initial bearing from previous to current is not necessarily the
		// bearing on arrival at current. Reverse the bearing from current so the
		// snapping rays start on the segment's actual forward tangent.
		const baseBearing = bearing(current, previous) + 180;
		const cursorBearing = bearing(current, cursor);
		const cursorDistance = haversineDistanceKilometers(current, cursor);
		let closest: Position | undefined;
		let closestDistance = Infinity;

		for (const offset of this.offsets(degree, allowBackTracking)) {
			const candidateBearing = baseBearing + offset;
			const difference = this.angleDifference(cursorBearing, candidateBearing);
			const alongDistance =
				cursorDistance * Math.cos((difference * Math.PI) / 180);
			if (alongDistance <= this.EPSILON) continue;

			const candidate = destination(current, alongDistance, candidateBearing);
			const distanceToCursor = haversineDistanceKilometers(cursor, candidate);
			if (distanceToCursor < closestDistance) {
				closest = candidate;
				closestDistance = distanceToCursor;
			}
		}

		return closest;
	}

	private projectedCandidates(
		start: CartesianPoint,
		end: CartesianPoint,
		target: CartesianPoint,
		degree: number,
		allowBackTracking: boolean,
	) {
		const baseAngle = Math.atan2(end.y - start.y, end.x - start.x);
		const candidates: CartesianPoint[] = [];

		for (const offset of this.offsets(degree, allowBackTracking)) {
			const angle = baseAngle + (offset * Math.PI) / 180;
			const unitX = Math.cos(angle);
			const unitY = Math.sin(angle);
			const distance = (target.x - end.x) * unitX + (target.y - end.y) * unitY;
			if (distance <= this.EPSILON) continue;
			candidates.push({
				x: end.x + distance * unitX,
				y: end.y + distance * unitY,
			});
		}

		return candidates;
	}

	private getClosingCandidate(
		previous: Position,
		current: Position,
		closing: Position,
		cursor: Position,
		degree: number,
		allowBackTracking: boolean,
	) {
		const origin = this.toLocalPoint(current, current);
		const previousPoint = this.toLocalPoint(previous, current);
		const closingPoint = this.toLocalPoint(closing, current);
		const cursorPoint = this.toLocalPoint(cursor, current);
		const baseAngle = Math.atan2(
			origin.y - previousPoint.y,
			origin.x - previousPoint.x,
		);
		const candidates: CartesianPoint[] = [];
		for (const offset of this.offsets(degree, allowBackTracking)) {
			const angle = baseAngle + (offset * Math.PI) / 180;
			const unitX = Math.cos(angle);
			const unitY = Math.sin(angle);
			const dx = closingPoint.x - origin.x;
			const dy = closingPoint.y - origin.y;
			const projection = dx * unitX + dy * unitY;
			const perpendicularSquared = Math.max(
				0,
				dx * dx + dy * dy - projection * projection,
			);
			const cursorProjection = Math.max(
				this.EPSILON,
				(cursorPoint.x - origin.x) * unitX + (cursorPoint.y - origin.y) * unitY,
			);
			const projectedCursor = {
				x: origin.x + cursorProjection * unitX,
				y: origin.y + cursorProjection * unitY,
			};
			const cursorDegree = this.angle(origin, projectedCursor, closingPoint);
			if (cursorDegree === undefined) continue;

			for (const closingDegree of this.closingDegrees(degree, cursorDegree)) {
				const alpha = (closingDegree * Math.PI) / 180;
				const sine = Math.sin(alpha);
				const adjustment =
					(Math.abs(Math.cos(alpha)) / Math.abs(sine)) *
					Math.sqrt(perpendicularSquared);

				for (const distance of [
					projection - adjustment,
					projection + adjustment,
				]) {
					if (distance <= this.EPSILON) continue;
					const candidate = {
						x: origin.x + distance * unitX,
						y: origin.y + distance * unitY,
					};
					if (this.hasAngle(origin, candidate, closingPoint, closingDegree)) {
						candidates.push(candidate);
					}
				}
			}
		}

		const closest = this.closestPoint(cursorPoint, candidates);
		return closest ? this.fromLocalPoint(closest, current) : undefined;
	}

	private closingDegrees(degree: number, targetDegree: number) {
		const maximumMultiple = Math.ceil(180 / degree) - 1;
		if (maximumMultiple < 1) return [];

		const targetMultiple = targetDegree / degree;
		const lower = Math.max(
			1,
			Math.min(maximumMultiple, Math.floor(targetMultiple)),
		);
		const upper = Math.max(
			1,
			Math.min(maximumMultiple, Math.ceil(targetMultiple)),
		);
		return [...new Set([lower * degree, upper * degree])];
	}

	private hasAngle(
		a: CartesianPoint,
		vertex: CartesianPoint,
		b: CartesianPoint,
		degree: number,
	) {
		const angle = this.angle(a, vertex, b);
		return angle !== undefined && Math.abs(angle - degree) < 1e-6;
	}

	private angle(a: CartesianPoint, vertex: CartesianPoint, b: CartesianPoint) {
		const ax = a.x - vertex.x;
		const ay = a.y - vertex.y;
		const bx = b.x - vertex.x;
		const by = b.y - vertex.y;
		const denominator = Math.hypot(ax, ay) * Math.hypot(bx, by);
		if (denominator === 0) return undefined;
		const cosine = Math.max(-1, Math.min(1, (ax * bx + ay * by) / denominator));
		return (Math.acos(cosine) * 180) / Math.PI;
	}

	private toLocalPoint(coordinate: Position, origin: Position): CartesianPoint {
		if (this.projection === "web-mercator") {
			return lngLatToWebMercatorXY(coordinate[0], coordinate[1]);
		}
		const distance = haversineDistanceKilometers(origin, coordinate);
		const angle = (bearing(origin, coordinate) * Math.PI) / 180;
		return {
			x: distance * Math.sin(angle),
			y: distance * Math.cos(angle),
		};
	}

	private fromLocalPoint(point: CartesianPoint, origin: Position): Position {
		if (this.projection === "web-mercator") {
			const result = webMercatorXYToLngLat(point.x, point.y);
			return [result.lng, result.lat];
		}
		return destination(
			origin,
			Math.hypot(point.x, point.y),
			(Math.atan2(point.x, point.y) * 180) / Math.PI,
		);
	}

	private closestPoint(target: CartesianPoint, candidates: CartesianPoint[]) {
		return candidates.reduce<CartesianPoint | undefined>(
			(closest, candidate) => {
				if (!closest) return candidate;
				return this.distance(target, candidate) < this.distance(target, closest)
					? candidate
					: closest;
			},
			undefined,
		);
	}

	private distance(a: CartesianPoint, b: CartesianPoint) {
		return Math.hypot(a.x - b.x, a.y - b.y);
	}

	private pixelDistance(a: Position, b: Position) {
		const projectedA = this.project(a[0], a[1]);
		const projectedB = this.project(b[0], b[1]);
		return this.distance(projectedA, projectedB);
	}

	private angleDifference(a: number, b: number) {
		return ((a - b + 540) % 360) - 180;
	}
}
