// eslint-disable-next-line no-console
console.log("===== Using ts-jest ======");

module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testPathIgnorePatterns: [
		"<rootDir>/node_modules/",
		"<rootDir>/packages/e2e/",
		"<rootDir>/packages/packages/",
		"<rootDir>/docs/",
		"<rootDir>/coverage/",
		"<rootDir>/scripts/",
		"<rootDir>/guides/",
	],
	coveragePathIgnorePatterns: [
		"<rootDir>/packages/.*/src/test",
		"<rootDir>/packages/e2e/",
		"<rootDir>/packages/development/",
	],
	collectCoverage: true,
	collectCoverageFrom: ["<rootDir>/packages/**/src/**"],
	coverageThreshold: {
		global: {
			lines: 80,
			functions: 80,
			branches: 80,
			statements: 80,
		},
	},
};
