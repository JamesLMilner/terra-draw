const config = require("../../jest.config");

module.exports = {
	...config,
	testPathIgnorePatterns: ["<rootDir>/dist"],
	coveragePathIgnorePatterns: ["<rootDir>/src/test/", "<rootDir>/dist"],
	collectCoverageFrom: ["./src/**"],
};
