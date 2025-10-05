import {
	TerraDraw,
	TerraDrawMouseEvent,
	TerraDrawPolygonMode,
} from "./terra-draw";

import {
	BenchmarkTask,
	createBenchmark,
	createDraw,
	logBenchmarkResults,
	processBenchmarks,
	writeBenchmarkSummary,
} from "./benchmark/setup";

(async () => {
	const DrawAPI: TerraDraw = createDraw();

	const benchmarkName = "Terra Draw API";

	const featureCount = 100;

	const benchmarkTasks: BenchmarkTask[] = [
		{
			name: DrawAPI.getMode.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
			},
			task: ({ draw }) => {
				draw.getMode();
			},
			loopCount: 1000000,
		},
		{
			name: DrawAPI.getModeState.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
			},
			task: ({ draw }) => {
				draw.getModeState();
			},
			loopCount: 1000000,
		},
		{
			name: DrawAPI.addFeatures.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
			},
			task: ({ draw, features }) => {
				draw.addFeatures([features[0]]);
			},
		},
		{
			name: DrawAPI.removeFeatures.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw, randomFeatureId }) => {
				draw.removeFeatures([randomFeatureId]);
			},
		},
		{
			name: DrawAPI.hasFeature.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw, randomFeatureId }) => {
				draw.hasFeature(randomFeatureId);
			},
			loopCount: 1000,
			enabled: true,
		},
		{
			name: DrawAPI.getFeatureId.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw }) => {
				draw.getFeatureId();
			},
			loopCount: 1000,
			enabled: true,
		},
		{
			name: DrawAPI.selectFeature.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features.slice(0, 1));
			},
			task: ({ draw, featureIds }) => {
				draw.selectFeature(featureIds[0]);
			},
			loopCount: 1000,
			enabled: true,
		},
		{
			name: DrawAPI.deselectFeature.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features.slice(0, 1));
				benchmarkProps.draw.selectFeature(benchmarkProps.featureIds[0]);
			},
			task: ({ draw, featureIds }) => {
				draw.deselectFeature(featureIds[0]);
			},
			loopCount: 1000,
			enabled: true,
		},
		{
			name: DrawAPI.clear.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw }) => {
				draw.clear();
			},
			loopCount: 1000,
			enabled: true,
		},
		{
			name: DrawAPI.getSnapshot.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw }) => {
				draw.getSnapshot();
			},
			loopCount: 100,
			enabled: true,
		},
		{
			name: DrawAPI.getSnapshotFeature.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw, randomFeatureId }) => {
				draw.getSnapshotFeature(randomFeatureId);
			},
			loopCount: 1000,
			enabled: true,
		},
		{
			name: DrawAPI.updateModeOptions.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw }) => {
				draw.updateModeOptions<typeof TerraDrawPolygonMode>("polygon", {
					snapping: {
						toCoordinate: true,
						toLine: true,
					},
					pointerDistance: 40,
					editable: true,
					showCoordinatePoints: true,
				});
			},
			enabled: true,
			loopCount: 100,
		},
		{
			name: DrawAPI.updateFeatureProperties.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw, randomFeatureId }) => {
				draw.updateFeatureProperties(randomFeatureId, {
					test: "property",
					anotherProperty: 123,
				});
			},
			enabled: true,
			loopCount: 100,
		},
		{
			name: DrawAPI.updateFeatureGeometry.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw, randomFeatureId }) => {
				draw.updateFeatureGeometry(randomFeatureId, {
					type: "Point",
					coordinates: [0, 0],
				});
			},
			enabled: true,
			loopCount: 100,
		},
		{
			name: DrawAPI.getFeaturesAtLngLat.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw }) => {
				draw.getFeaturesAtLngLat({ lng: 0, lat: 0 });
			},
			enabled: true,
			loopCount: 100,
		},
		{
			name: DrawAPI.getFeaturesAtPointerEvent.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
				benchmarkProps.draw.addFeatures(benchmarkProps.features);
			},
			task: ({ draw }) => {
				draw.getFeaturesAtPointerEvent({
					clientX: 0,
					clientY: 0,
					buttons: 0,
				} as PointerEvent);
			},
			enabled: true,
			loopCount: 100,
		},
		{
			name: DrawAPI.on.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
			},
			task: ({ draw }) => {
				draw.on("change", () => {});
			},
			enabled: true,
			loopCount: 10000,
		},

		// These take too long to run if enabled
		{
			name: DrawAPI.start.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
			},
			task: ({ draw }) => {
				draw.start();
			},
			enabled: false,
		},
		{
			name: DrawAPI.stop.name,
			beforeEach: (benchmarkProps) => {
				benchmarkProps.draw = createDraw();
				benchmarkProps.draw.start();
			},
			task: ({ draw }) => {
				draw.stop();
			},
			enabled: false,
		},
	];

	const bench = createBenchmark(benchmarkName, benchmarkTasks);

	await bench.runSync();

	const results = processBenchmarks(bench, benchmarkTasks);

	if (process.env.CI) {
		writeBenchmarkSummary(results);
	} else {
		logBenchmarkResults(results);
	}
})();
