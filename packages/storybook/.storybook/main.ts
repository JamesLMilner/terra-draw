import dotenv from "dotenv";
// import { mergeConfig, defineConfig } from 'vite';

dotenv.config();

const config = {
	stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@storybook/addon-links",
		"@storybook/addon-essentials",
		"@storybook/addon-interactions",
	],
	framework: {
		name: "@storybook/html-vite",
		options: {},
	},
	docs: {
		autodocs: "tag",
	},
	typescript: {
		reactDocgen: false,
	},
	viteFinal: async (config) => {
		return {
			...config,
			define: {
				"import.meta.env.MAPBOX_ACCESS_TOKEN": JSON.stringify(
					process.env.MAPBOX_ACCESS_TOKEN,
				),
				"import.meta.env.GOOGLE_API_KEY": JSON.stringify(
					process.env.GOOGLE_API_KEY,
				),
			},
		};
	},
};

export default config;
