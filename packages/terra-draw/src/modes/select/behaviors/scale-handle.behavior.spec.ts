import { Point } from "geojson";
import { SELECT_PROPERTIES } from "../../../common";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MockCursorEvent } from "../../../test/mock-cursor-event";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { PixelDistanceBehavior } from "../../pixel-distance.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import { BoundingBoxBehavior } from "./bounding-box.behavior";
import { ScaleHandleBehavior } from "./scale-handle.behavior";

describe("ScaleHandleBehavior", () => {
	const setup = () => {
		const config = MockBehaviorConfig("test");
		const readFeature = new ReadFeatureBehavior(config);
		const mutateFeature = new MutateFeatureBehavior(config, {
			validate: undefined,
		});
		const boundingBox = new BoundingBoxBehavior(
			config,
			readFeature,
			mutateFeature,
		);
		const scaleHandles = new ScaleHandleBehavior(
			config,
			boundingBox,
			readFeature,
			mutateFeature,
			new PixelDistanceBehavior(config),
		);
		return { config, boundingBox, scaleHandles };
	};

	const square = [
		[
			[0, 0],
			[10, 0],
			[10, 10],
			[0, 10],
			[0, 0],
		],
	];

	const createBoxAndHandles = () => {
		const s = setup();
		s.boundingBox.create({
			featureId: "feature-1",
			featureCoordinates: square,
		});
		s.scaleHandles.create({ featureId: "feature-1" });
		return s;
	};

	it("constructs with no handles", () => {
		const { scaleHandles } = setup();
		expect(scaleHandles.hasHandles()).toBe(false);
		expect(
			scaleHandles.getNearestScaleHandle(MockCursorEvent({ lng: 0, lat: 0 })),
		).toBeUndefined();
	});

	it("creates 4 handles at the box corners, tagged with index", () => {
		const { config, scaleHandles } = createBoxAndHandles();
		expect(scaleHandles.hasHandles()).toBe(true);

		const handles = config.store
			.copyAll()
			.filter(
				(f) => f.properties[SELECT_PROPERTIES.SCALE_HANDLE] === "feature-1",
			);
		expect(handles).toHaveLength(4);

		const byIndex = new Map(
			handles.map((h) => [
				h.properties[SELECT_PROPERTIES.SCALE_HANDLE_INDEX] as number,
				(h.geometry as Point).coordinates,
			]),
		);
		expect(byIndex.get(0)).toEqual([0, 0]); // SW
		expect(byIndex.get(1)).toEqual([10, 0]); // SE
		expect(byIndex.get(2)).toEqual([10, 10]); // NE
		expect(byIndex.get(3)).toEqual([0, 10]); // NW
	});

	it("does nothing on create when there is no bounding box", () => {
		const { scaleHandles } = setup();
		scaleHandles.create({ featureId: "feature-1" });
		expect(scaleHandles.hasHandles()).toBe(false);
	});

	it("repositions handles in updateInPlace after the box changes", () => {
		const { config, boundingBox, scaleHandles } = createBoxAndHandles();
		boundingBox.updateInPlace({
			featureCoordinates: [
				[
					[2, 2],
					[6, 2],
					[6, 6],
					[2, 6],
					[2, 2],
				],
			],
		});
		scaleHandles.updateInPlace();

		const byIndex = new Map(
			config.store
				.copyAll()
				.filter((f) => f.properties[SELECT_PROPERTIES.SCALE_HANDLE])
				.map((h) => [
					h.properties[SELECT_PROPERTIES.SCALE_HANDLE_INDEX] as number,
					(h.geometry as Point).coordinates,
				]),
		);
		expect(byIndex.get(0)).toEqual([2, 2]);
		expect(byIndex.get(2)).toEqual([6, 6]);
	});

	it("returns the nearest handle within the pixel threshold", () => {
		const { scaleHandles } = createBoxAndHandles();
		const hit = scaleHandles.getNearestScaleHandle(
			MockCursorEvent({ lng: 10, lat: 10 }),
		);
		expect(hit).toBeDefined();
		expect(hit!.index).toBe(2); // NE corner
	});

	it("returns undefined when no handle is within the threshold", () => {
		const { scaleHandles } = createBoxAndHandles();
		const hit = scaleHandles.getNearestScaleHandle(
			MockCursorEvent({ lng: 5, lat: 5 }),
		);
		expect(hit).toBeUndefined();
	});

	it("destroys all handles", () => {
		const { config, scaleHandles } = createBoxAndHandles();
		scaleHandles.destroy();
		expect(scaleHandles.hasHandles()).toBe(false);
		const remaining = config.store
			.copyAll()
			.filter((f) => f.properties[SELECT_PROPERTIES.SCALE_HANDLE]);
		expect(remaining).toHaveLength(0);
	});
});
