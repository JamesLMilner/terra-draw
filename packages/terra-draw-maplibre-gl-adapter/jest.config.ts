import config from "../../jest.config.ts";

export default {
	...config,
	testPathIgnorePatterns: ["<rootDir>/dist"],
	coveragePathIgnorePatterns: ["<rootDir>/src/test/", "<rootDir>/dist"],
	collectCoverageFrom: ["./src/**"],
};
