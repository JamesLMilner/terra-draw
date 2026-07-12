import { Feature } from "geojson";
import { Snappable, TerraDrawMouseEvent } from "../common";
import { CoordinateSnappingBehavior } from "./coordinate-snapping.behavior";
import { FeatureSnappingBehavior } from "./feature-snapping.behavior";
import { LineSnappingBehavior } from "./line-snapping.behavior";

const event: TerraDrawMouseEvent = {
	lng: 0,
	lat: 0,
	containerX: 0,
	containerY: 0,
	button: "left",
	heldKeys: [],
	isContextMenu: false,
};

const emptySnappable: Snappable = {
	coordinate: undefined,
	featureId: undefined,
	featureCoordinateIndex: undefined,
	minDistance: Infinity,
};

describe("FeatureSnappingBehavior", () => {
	describe("constructor", () => {
		it("constructs", () => {
			const coordinateGetSnappable = jest.fn<
				Snappable,
				[TerraDrawMouseEvent, ((feature: Feature) => boolean) | undefined]
			>();
			const lineGetSnappable = jest.fn<
				Snappable,
				[TerraDrawMouseEvent, ((feature: Feature) => boolean) | undefined]
			>();

			const behavior = new FeatureSnappingBehavior(
				{
					getSnappable: coordinateGetSnappable,
				} as unknown as CoordinateSnappingBehavior,
				{
					getSnappable: lineGetSnappable,
				} as unknown as LineSnappingBehavior,
			);

			expect(behavior).toBeInstanceOf(FeatureSnappingBehavior);
		});
	});

	describe("api", () => {
		let behavior: FeatureSnappingBehavior;
		let coordinateGetSnappable: jest.Mock<
			Snappable,
			[TerraDrawMouseEvent, ((feature: Feature) => boolean) | undefined]
		>;
		let lineGetSnappable: jest.Mock<
			Snappable,
			[TerraDrawMouseEvent, ((feature: Feature) => boolean) | undefined]
		>;

		beforeEach(() => {
			coordinateGetSnappable = jest.fn<
				Snappable,
				[TerraDrawMouseEvent, ((feature: Feature) => boolean) | undefined]
			>();
			lineGetSnappable = jest.fn<
				Snappable,
				[TerraDrawMouseEvent, ((feature: Feature) => boolean) | undefined]
			>();

			behavior = new FeatureSnappingBehavior(
				{
					getSnappable: coordinateGetSnappable,
				} as unknown as CoordinateSnappingBehavior,
				{
					getSnappable: lineGetSnappable,
				} as unknown as LineSnappingBehavior,
			);
		});

		it("uses both coordinate and line snapping by default and returns the nearest", () => {
			coordinateGetSnappable.mockReturnValue({
				coordinate: [10, 10],
				featureId: "coordinate-feature",
				featureCoordinateIndex: 3,
				minDistance: 10,
			});
			lineGetSnappable.mockReturnValue({
				coordinate: [1, 1],
				featureId: "line-feature",
				featureCoordinateIndex: 0,
				minDistance: 2,
			});

			const snapped = behavior.getSnappable(event);

			expect(coordinateGetSnappable).toHaveBeenCalledTimes(1);
			expect(lineGetSnappable).toHaveBeenCalledTimes(1);
			expect(snapped).toEqual({
				coordinate: [1, 1],
				featureId: "line-feature",
				featureCoordinateIndex: 0,
				minDistance: 2,
			});
		});

		it("respects toCoordinate=false and only evaluates line snapping", () => {
			lineGetSnappable.mockReturnValue({
				coordinate: [2, 2],
				featureId: "line-feature",
				featureCoordinateIndex: 1,
				minDistance: 4,
			});

			const snapped = behavior.getSnappable(event, undefined, undefined, {
				toCoordinate: false,
				toLine: true,
			});

			expect(coordinateGetSnappable).not.toHaveBeenCalled();
			expect(lineGetSnappable).toHaveBeenCalledTimes(1);
			expect(snapped.coordinate).toEqual([2, 2]);
		});

		it("respects toLine=false and only evaluates coordinate snapping", () => {
			coordinateGetSnappable.mockReturnValue({
				coordinate: [3, 3],
				featureId: "coordinate-feature",
				featureCoordinateIndex: 4,
				minDistance: 5,
			});

			const snapped = behavior.getSnappable(event, undefined, undefined, {
				toCoordinate: true,
				toLine: false,
			});

			expect(coordinateGetSnappable).toHaveBeenCalledTimes(1);
			expect(lineGetSnappable).not.toHaveBeenCalled();
			expect(snapped.coordinate).toEqual([3, 3]);
		});

		it("excludes current feature id before applying custom filter", () => {
			const customFilter = jest.fn(
				(feature: Feature) => feature.id === "keep-me",
			);

			coordinateGetSnappable.mockImplementation((_event, passedFilter) => {
				expect(passedFilter).toBeDefined();
				const filter = passedFilter!;

				expect(
					filter({
						id: "current-id",
						type: "Feature",
						geometry: { type: "Point", coordinates: [0, 0] },
						properties: {},
					}),
				).toBe(false);
				expect(customFilter).not.toHaveBeenCalled();

				expect(
					filter({
						id: "drop-me",
						type: "Feature",
						geometry: { type: "Point", coordinates: [0, 0] },
						properties: {},
					}),
				).toBe(false);
				expect(customFilter).toHaveBeenCalledWith(
					expect.objectContaining({ id: "drop-me" }),
				);

				expect(
					filter({
						id: "keep-me",
						type: "Feature",
						geometry: { type: "Point", coordinates: [0, 0] },
						properties: {},
					}),
				).toBe(true);

				return emptySnappable;
			});
			lineGetSnappable.mockReturnValue(emptySnappable);

			behavior.getSnappable(event, "current-id", customFilter);
			expect(customFilter).toHaveBeenCalledTimes(2);
		});
	});
});
