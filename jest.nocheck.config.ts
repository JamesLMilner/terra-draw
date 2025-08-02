// eslint-disable-next-line no-console
console.log("===== Using @swc/jest ======");

module.exports = {
	transform: {
		"^.+\\.(t|j)sx?$": "@swc/jest",
	},
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
		"<rootDir>/packages/storybook/",
	],
};
