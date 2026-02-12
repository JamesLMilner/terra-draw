/* eslint-disable no-console */

const CoverageThreshold = process.env.COVERAGE_THRESHOLD !== "false";

console.log("Loading Jest configuration...");
console.log("Using ts-jest");
console.log(
	`Coverage threshold is ${CoverageThreshold ? "enabled" : "disabled"}\n`,
);

module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testPathIgnorePatterns: [
		"<rootDir>/packages/.*/dist/",
		"<rootDir>/node_modules/",
		"<rootDir>/packages/e2e/",
		"<rootDir>/packages/packages/",
		"<rootDir>/docs/",
		"<rootDir>/coverage/",
		"<rootDir>/scripts/",
		"<rootDir>/guides/",
	],
	coveragePathIgnorePatterns: [
		"<rootDir>/packages/terra-draw/src/benchmark/",
		"<rootDir>/packages/terra-draw/src/benchmark.ts",
		"<rootDir>/packages/.*/dist/",
		"<rootDir>/packages/.*/src/test",
		"<rootDir>/packages/e2e/",
		"<rootDir>/packages/storybook/",
	],
	collectCoverage: true,
	collectCoverageFrom: ["<rootDir>/packages/**/src/**"],
	coverageThreshold: CoverageThreshold
		? {
				global: {
					lines: 80,
					functions: 80,
					branches: 80,
					statements: 80,
				},
			}
		: undefined,
};
