console.log("===== Using ts-jest ======");

module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testPathIgnorePatterns: [
		"<rootDir>/node_modules/",
		"<rootDir>/e2e/",
		"<rootDir>/docs/",
		"<rootDir>/coverage/",
		"<rootDir>/scripts/",
		"<rootDir>/guides/",
	],
	coveragePathIgnorePatterns: ["<rootDir>/src/test/", "<rootDir>/e2e/"],
	setupFilesAfterEnv: ["<rootDir>/src/test/jest.matchers.ts"],
	collectCoverage: true,
	collectCoverageFrom: ["./src/**"],
	coverageThreshold: {
		global: {
			lines: 65,
		},
	},
};
