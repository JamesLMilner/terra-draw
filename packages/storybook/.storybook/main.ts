import dotenv from "dotenv";

dotenv.config({ quiet: true });

const config = {
	stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx|md|mdx)"],
	addons: ["@storybook/addon-vitest"],
	features: {
		interactions: false,
		actions: false,
		sidebarOnboardingChecklist: false,
	},
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
	core: {
		disableTelemetry: true,
	},
	viteFinal: async (config: any) => {
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
