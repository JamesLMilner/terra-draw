// List of all of the packages that will want to create a changelog for
const packages = [
	"terra-draw",
	"terra-draw-arcgis-adapter",
	"terra-draw-google-maps-adapter",
	"terra-draw-leaflet-adapter",
	"terra-draw-mapbox-gl-adapter",
	"terra-draw-maplibre-gl-adapter",
	"terra-draw-openlayers-adapter",
];

// The list of the types of commits that will be used to generate the changelog
// See: https://github.com/conventional-changelog/conventional-changelog-config-spec/blob/master/versions/2.2.0/README.md#types
const types = [];

// For each package, add the types of commits that will be used to generate the changelog
packages.forEach((packageName) => {
	types.push(
		{
			type: "feat",
			section: "Features",
			scope: packageName,
		},
		{
			type: "fix",
			section: "Bug Fixes",
			scope: packageName,
		},
		{
			type: "docs",
			section: "Documentation",
			scope: packageName,
		},
		{
			type: "style",
			section: "Styling",
			scope: packageName,
		},
		{
			type: "refactor",
			section: "Refactors",
			scope: packageName,
		},
		{
			type: "perf",
			section: "Performance",
			scope: packageName,
		},
		{
			type: "test",
			section: "Tests",
			scope: packageName,
		},
		{
			type: "build",
			section: "Build System",
			scope: packageName,
		},
		{
			type: "ci",
			section: "CI",
			scope: packageName,
		},
		{
			type: "chore",
			section: "Chore",
			scope: packageName,
		},
		{
			type: "revert",
			section: "Reverts",
			scope: packageName,
		},
	);
});

export default { types };
