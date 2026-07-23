import { Polygon } from "geojson";
import { SELECT_PROPERTIES } from "../../../common";
import { MockBehaviorConfig } from "../../../test/mock-behavior-config";
import { MutateFeatureBehavior } from "../../mutate-feature.behavior";
import { ReadFeatureBehavior } from "../../read-feature.behavior";
import { BoundingBoxBehavior } from "./bounding-box.behavior";

describe("BoundingBoxBehavior", () => {
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
		return { config, boundingBox };
	};

	// A simple triangle whose axis-aligned bbox is [0,0,10,8]
	const triangle = [
		[
			[0, 0],
			[10, 0],
			[4, 8],
			[0, 0],
		],
	];

	it("constructs with no box", () => {
		const { boundingBox } = setup();
		expect(boundingBox.hasBoundingBox()).toBe(false);
		expect(boundingBox.getGeometry()).toBeUndefined();
		expect(boundingBox.getCorners()).toBeUndefined();
		expect(boundingBox.getTopCenter()).toBeUndefined();
	});

	it("creates an axis-aligned box tagged as the bbox guide", () => {
		const { config, boundingBox } = setup();
		const id = boundingBox.create({
			featureId: "feature-1",
			featureCoordinates: triangle,
		});

		expect(boundingBox.hasBoundingBox()).toBe(true);
		const stored = config.store.getGeometryCopy<Polygon>(id);
		expect(stored.coordinates).toEqual([
			[
				[0, 0],
				[10, 0],
				[10, 8],
				[0, 8],
				[0, 0],
			],
		]);
		const props = config.store.getPropertiesCopy(id);
		expect(props[SELECT_PROPERTIES.ROTATION_BBOX_GUIDE]).toBe("feature-1");
	});

	it("exposes corners (SW, SE, NE, NW) and top-center", () => {
		const { boundingBox } = setup();
		boundingBox.create({
			featureId: "feature-1",
			featureCoordinates: triangle,
		});

		expect(boundingBox.getCorners()).toEqual([
			[0, 0],
			[10, 0],
			[10, 8],
			[0, 8],
		]);
		expect(boundingBox.getTopCenter()).toEqual([5, 8]);
	});

	it("recomputes an axis-aligned box in updateInPlace", () => {
		const { boundingBox } = setup();
		boundingBox.create({
			featureId: "feature-1",
			featureCoordinates: triangle,
		});

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

		expect(boundingBox.getCorners()).toEqual([
			[2, 2],
			[6, 2],
			[6, 6],
			[2, 6],
		]);
	});

	it("overwrites geometry with setGeometry (rotated box)", () => {
		const { boundingBox } = setup();
		boundingBox.create({
			featureId: "feature-1",
			featureCoordinates: triangle,
		});

		// A rotated (non-axis-aligned) ring
		const rotated: Polygon["coordinates"] = [
			[
				[1, 0],
				[10, 1],
				[9, 8],
				[0, 7],
				[1, 0],
			],
		];
		boundingBox.setGeometry(rotated);
		expect(boundingBox.getGeometry()?.coordinates).toEqual(rotated);
		// top-center follows the rotated top corners (NE=[9,8], NW=[0,7])
		expect(boundingBox.getTopCenter()).toEqual([4.5, 7.5]);
	});

	it("destroys the box", () => {
		const { config, boundingBox } = setup();
		const id = boundingBox.create({
			featureId: "feature-1",
			featureCoordinates: triangle,
		});
		boundingBox.destroy();
		expect(boundingBox.hasBoundingBox()).toBe(false);
		expect(config.store.has(id)).toBe(false);
	});
});
