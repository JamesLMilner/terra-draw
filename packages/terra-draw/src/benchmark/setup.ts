import { FeatureId } from "../extend";
import {
	GeoJSONStoreFeatures,
	TerraDraw,
	TerraDrawPointMode,
	TerraDrawPolygonMode,
	TerraDrawSelectMode,
} from "../terra-draw";
import { TerraDrawTestAdapter } from "../test/test-adapter";
import { uuid4 } from "../util/id";
import { Bench } from "tinybench";

import fs from "fs";

type BenchmarkResult = {
	name: string;
	opsPerSecond: number;
	averageTimeMs: number;
};

export const createPointFeatures = (n: number) =>
	new Array(n).fill({}).map((_, i) => ({
		id: uuid4(),
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates: [Math.min(i, 180), Math.min(i, 90)],
		},
		properties: {
			mode: "point",
		},
	})) as GeoJSONStoreFeatures[];

export const createDraw = () => {
	const draw = new TerraDraw({
		adapter: new TerraDrawTestAdapter({ lib: {} }),
		modes: [
			new TerraDrawPointMode(),
			new TerraDrawPolygonMode(),
			new TerraDrawSelectMode(),
		],
	});

	return draw;
};

type BenchmarkProps = {
	draw: TerraDraw;
	features: GeoJSONStoreFeatures[];
	featureIds: FeatureId[];
	randomFeatureId: FeatureId;
};

export type BenchmarkTask = {
	name: string;
	beforeEach: (benchmarkProps: BenchmarkProps) => void;
	task: (benchmarkProps: BenchmarkProps) => void;
	featureCount?: number;
	loopCount?: number;
	enabled?: boolean;
};

export const createBenchmark = (
	benmarkName: string,
	tasks: BenchmarkTask[],
) => {
	const bench = new Bench({ name: benmarkName });

	tasks.forEach(
		({ name, beforeEach, task, enabled, featureCount, loopCount }) => {
			const features = createPointFeatures(featureCount || 100);
			const featureIds = features.map((feature) => feature.id as FeatureId);

			const benchmarkProps: BenchmarkProps = {
				draw: createDraw(),
				features,
				featureIds,
				randomFeatureId:
					featureIds[Math.floor(Math.random() * featureIds.length)],
			};

			const isEnabled = enabled === false ? false : true;

			const finalTask =
				loopCount && loopCount > 1
					? (props: BenchmarkProps) => {
							for (let i = 0; i < loopCount; i++) {
								task(props);
							}
						}
					: task;

			isEnabled &&
				bench.add(
					loopCount ? `${name} (x${loopCount})` : name,
					() => {
						finalTask(benchmarkProps);
					},
					{
						beforeEach: () => {
							benchmarkProps.randomFeatureId =
								featureIds[Math.floor(Math.random() * featureIds.length)];
							beforeEach(benchmarkProps);
						},
					},
				);
		},
	);

	return bench;
};

export const processBenchmarks = (
	bench: Bench,
	benchmarkTasks: BenchmarkTask[],
): BenchmarkResult[] => {
	const results = bench.results.map((result, i) => {
		return {
			name: benchmarkTasks[i].name,
			opsPerSecond: parseInt(
				(benchmarkTasks[i].loopCount
					? result!.throughput!.mean * benchmarkTasks[i].loopCount
					: result!.throughput!.mean
				).toFixed(0),
			),
			averageTimeMs: parseFloat(
				(benchmarkTasks[i].loopCount
					? result!.latency!.mean / benchmarkTasks[i].loopCount
					: result!.latency!.mean
				).toFixed(8),
			),
		};
	});

	return results;
};

export function writeBenchmarkSummary(results: BenchmarkResult[]) {
	let markdown = `## ⚡ Benchmark Results\n\n`;
	markdown += `|  Method | Ops/sec | Avg time (ms) |\n`;
	markdown += `|---------|---------|---------------|\n`;

	for (const r of results) {
		markdown += `| \`${r.name}\` | ${r.opsPerSecond.toLocaleString()} | ${r.averageTimeMs} |\n`;
	}

	fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY!, markdown);
}

export const logBenchmarkResults = (
	results: { name: string; opsPerSecond: number; averageTimeMs: number }[],
) => {
	// eslint-disable-next-line no-console
	console.table(
		results.sort(
			(resultOne, resultTwo) => resultOne.opsPerSecond - resultTwo.opsPerSecond,
		),
	);
};
