# Development

This file acts as a way to document how to develop the Terra Draw project locally. 

### Prerequisites

A few things you will need to have installed in order to develop on this project:

* git
* Node LTS - currently v16
* npm 8 

### Folder Structure


* `.github` - used for all GitHub related configuration such as the GitHub Actions work flows
* `.husky` - used to storing the precommit hooks that are used on the project
* `src` - source files for the project
* `dist` - the bundled distributed files of the project
* `docs` - the demo app that is published to GitHub pages
* `development` - the local development app that is used for developing locally (see below)
* `common` - code that is used across `development` and `docs` folder`

### Technologies Used

Terra Draw 

* [TypeScript](https://www.typescriptlang.org/) - provides strong compile time typing for JavaScript
* Jest - used for testing (see more information below)
* microbundle - used for the production bundle
* Webpack - used for bundling locally in development (`development` and `docs` folders)
* esno - for running tests quickly without type checking

### Precommit Hooks

It is probably useful to be aware of the precommit hooks you will face when trying to run a git commit on the project. There are two currently in use, namely:

* Uses pre-commit hook to run lint rules (eslint/prettier) on code before commit
* Uses pre-commit hook to ensure [conventional commit messages](https://www.conventionalcommits.org/en/v1.0.0/) are used 

### Testing

Terra Draw uses [jest](https://jestjs.io/) as it's testing framework. You can distinguish a test by it's `.spec.ts` prefix on the file name.  

To run the tests as they would run in CI:

```
npm run test
```

You can also check the coverage by running:


```
npm run test:coverage
```

For local development you may benefit from the `nocheck` option which allows you to avoid running TypeScript type checking when running the tests. This option also only checks files which are explicitly tested (i.e. have a spec file.)

```
npm run test:nocheck
npm run test:nocheck:coverage
```

### Developing Locally

A folder called `development` has been set up locally to allow you to test developing Terra Draw locally more easily. It allows you to run the different adapters and test different map providers in parallel, ensuring. You will need to update the .env file in the `development` folder in order to use the related adapters working. An example `.env` file in the `development` folder:


```
GOOGLE_API_KEY=YOUR_KEY_HERE
MAPBOX_ACCESS_TOKEN=YOUR_KEY_HERE
```

### GitHub Pages Example

We also provide a GitHub Pages example that can developed on in the `docs` folder. This automatically deploys from the `main` branch.