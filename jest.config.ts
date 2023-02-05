
let options = {}

if (process.env.NO_CHECK) {
    options = {
        "transform": {
            "^.+\\.(t|j)sx?$": "@swc/jest"
        },
        "setupFilesAfterEnv": ["<rootDir>/src/test/jest.matchers.ts"],

    }
} else {
    options = {
        "preset": "ts-jest",
        "testEnvironment": "node",
        "coveragePathIgnorePatterns": ["<rootDir>/src/test/"],
        "setupFilesAfterEnv": ["<rootDir>/src/test/jest.matchers.ts"],
        "collectCoverage": true,
        "collectCoverageFrom": ["./src/**"],
        "coverageThreshold": {
            "global": {
                "lines": 65
            }
        },

    }
}

module.exports = options