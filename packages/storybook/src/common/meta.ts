import { Meta } from "@storybook/html";
import { StoryArgs } from "./config";

export const DefaultMeta = {
	title: `Terra Draw`,
	argTypes: {
		id: {
			table: { disable: true },
		},
		width: {
			control: { type: "text" },
			description: "Width of the map container",
		},
		height: {
			control: { type: "text" },
			description: "Height of the map container",
		},
		centerLat: {
			control: { type: "number", min: -90, max: 90, step: 0.1 },
			description: "Center latitude for the map",
		},
		centerLng: {
			control: { type: "number", min: -180, max: 180, step: 0.1 },
			description: "Center longitude for the map",
		},
		zoom: {
			control: { type: "number", min: 1, max: 18, step: 1 },
			description: "Initial zoom level",
		},
		modes: {
			table: { disable: true },
		},
	},
	parameters: {
		docs: {
			description: {
				story: `Examples of how to use Terra Draw.`,
			},
		},
	},
} satisfies Meta<StoryArgs>;
