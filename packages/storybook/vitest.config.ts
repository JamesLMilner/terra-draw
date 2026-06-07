import { defineConfig } from "vitest/config";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

import { playwright } from "@vitest/browser-playwright";

const shouldRunStorybookSubset = process.env.STORYBOOK_TEST_SUBSET === "true";

const excludedStorybookTags = shouldRunStorybookSubset
	? ["mapbox", "googlemaps"]
	: [];

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
					storybookTest({
						configDir: ".storybook",
						tags: {
							exclude: excludedStorybookTags,
						},
					}),
				],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: "chromium" }],
					},
				},
				server: {
					port: 63315,
				},
			},
		],
	},
});
