import noCheckConfig from "../../jest.nocheck.config.ts";

export default {
	...noCheckConfig,
	testPathIgnorePatterns: ["<rootDir>/dist"],
	coveragePathIgnorePatterns: ["<rootDir>/src/test/", "<rootDir>/dist"],
	collectCoverageFrom: ["./src/**"],
};
