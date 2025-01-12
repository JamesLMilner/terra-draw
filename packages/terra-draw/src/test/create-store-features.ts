import { Position } from "geojson";
import { SELECT_PROPERTIES } from "../common";
import { BehaviorConfig } from "../modes/base.behavior";

export const createStoreMidPoint = (
	config: BehaviorConfig,
	coordinates: Position = [0, 0],
) => {
	const [createdId] = config.store.create([
		{
			geometry: {
				type: "Point",
				coordinates,
			},
			properties: {
				[SELECT_PROPERTIES.MID_POINT]: true,
			},
		},
	]);

	return createdId;
};

export const createStorePoint = (
	config: BehaviorConfig,
	coordinates: Position = [0, 0],
	selected = true,
) => {
	const [createdId] = config.store.create([
		{
			geometry: {
				type: "Point",
				coordinates,
			},
			properties: {
				selected,
			},
		},
	]);

	return createdId;
};

export const createStorePolygon = (
	config: BehaviorConfig,
	coordinates: Position[][] = [
		[
			[0, 0],
			[0, 1],
			[1, 1],
			[1, 0],
			[0, 0],
		],
	],
	selected = true,
	mode = "test",
) => {
	const [createdId] = config.store.create([
		{
			geometry: {
				type: "Polygon",
				coordinates,
			},
			properties: {
				selected,
				mode,
			},
		},
	]);

	return createdId;
};

export const createStoreLineString = (
	config: BehaviorConfig,
	coordinates: Position[] = [
		[0, 0],
		[0, 1],
	],
	selected = true,
) => {
	const [createdId] = config.store.create([
		{
			geometry: {
				type: "LineString",
				coordinates,
			},
			properties: {
				selected,
			},
		},
	]);

	return createdId;
};
