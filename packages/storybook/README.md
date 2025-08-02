# Terra Draw Storybook

**Storybook.js** is an open-source tool traditionally used for building UI components and pages in isolation. It streamlines the process of developing, testing, and documenting components by allowing developers to create "stories" — individual states of a component — outside of the main application.

We use Storybook because it allows for easy give many different Terra Draw functionality in isolation. Because Terra Draw is very configurable, Storybook lends itself to developing locally and also showing examples across different mapping libraries.

## Development

### Environment Variables

You can set environment variables, you can use a `.env` file. At the moment there are two environment variables, one for Google Maps and one for Mapbox. Your .env file would probably look something like this

```shell
GOOGLE_API_KEY=your-google-key-here
MAPBOX_ACCESS_TOKEN=your-mapbox-key-here
```

### Scripts

To run Storybook in development mode via the following command:

```shell
npm run storybook
```

You can run a build of Storybook like so:

```shell
npm run storybook:build
```

