import { StoryObj } from "@storybook/html";
import { TerraDraw } from "../../../terra-draw/src/terra-draw";

export type Story = StoryObj<StoryArgs>;

type Modes = ConstructorParameters<typeof TerraDraw>[0]["modes"];

// Interface for our story args
export interface StoryArgs {
	id: string;
	width: string;
	height: string;
	centerLat: number;
	centerLng: number;
	zoom: number;
	modes: Modes;
}

export const DefaultZoom = {
	zoom: 12,
};

export const DefaultSize = {
	width: "600px",
	height: "400px",
};

// The city of New York
const LocationNewYork = {
	centerLat: 40.7128,
	centerLng: -74.006,
};

// The city of San Francisco
const LocationSanFrancisco = {
	centerLat: 37.7749,
	centerLng: -122.4194,
};
// The city of Los Angeles
const LocationLosAngeles = {
	centerLat: 34.0522,
	centerLng: -118.2437,
};
// The city of London
const LocationLondon = {
	centerLat: 51.5074,
	centerLng: -0.1278,
};
// The city of Paris
const LocationParis = {
	centerLat: 48.8566,
	centerLng: 2.3522,
};
// The city of Berlin
const LocationBerlin = {
	centerLat: 52.52,
	centerLng: 13.405,
};
// The city of Tokyo
const LocationTokyo = {
	centerLat: 35.6762,
	centerLng: 139.6503,
};
// The city of Sydney
const LocationSydney = {
	centerLat: -33.8688,
	centerLng: 151.2093,
};
// The city of Cape Town
const LocationCapeTown = {
	centerLat: -33.9249,
	centerLng: 18.4241,
};
// The city of Rio de Janeiro
const LocationRioDeJaneiro = {
	centerLat: -22.9068,
	centerLng: -43.1729,
};

export {
	LocationSanFrancisco,
	LocationLosAngeles,
	LocationLondon,
	LocationParis,
	LocationBerlin,
	LocationTokyo,
	LocationSydney,
	LocationCapeTown,
	LocationRioDeJaneiro,
	LocationNewYork,
};
