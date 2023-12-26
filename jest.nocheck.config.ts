console.log("===== Using @swc/jest ======");

module.exports = {
	transform: {
		"^.+\\.(t|j)sx?$": "@swc/jest",
	},
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
};
