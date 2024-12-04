import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintPluginPrettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
	{
		name: "prettier", // Configuration name
		files: ["**/*.{js,jsx,ts,tsx,json,md,yml,yaml,html,css}"],
		plugins: {
			prettier: eslintPluginPrettier, // Include Prettier plugin
		},
		rules: {
			...prettierConfig.rules, // Disable ESLint rules that conflict with Prettier
		},
	},
	{
		name: "typescript", // Configuration name
		files: ["**/*.ts"], // TypeScript-specific configuration
		plugins: {
			"@typescript-eslint": typescriptEslint, // Include TypeScript ESLint plugin
		},
		languageOptions: {
			parser: tsParser,
		},
		rules: {
			"@typescript-eslint/no-empty-function": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
		},
	},
];
