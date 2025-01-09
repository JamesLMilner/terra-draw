const noCheckConfig = require("../../jest.nocheck.config");

module.exports = {
	...noCheckConfig,
	testPathIgnorePatterns: ["<rootDir>/dist"],
	coveragePathIgnorePatterns: ["<rootDir>/src/test/", "<rootDir>/dist"],
	collectCoverageFrom: ["./src/**"],
};
