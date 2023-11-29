# Development

This file acts as a way to document how to develop the Terra Draw project locally.

### Prerequisites

A few things you will need to have installed in order to develop on this project:

- git
- Node LTS - currently v18
- npm 9

### Folder Structure

- `.github` - used for all GitHub related configuration such as the GitHub Actions work flows
- `.husky` - used to storing the precommit hooks that are used on the project
- `src` - source files for the project
- `dist` - the bundled distributed files of the project
- `docs` - the demo app that is published to GitHub pages
- `development` - the local development app that is used for developing locally (see below)
- `common` - code that is used across `development` and `docs` folder

### Technologies Used

Terra Draw

- [TypeScript](https://www.typescriptlang.org/) - provides strong compile time typing for JavaScript
- Jest - used for testing (see more information below)
- microbundle - used for the production bundle
- Webpack - used for bundling locally in development (`development` and `docs` folders)
- esno - for running tests quickly without type checking

### Precommit Hooks

It is probably useful to be aware of the precommit hooks you will face when trying to run a git commit on the project. There are two currently in use, namely:

- Uses pre-commit hook to run lint rules (eslint/prettier) on code before commit
- Uses pre-commit hook to ensure [conventional commit messages](https://www.conventionalcommits.org/en/v1.0.0/) are used

### Testing

Terra Draw uses [jest](https://jestjs.io/) as it's testing framework. You can distinguish a test by it's `.spec.ts` prefix on the file name.

To run the tests as they would run in CI:

```shell
npm run test
```

You can also check the coverage by running:

```shell
npm run test:coverage
```

For local development you may benefit from the `nocheck` option which allows you to avoid running TypeScript type checking when running the tests. This option also only checks files which are explicitly tested (i.e. have a spec file.)

```shell
npm run test:nocheck
npm run test:nocheck:coverage
```

### Developing Locally

A folder called `development` has been set up locally to allow you to test developing Terra Draw locally more easily. It allows you to run the different adapters and test different map providers in parallel, ensuring. You will need to update the .env file in the `development` folder in order to use the related adapters working. An example `.env` file in the `development` folder:

```
GOOGLE_API_KEY=YOUR_KEY_HERE
MAPBOX_ACCESS_TOKEN=YOUR_KEY_HERE
```

## Terra Draw Concepts

Terra Draw has a few elementary concepts that allow it to stay strongly decoupled and relatively map library agnostic. Lets walk through them:

- **Store**: - at the heart of the library, where geometry data is stored, created, updated and deleted. Data is stored as standard GeoJSON.
- **Adapters**: thin wrappers that contain map library specific logic, for creating and updating layers that can rendered by the mapping library
- **Modes**: - modes represent the logic for a specific drawing tool, for example the point, line and polygon modes

### Adapters Explained

Adapters are a core aspect of Terra Draw - they are the layer between the core of the library and the external mapping libraries (Leaflet, Google Maps etc). In simple terms an adapter takes input events, passes them through to create geometries in the store and then passes them back to the adapter to be rendered specifically for the mapping library.

For example, in the `LeafletAdapter` we create and update a GeoJSON layer that Leaflet knows how to render to the screen. In theory an adapter could be created for any mapping library that can fill out the Adapter abstract class (TerraDrawBaseAdapter). Namely these are methods that would need to be completed:

```typescript
	public project(...args: Parameters<Project>): ReturnType<Project>;

	public unproject(
		...args: Parameters<Unproject>
	): ReturnType<Unproject>;

	public setCursor(
		...args: Parameters<SetCursor>
	): ReturnType<SetCursor>;

	public getLngLatFromEvent(event: PointerEvent | MouseEvent): {
		lng: number;
		lat: number;
	} | null;

	public setDraggability(enabled: boolean): void;

	public setDoubleClickToZoom(enabled: boolean): void;

	public getMapEventElement(): HTMLElement;

	public render(
		changes: TerraDrawChanges,
		styling: TerraDrawStylingFunction
	): void;
```

### Modes Explained

Modes are another important concept in Terra Draw. Modes are a way to encapsulate specific logic for drawing a certain entity. For example, there are built in modes for drawing points, lines, polygons, circles and rectangles.

Modes can go beyond just drawing however, for example the built in `TerraDrawSelectMode` allows for selection and editing of geometries that have previously been drawn. `TerraDrawRenderMode` is a 'view only mode' and useful for showing non-editable data alongside editable data in your application.

Assuming that a mode extends from `TerraDrawBaseMode`

```typescript
	/** @internal */
	start() {
		this.setStarted();

	}

	/** @internal */
	stop() {
		this.setStopped();
	}

	/** @internal */
	onClick(event: TerraDrawMouseEvent) {}

	/** @internal */
	onMouseMove(event: TerraDrawMouseEvent) {}

	/** @internal */
	onKeyDown(event: TerraDrawKeyboardEvent) {}

	/** @internal */
	onKeyUp(event: TerraDrawKeyboardEvent) {}


	/** @internal */
	onDragStart(event: TerraDrawMouseEvent) {}

	/** @internal */
	onDrag(event: TerraDrawMouseEvent) {}

	/** @internal */
	onDragEnd(event: TerraDrawMouseEvent) {}

	/** @internal */
	styleFeature(feature: GeoJSONStoreFeatures): TerraDrawAdapterStyling {}
```
